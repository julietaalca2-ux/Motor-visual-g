import { delegate } from './delegation.js';

function normalizeShortcutCombo(combo) {
  const parts = String(combo)
    .split('+')
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);

  const spec = {
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    mod: false,
    key: ''
  };

  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') spec.ctrl = true;
    else if (part === 'meta' || part === 'cmd' || part === 'command') spec.meta = true;
    else if (part === 'alt' || part === 'option') spec.alt = true;
    else if (part === 'shift') spec.shift = true;
    else if (part === 'mod') spec.mod = true;
    else if (part === 'esc') spec.key = 'escape';
    else if (part === 'space') spec.key = ' ';
    else spec.key = part;
  }

  return spec;
}

function matchesShortcut(event, spec) {
  const eventKey = String(event.key ?? '').toLowerCase();
  if (!spec.key || eventKey !== spec.key) return false;

  if (spec.mod) {
    if (!(event.ctrlKey || event.metaKey)) return false;
  } else {
    if (Boolean(event.ctrlKey) !== spec.ctrl) return false;
    if (Boolean(event.metaKey) !== spec.meta) return false;
  }

  if (Boolean(event.altKey) !== spec.alt) return false;
  if (Boolean(event.shiftKey) !== spec.shift) return false;
  return true;
}

function isEditableTarget(target) {
  if (!target || typeof target !== 'object') return false;
  const tag = String(target.tagName ?? '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return Boolean(target.isContentEditable);
}

export function createInteractionController({ events } = {}) {
  const cleanups = new Set();

  const trackCleanup = (fn) => {
    if (typeof fn !== 'function') return () => {};
    let done = false;
    const wrapped = () => {
      if (done) return;
      done = true;
      cleanups.delete(wrapped);
      fn();
    };
    cleanups.add(wrapped);
    return wrapped;
  };

  const onAction = (root, actionMap = {}, options = {}) => {
    if (!root?.addEventListener) {
      throw new TypeError('A valid DOM root is required for onAction().');
    }
    if (!actionMap || typeof actionMap !== 'object') {
      throw new TypeError('onAction() requires an action handler map.');
    }

    const attrName = options.attribute ?? 'data-ogve-action';
    const eventName = options.event ?? 'click';

    const unbind = delegate(root, eventName, `[${attrName}]`, (event, trigger) => {
      const actionName = trigger.getAttribute?.(attrName);
      if (!actionName) return;

      const payloadRaw = trigger.getAttribute?.('data-ogve-payload');
      let payload = payloadRaw ?? undefined;
      if (typeof payloadRaw === 'string' && (payloadRaw.startsWith('{') || payloadRaw.startsWith('['))) {
        try {
          payload = JSON.parse(payloadRaw);
        } catch { /* Keep raw string payload if not JSON */ }
      }

      const context = {
        action: actionName,
        trigger,
        event,
        payload
      };

      const handler = actionMap[actionName];
      if (typeof handler === 'function') {
        handler(context);
      }

      events?.emit('interaction:action', {
        action: actionName,
        payload
      });
    }, options);

    return trackCleanup(unbind);
  };

  const bindShortcuts = (target, shortcutsMap = {}, options = {}) => {
    const host = target ?? globalThis.document;
    if (!host?.addEventListener) {
      throw new TypeError('A valid event target is required for bindShortcuts().');
    }
    if (!shortcutsMap || typeof shortcutsMap !== 'object') {
      throw new TypeError('bindShortcuts() requires a shortcut map.');
    }

    const ignoreInputs = options.ignoreInputs ?? true;
    const entries = Object.entries(shortcutsMap)
      .filter(([, fn]) => typeof fn === 'function')
      .map(([combo, handler]) => ({
        combo,
        spec: normalizeShortcutCombo(combo),
        handler
      }));

    const onKeyDown = (event) => {
      if (ignoreInputs && isEditableTarget(event.target)) {
        // Still allow Escape inside inputs
        if (String(event.key ?? '').toLowerCase() !== 'escape') return;
      }

      for (const entry of entries) {
        if (matchesShortcut(event, entry.spec)) {
          if (options.preventDefault !== false) {
            event.preventDefault?.();
          }
          entry.handler(event, entry.combo);
          events?.emit('interaction:shortcut', { combo: entry.combo });
          break;
        }
      }
    };

    host.addEventListener('keydown', onKeyDown);
    return trackCleanup(() => host.removeEventListener('keydown', onKeyDown));
  };

  const observeViewport = (targets, callback, options = {}) => {
    if (typeof callback !== 'function') {
      throw new TypeError('observeViewport() requires a callback function.');
    }

    const list = Array.isArray(targets)
      ? targets
      : targets && typeof targets === 'object' && typeof targets.nodeType === 'number'
        ? [targets]
        : [...(targets ?? [])];

    const once = options.once ?? true;
    const ObserverCtor = globalThis.IntersectionObserver;

    if (typeof ObserverCtor !== 'function') {
      // Graceful immediate fallback when IntersectionObserver is unavailable
      for (const el of list) {
        el.setAttribute?.('data-ogve-visible', 'true');
        callback({ target: el, isIntersecting: true, intersectionRatio: 1 });
      }
      events?.emit('interaction:viewport', { count: list.length, fallback: true });
      return () => {};
    }

    const observer = new ObserverCtor((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target?.setAttribute?.('data-ogve-visible', 'true');
          callback(entry);
          events?.emit('interaction:viewport', { isIntersecting: true });
          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          entry.target?.removeAttribute?.('data-ogve-visible');
          callback(entry);
        }
      }
    }, {
      root: options.root ?? null,
      rootMargin: options.rootMargin ?? '0px 0px -8% 0px',
      threshold: options.threshold ?? 0.12
    });

    for (const el of list) {
      if (el) observer.observe(el);
    }

    return trackCleanup(() => observer.disconnect());
  };

  const trackPress = (target, handlers = {}) => {
    if (!target?.addEventListener) {
      throw new TypeError('A valid DOM target is required for trackPress().');
    }

    let pressed = false;

    const startPress = (event) => {
      if (target.disabled || target.getAttribute?.('aria-disabled') === 'true') return;
      if (pressed) return;
      pressed = true;
      target.setAttribute?.('data-ogve-pressed', 'true');
      handlers.onPressStart?.(event, target);
    };

    const endPress = (event, commit = false) => {
      if (!pressed) return;
      pressed = false;
      target.removeAttribute?.('data-ogve-pressed');
      handlers.onPressEnd?.(event, target);
      if (commit) {
        handlers.onPress?.(event, target);
        events?.emit('interaction:press', { targetTag: target.tagName ?? 'UNKNOWN' });
      }
    };

    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      startPress(e);
    };
    const onPointerUp = (e) => endPress(e, true);
    const onPointerCancel = (e) => endPress(e, false);
    const onPointerLeave = (e) => endPress(e, false);
    const onKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        startPress(e);
      }
    };
    const onKeyUp = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        endPress(e, true);
      }
    };
    const onBlur = (e) => endPress(e, false);

    target.addEventListener('pointerdown', onPointerDown);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerCancel);
    target.addEventListener('pointerleave', onPointerLeave);
    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    target.addEventListener('blur', onBlur);

    return trackCleanup(() => {
      target.removeAttribute?.('data-ogve-pressed');
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerCancel);
      target.removeEventListener('pointerleave', onPointerLeave);
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
    });
  };

  const bindGesture = (target, handlers = {}, options = {}) => {
    if (!target?.addEventListener) {
      throw new TypeError('A valid DOM target is required for bindGesture().');
    }

    const swipeThreshold = Math.max(10, Number(options.swipeThreshold) || 36);
    const longPressMs = Math.max(120, Number(options.longPressMs) || 450);

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let activePointerId = null;
    let longPressTimer = null;
    let longPressFired = false;

    const clearTimer = () => {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const emitGesture = (detail) => {
      events?.emit('interaction:gesture', detail);
    };

    const onDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      activePointerId = event.pointerId ?? 'mouse';
      startX = Number(event.clientX) || 0;
      startY = Number(event.clientY) || 0;
      startTime = Date.now();
      longPressFired = false;
      target.setAttribute?.('data-ogve-gesturing', 'true');

      clearTimer();
      if (typeof handlers.onLongPress === 'function') {
        longPressTimer = setTimeout(() => {
          longPressFired = true;
          const detail = { type: 'longpress', x: startX, y: startY };
          handlers.onLongPress(detail, event);
          emitGesture(detail);
        }, longPressMs);
      }
    };

    const onMove = (event) => {
      if (activePointerId === null) return;
      if (event.pointerId !== undefined && event.pointerId !== activePointerId) return;
      const dx = (Number(event.clientX) || 0) - startX;
      const dy = (Number(event.clientY) || 0) - startY;
      if (Math.hypot(dx, dy) > 10) {
        clearTimer();
      }
      handlers.onMove?.({ dx, dy }, event);
    };

    const onUp = (event) => {
      if (activePointerId === null) return;
      if (event.pointerId !== undefined && event.pointerId !== activePointerId) return;
      activePointerId = null;
      clearTimer();
      target.removeAttribute?.('data-ogve-gesturing');

      if (longPressFired) return;

      const endX = Number(event.clientX) || 0;
      const endY = Number(event.clientY) || 0;
      const dx = endX - startX;
      const dy = endY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const elapsed = Math.max(1, Date.now() - startTime);

      if (Math.max(absX, absY) >= swipeThreshold) {
        let direction = 'right';
        if (absX >= absY) {
          direction = dx < 0 ? 'left' : 'right';
        } else {
          direction = dy < 0 ? 'up' : 'down';
        }
        const detail = {
          type: 'swipe',
          direction,
          dx,
          dy,
          velocity: Math.hypot(dx, dy) / elapsed
        };
        handlers.onSwipe?.(detail, event);
        if (direction === 'left') handlers.onSwipeLeft?.(detail, event);
        if (direction === 'right') handlers.onSwipeRight?.(detail, event);
        if (direction === 'up') handlers.onSwipeUp?.(detail, event);
        if (direction === 'down') handlers.onSwipeDown?.(detail, event);
        emitGesture(detail);
      } else {
        const detail = { type: 'tap', x: endX, y: endY, elapsed };
        handlers.onTap?.(detail, event);
        emitGesture(detail);
      }
    };

    const onCancel = () => {
      activePointerId = null;
      clearTimer();
      target.removeAttribute?.('data-ogve-gesturing');
    };

    target.addEventListener('pointerdown', onDown);
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onCancel);

    return trackCleanup(() => {
      onCancel();
      target.removeEventListener('pointerdown', onDown);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
    });
  };

  const destroyAll = () => {
    const list = [...cleanups];
    for (const cleanup of list) {
      try {
        cleanup();
      } catch { /* Ignore cleanup errors during teardown */ }
    }
    cleanups.clear();
    return list.length;
  };

  const getActiveBindingsCount = () => cleanups.size;

  return {
    delegate: (root, eventName, selector, handler, opts) =>
      trackCleanup(delegate(root, eventName, selector, handler, opts)),
    onAction,
    bindShortcuts,
    observeViewport,
    trackPress,
    bindGesture,
    destroyAll,
    getActiveBindingsCount
  };
}
