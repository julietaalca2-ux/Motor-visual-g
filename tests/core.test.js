import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/core/events.js';
import { createComponentRegistry } from '../src/components/registry.js';
import { designTokens } from '../src/design-system/tokens.js';

test('event bus sends details and unsubscribes', () => {
  const bus = createEventBus();
  let received;
  const off = bus.on('sample', value => { received = value; });
  bus.emit('sample', 42);
  assert.equal(received, 42);
  off();
  bus.emit('sample', 7);
  assert.equal(received, 42);
});

test('component registry registers and creates components', () => {
  const registry = createComponentRegistry();
  registry.register('hello-card', props => ({ greeting: `Hola ${props.name}` }));
  assert.deepEqual(registry.create('hello-card', { name: 'ÖG' }), { greeting: 'Hola ÖG' });
});

test('design tokens include light and dark palettes', () => {
  assert.ok(designTokens.color.light.background);
  assert.ok(designTokens.color.dark.background);
});
