export function delegate(root, eventName, selector, handler, options = {}) {
  if (!root?.addEventListener) throw new TypeError('A valid event root is required.');
  if (typeof selector !== 'string' || !selector.trim()) {
    throw new TypeError('A valid CSS selector string is required.');
  }
  if (typeof handler !== 'function') {
    throw new TypeError('An event handler function is required.');
  }

  let active = true;
  let off = () => {};

  const listener = (event) => {
    if (!active) return;
    const match = event.target?.closest?.(selector);
    if (match && (!root.contains || root.contains(match))) {
      if (options.preventDefault) event.preventDefault?.();
      if (options.stopPropagation) event.stopPropagation?.();
      handler(event, match);
      if (options.once) {
        off();
      }
    }
  };

  const listenerOpts = typeof options === 'boolean'
    ? options
    : { capture: Boolean(options.capture), passive: options.passive };

  root.addEventListener(eventName, listener, listenerOpts);
  off = () => {
    if (!active) return;
    active = false;
    root.removeEventListener(eventName, listener, listenerOpts);
  };

  return off;
}
