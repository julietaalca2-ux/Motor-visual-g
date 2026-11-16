export function delegate(root, eventName, selector, handler) {
  if (!root?.addEventListener) throw new TypeError('A valid event root is required.');
  const listener = event => {
    const match = event.target?.closest?.(selector);
    if (match && root.contains(match)) handler(event, match);
  };
  root.addEventListener(eventName, listener);
  return () => root.removeEventListener(eventName, listener);
}
