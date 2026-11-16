export function createEventBus({ maxListeners = 100, onError = null } = {}) {
  const listeners = new Map();
  const wildcardListeners = new Set();
  let disposed = false;

  const assertActive = () => {
    if (disposed) throw new Error('EventBus has been destroyed.');
  };

  const buildMeta = (name) => ({
    type: name,
    timestamp: Date.now()
  });

  const handleListenerError = (error, name) => {
    if (typeof onError === 'function') {
      onError(error, { event: name });
    } else if (globalThis.console?.error) {
      globalThis.console.error(`[ÖG Visual Engine] Error in listener for "${name}":`, error);
    }
  };

  const off = (name, callback) => {
    if (typeof name !== 'string' || !name) return false;
    if (!callback) return listeners.delete(name);
    const bucket = listeners.get(name);
    if (!bucket) return false;
    const removed = bucket.delete(callback);
    if (bucket.size === 0) listeners.delete(name);
    return removed;
  };

  const on = (name, callback) => {
    assertActive();
    if (typeof name !== 'string' || !name.trim()) throw new TypeError('event name must be a non-empty string');
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');

    if (!listeners.has(name)) listeners.set(name, new Set());
    const bucket = listeners.get(name);

    if (bucket.size >= maxListeners && !bucket.has(callback)) {
      throw new RangeError(`Max listeners (${maxListeners}) exceeded for event "${name}".`);
    }

    bucket.add(callback);
    return () => off(name, callback);
  };

  const once = (name, callback) => {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    let unsubscribe = () => {};
    const wrapper = (detail, meta) => {
      unsubscribe();
      return callback(detail, meta);
    };
    unsubscribe = on(name, wrapper);
    return unsubscribe;
  };

  const onAny = (callback) => {
    assertActive();
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    wildcardListeners.add(callback);
    return () => wildcardListeners.delete(callback);
  };

  const emit = (name, detail) => {
    if (disposed) return false;
    const meta = buildMeta(name);
    const bucket = listeners.get(name);
    const snapshot = bucket ? [...bucket] : [];

    for (const callback of snapshot) {
      try {
        callback(detail, meta);
      } catch (error) {
        handleListenerError(error, name);
      }
    }

    for (const wildcard of [...wildcardListeners]) {
      try {
        wildcard(name, detail, meta);
      } catch (error) {
        handleListenerError(error, `*:${name}`);
      }
    }

    return snapshot.length > 0 || wildcardListeners.size > 0;
  };

  const emitAsync = async (name, detail) => {
    if (disposed) return [];
    const meta = buildMeta(name);
    const bucket = listeners.get(name);
    const snapshot = bucket ? [...bucket] : [];
    const outcomes = [];

    for (const callback of snapshot) {
      try {
        const value = await callback(detail, meta);
        outcomes.push({ status: 'fulfilled', value });
      } catch (reason) {
        handleListenerError(reason, name);
        outcomes.push({ status: 'rejected', reason });
      }
    }

    for (const wildcard of [...wildcardListeners]) {
      try {
        await wildcard(name, detail, meta);
      } catch (error) {
        handleListenerError(error, `*:${name}`);
      }
    }

    return outcomes;
  };

  const listenerCount = (name) => {
    if (typeof name === 'string') return listeners.get(name)?.size ?? 0;
    let total = 0;
    for (const bucket of listeners.values()) total += bucket.size;
    return total;
  };

  const eventNames = () => [...listeners.keys()];

  const clear = (name) => {
    if (typeof name === 'string') {
      listeners.delete(name);
      return;
    }
    listeners.clear();
    wildcardListeners.clear();
  };

  const destroy = () => {
    clear();
    disposed = true;
  };

  return {
    on,
    once,
    off,
    onAny,
    emit,
    emitAsync,
    listenerCount,
    eventNames,
    clear,
    destroy
  };
}
