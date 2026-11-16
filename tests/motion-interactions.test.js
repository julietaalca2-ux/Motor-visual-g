import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVisualEngine,
  createMotionController,
  createInteractionController,
  MOTION_PRESETS,
  SPRING_PRESETS,
  createSpringKeyframes,
  motionDuration,
  parseDurationMs
} from '../src/index.js';
import { createEventBus } from '../src/core/events.js';

function createEventTargetMock(tagName = 'DIV') {
  const attrs = new Map();
  const styles = new Map();
  const listeners = new Map();
  const children = [];

  const el = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    parentNode: null,
    children,
    __listeners: listeners,
    style: {
      setProperty(k, v) { styles.set(k, String(v)); },
      getPropertyValue(k) { return styles.get(k) ?? ''; },
      removeProperty(k) { styles.delete(k); }
    },
    setAttribute(k, v) { attrs.set(k, String(v)); },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    hasAttribute(k) { return attrs.has(k); },
    removeAttribute(k) { attrs.delete(k); },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent(event) {
      const payload = {
        target: el,
        preventDefault() { payload.defaultPrevented = true; },
        stopPropagation() { payload.propagationStopped = true; },
        ...event
      };
      let current = el;
      while (current) {
        for (const fn of [...(current._listeners?.get(event.type) ?? current.__listeners?.get(event.type) ?? [])]) {
          fn(payload);
        }
        if (payload.propagationStopped) break;
        current = current.parentNode;
      }
      return payload;
    },
    appendChild(child) {
      child.parentNode = el;
      children.push(child);
      return child;
    },
    contains(other) {
      if (other === el) return true;
      return children.some(c => c.contains?.(other));
    },
    closest(selector) {
      const attrMatch = selector.match(/^\[([^=\]]+)\]$/);
      if (attrMatch) {
        let cur = el;
        while (cur) {
          if (cur.hasAttribute?.(attrMatch[1])) return cur;
          cur = cur.parentNode;
        }
      }
      return null;
    }
  };
  return el;
}

test('motion utilities parse durations and honor reduced motion', () => {
  assert.equal(parseDurationMs('240ms'), 240);
  assert.equal(parseDurationMs('0.35s'), 350);
  assert.equal(parseDurationMs(180), 180);
  assert.equal(motionDuration(250, { respectReducedMotion: false }), 250);

  const prevMatchMedia = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  try {
    assert.equal(motionDuration(250), 0);
  } finally {
    globalThis.matchMedia = prevMatchMedia;
  }
});

test('motion controller executes presets, custom presets, stagger, and cancellation', async () => {
  const bus = createEventBus();
  const eventsLog = [];
  bus.onAny((name) => eventsLog.push(name));

  const motion = createMotionController({
    events: bus,
    getConfig: () => ({ respectReducedMotion: false })
  });

  for (const name of Object.keys(MOTION_PRESETS)) {
    assert.ok(motion.getPreset(name));
  }

  motion.registerPreset('pop-in', {
    keyframes: [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'scale(1)' }],
    duration: 15,
    fill: 'both'
  });

  const target = createEventTargetMock('DIV');
  const handle = motion.animate(target, 'pop-in');
  assert.equal(motion.getActiveCount(), 1);
  const res = await handle.finished;
  assert.equal(res.reason, 'finish');
  assert.equal(target.style.opacity, '1');
  assert.equal(target.style.transform, 'scale(1)');
  assert.equal(motion.getActiveCount(), 0);

  const items = [createEventTargetMock('SPAN'), createEventTargetMock('SPAN')];
  const group = motion.stagger(items, 'fade-in', { duration: 10, staggerMs: 5 });
  await group.finished;
  assert.equal(items[0].style.opacity, '1');
  assert.equal(items[1].style.opacity, '1');
  assert.ok(eventsLog.includes('motion:start'));
  assert.ok(eventsLog.includes('motion:finish'));
});

test('interaction controller handles onAction, bindShortcuts, trackPress, and bindGesture', () => {
  const bus = createEventBus();
  const interactions = createInteractionController({ events: bus });

  // 1. Declarative data-ogve-action
  const root = createEventTargetMock('DIV');
  const btn = createEventTargetMock('BUTTON');
  btn.setAttribute('data-ogve-action', 'save-item');
  btn.setAttribute('data-ogve-payload', '{"id":42}');
  root.appendChild(btn);

  let receivedAction = null;
  const unbindAction = interactions.onAction(root, {
    'save-item': (ctx) => { receivedAction = ctx; }
  });

  btn.dispatchEvent({ type: 'click', target: btn });
  assert.equal(receivedAction.action, 'save-item');
  assert.deepEqual(receivedAction.payload, { id: 42 });
  unbindAction();

  // 2. Keyboard shortcuts
  const docTarget = createEventTargetMock('DOCUMENT');
  let shortcutTriggered = 0;
  const unbindShortcut = interactions.bindShortcuts(docTarget, {
    'Mod+K': () => { shortcutTriggered += 1; }
  });

  docTarget.dispatchEvent({ type: 'keydown', key: 'k', ctrlKey: true, target: docTarget });
  assert.equal(shortcutTriggered, 1);
  unbindShortcut();

  // 3. Track press feedback
  const pressBtn = createEventTargetMock('BUTTON');
  let pressCount = 0;
  interactions.trackPress(pressBtn, {
    onPress: () => { pressCount += 1; }
  });
  pressBtn.dispatchEvent({ type: 'pointerdown', button: 0 });
  assert.equal(pressBtn.getAttribute('data-ogve-pressed'), 'true');
  pressBtn.dispatchEvent({ type: 'pointerup', button: 0 });
  assert.equal(pressBtn.getAttribute('data-ogve-pressed'), null);
  assert.equal(pressCount, 1);

  // 4. Swipe & tap gestures
  const pad = createEventTargetMock('DIV');
  let swipeDir = null;
  let tapCount = 0;
  interactions.bindGesture(pad, {
    onSwipeLeft: () => { swipeDir = 'left'; },
    onTap: () => { tapCount += 1; }
  }, { swipeThreshold: 30 });

  pad.dispatchEvent({ type: 'pointerdown', pointerId: 1, button: 0, clientX: 120, clientY: 50 });
  pad.dispatchEvent({ type: 'pointerup', pointerId: 1, button: 0, clientX: 40, clientY: 52 });
  assert.equal(swipeDir, 'left');

  pad.dispatchEvent({ type: 'pointerdown', pointerId: 2, button: 0, clientX: 60, clientY: 60 });
  pad.dispatchEvent({ type: 'pointerup', pointerId: 2, button: 0, clientX: 62, clientY: 61 });
  assert.equal(tapCount, 1);

  assert.equal(interactions.destroyAll(), 2);
  assert.equal(interactions.getActiveBindingsCount(), 0);
});

test('createVisualEngine integrates motion and interactions across lifecycle', async () => {
  const engine = createVisualEngine({
    theme: 'light',
    observeSystemTheme: false,
    syncMetaThemeColor: false,
    respectReducedMotion: false
  }).start();

  assert.equal(engine.version, '0.6.0');
  const box = createEventTargetMock('DIV');
  await engine.animate(box, 'slide-up', { duration: 10 }).finished;
  assert.equal(box.style.opacity, '1');

  const root = createEventTargetMock('DIV');
  const trigger = createEventTargetMock('BUTTON');
  trigger.setAttribute('data-ogve-action', 'ping');
  root.appendChild(trigger);

  let pinged = false;
  engine.onAction(root, { ping: () => { pinged = true; } });
  trigger.dispatchEvent({ type: 'click', target: trigger });
  assert.equal(pinged, true);

  const snapshot = engine.inspect();
  assert.equal(snapshot.interactions.activeBindings, 1);
  assert.ok(snapshot.motion.presets.includes('slide-up'));

  engine.destroy();
  assert.equal(engine.inspect().interactions.activeBindings, 0);
});


test('spring physics generates stable keyframes and engine exposes spring + sequence', async () => {
  const frames = createSpringKeyframes(
    { opacity: 0, transform: 'translateY(16px)' },
    { opacity: 1, transform: 'translateY(0px)' },
    { preset: 'snappy' }
  );
  assert.ok(frames.length > 2);
  assert.equal(frames[0].opacity, '0');
  assert.equal(frames.at(-1).opacity, '1');
  assert.equal(frames.at(-1).transform, 'translateY(0px)');
  assert.deepEqual(Object.keys(SPRING_PRESETS).sort(), ['bouncy', 'gentle', 'snappy', 'standard']);
  assert.throws(() => createSpringKeyframes({}, {}, { preset: 'unknown' }), /Unknown spring preset/);

  const engine = createVisualEngine({ respectReducedMotion: false }).start();
  const target = createEventTargetMock('DIV');
  const springHandle = engine.spring(target, { opacity: 0 }, { opacity: 1 }, { preset: 'snappy', duration: 10 });
  const springResult = await springHandle.finished;
  assert.equal(springResult.reason, 'finish');
  assert.equal(target.style.opacity, '1');

  const sequenceHandle = engine.sequence(target, [
    { motion: 'fade-in', options: { duration: 5 } },
    { motion: 'pulse', options: { duration: 5 } }
  ]);
  const sequenceResults = await sequenceHandle.finished;
  assert.equal(sequenceResults.length, 2);
  assert.ok(sequenceResults.every(result => result.reason === 'finish'));
  assert.ok(engine.getMotionPresets().includes('reaction-pop'));
  assert.ok(engine.getMotionPresets().includes('post-enter'));
  engine.destroy();
});
