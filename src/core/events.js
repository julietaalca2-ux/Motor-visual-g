export function createEventBus() {
  const listeners = new Map();
  return {
    on(name, callback) {
      if (typeof callback !== 'function') throw new TypeError('callback must be a function');
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
      return () => listeners.get(name)?.delete(callback);
    },
    emit(name, detail) {
      for (const callback of listeners.get(name) ?? []) callback(detail);
    },
    clear() { listeners.clear(); }
  };
}
