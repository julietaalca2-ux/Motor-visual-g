import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVisualEngine,
  DEFAULT_CONFIG,
  resolveConfig,
  validateConfig,
  createConfigStore,
  createEventBus,
  createLifecycleManager,
  LIFECYCLE_STATES,
  createModuleRegistry,
  designTokens
} from '../src/index.js';
import { createComponentRegistry } from '../src/components/registry.js';

// --- 1. Configuration tests ---
test('config resolves defaults, validates types, and updates reactively', () => {
  const cfg = resolveConfig({ theme: 'dark', debug: true });
  assert.equal(cfg.theme, 'dark');
  assert.equal(cfg.debug, true);
  assert.equal(cfg.attribute, DEFAULT_CONFIG.attribute);

  assert.throws(() => validateConfig({ theme: 'Neon Theme' }), TypeError);
  assert.throws(() => validateConfig({ maxListeners: 0 }), RangeError);
  assert.throws(() => validateConfig({ debug: 'yes' }), TypeError);

  const bus = createEventBus();
  const changes = [];
  bus.on('configchange', payload => changes.push(payload));

  const store = createConfigStore({ theme: 'light' }, { events: bus });
  assert.equal(store.get('theme'), 'light');

  const res = store.set({ theme: 'dark', debug: true });
  assert.deepEqual(res.changedKeys, ['theme', 'debug']);
  assert.equal(store.get('theme'), 'dark');
  assert.equal(changes.length, 1);

  store.reset();
  assert.equal(store.get('theme'), 'light');
  assert.equal(store.get('debug'), false);
});

// --- 2. Event Bus tests ---
test('event bus handles on, once, off, onAny, emitAsync, and error isolation', async () => {
  const bus = createEventBus({ onError: () => {} });
  const log = [];

  const off = bus.on('sample', value => { log.push(`on:${value}`); });
  bus.once('sample', value => { log.push(`once:${value}`); });
  bus.on('sample', () => { throw new Error('listener failure'); });
  bus.on('sample', value => { log.push(`afterError:${value}`); });

  const observed = [];
  const offAny = bus.onAny((name, detail) => observed.push({ name, detail }));

  bus.emit('sample', 42);
  assert.deepEqual(log, ['on:42', 'once:42', 'afterError:42']);
  assert.equal(observed.length, 1);
  assert.deepEqual(observed[0], { name: 'sample', detail: 42 });

  bus.emit('sample', 7);
  assert.deepEqual(log, ['on:42', 'once:42', 'afterError:42', 'on:7', 'afterError:7']);

  off();
  offAny();
  assert.equal(bus.listenerCount('sample'), 2);

  bus.clear('sample');
  assert.equal(bus.listenerCount('sample'), 0);

  bus.on('async-job', async (n) => n * 2);
  const outcomes = await bus.emitAsync('async-job', 21);
  assert.equal(outcomes[0].status, 'fulfilled');
  assert.equal(outcomes[0].value, 42);
});

// --- 3. Lifecycle Manager tests ---
test('lifecycle manager enforces state transitions and hook execution order', () => {
  const bus = createEventBus();
  const trace = [];
  const lifecycle = createLifecycleManager({ events: bus });

  assert.equal(lifecycle.getState(), LIFECYCLE_STATES.IDLE);
  assert.throws(() => lifecycle.pause(), /Cannot pause/);

  lifecycle.onHook('beforeStart', () => trace.push('beforeStart'));
  lifecycle.onHook('start', () => trace.push('start:1'));
  lifecycle.onHook('start', () => trace.push('start:2'));
  lifecycle.onHook('ready', () => trace.push('ready'));
  lifecycle.onHook('pause', () => trace.push('pause'));
  lifecycle.onHook('resume', () => trace.push('resume'));
  lifecycle.onHook('destroy', () => trace.push('destroy:1'));
  lifecycle.onHook('destroy', () => trace.push('destroy:2'));

  assert.equal(lifecycle.start(), true);
  assert.equal(lifecycle.getState(), LIFECYCLE_STATES.READY);
  assert.equal(lifecycle.isReady(), true);

  // Idempotent start when already ready
  assert.equal(lifecycle.start(), false);

  lifecycle.pause();
  assert.equal(lifecycle.getState(), LIFECYCLE_STATES.PAUSED);

  lifecycle.resume();
  assert.equal(lifecycle.getState(), LIFECYCLE_STATES.READY);

  lifecycle.destroy();
  assert.equal(lifecycle.getState(), LIFECYCLE_STATES.DESTROYED);

  // Teardown hooks execute in LIFO order
  assert.deepEqual(trace, [
    'beforeStart',
    'start:1',
    'start:2',
    'ready',
    'pause',
    'resume',
    'destroy:2',
    'destroy:1'
  ]);
});

// --- 4. Module Registry tests ---
test('module registry resolves dependencies topologically and detects cycles', () => {
  const order = [];
  const registry = createModuleRegistry();

  registry.register({
    name: 'ui-layer',
    dependencies: ['base-tokens'],
    init() { order.push('init:ui-layer'); },
    start() { order.push('start:ui-layer'); },
    destroy() { order.push('destroy:ui-layer'); },
    api: { ready: true }
  });

  registry.register({
    name: 'base-tokens',
    init() { order.push('init:base-tokens'); },
    start() { order.push('start:base-tokens'); },
    destroy() { order.push('destroy:base-tokens'); }
  });

  registry.initAll();
  registry.startAll();
  assert.deepEqual(order, [
    'init:base-tokens',
    'init:ui-layer',
    'start:base-tokens',
    'start:ui-layer'
  ]);

  assert.equal(registry.get('ui-layer').ready, true);
  assert.throws(() => registry.unregister('base-tokens'), /required by: ui-layer/);

  registry.destroyAll();
  assert.deepEqual(order.slice(-2), ['destroy:ui-layer', 'destroy:base-tokens']);

  // Cycle detection
  const cyclic = createModuleRegistry();
  cyclic.register({ name: 'mod-a', dependencies: ['mod-b'] });
  cyclic.register({ name: 'mod-b', dependencies: ['mod-a'] });
  assert.throws(() => cyclic.initAll(), /Circular module dependency/);
});

// --- 5. Integrated Core Engine Public API tests ---
test('createVisualEngine integrates lifecycle, config, events, modules, and backwards-compatible API', () => {
  const engine = createVisualEngine({ theme: 'dark' });
  assert.equal(engine.version, '0.6.0');
  assert.equal(engine.getState(), 'idle');

  const eventsSeen = [];
  engine.on('ready', () => eventsSeen.push('ready'));
  engine.on('themechange', (t) => eventsSeen.push(`theme:${t.theme}`));

  engine.use({
    name: 'analytics-probe',
    dependencies: ['theme', 'components'],
    api: (ctx) => ({
      ping: () => `ok:${ctx.config.theme}`
    })
  });

  engine.start();
  assert.equal(engine.isReady(), true);
  assert.equal(engine.getTheme().theme, 'dark');
  assert.equal(engine.getModule('analytics-probe').ping(), 'ok:dark');

  engine.registerComponent('hello-card', props => ({ greeting: `Hola ${props.name}` }));
  assert.deepEqual(engine.createComponent('hello-card', { name: 'ÖG' }), { greeting: 'Hola ÖG' });

  engine.configure({ theme: 'light' });
  assert.equal(engine.getTheme().theme, 'light');

  const snapshot = engine.inspect();
  assert.equal(snapshot.state, 'ready');
  assert.ok(snapshot.modules.some(m => m.name === 'analytics-probe'));
  assert.ok(snapshot.components.includes('hello-card'));

  engine.pause();
  assert.equal(engine.getState(), 'paused');
  engine.resume();
  assert.equal(engine.getState(), 'ready');

  engine.destroy();
  assert.equal(engine.getState(), 'destroyed');
  assert.ok(eventsSeen.includes('ready'));
  assert.ok(eventsSeen.includes('theme:dark'));
  assert.ok(eventsSeen.includes('theme:light'));
});

test('standalone component registry and design tokens remain intact', () => {
  const registry = createComponentRegistry();
  registry.register('hello-card', props => ({ greeting: `Hola ${props.name}` }));
  assert.deepEqual(registry.create('hello-card', { name: 'ÖG' }), { greeting: 'Hola ÖG' });
  assert.ok(designTokens.color.light.background);
  assert.ok(designTokens.color.dark.background);
});
