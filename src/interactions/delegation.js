function isWithinRoot(node, root) {
  if (!root) return true;
  if (typeof root.contains === 'function' && root.contains(node)) return true;
  let current = node;
  while (current) {
    if (current === root) return true;
    current = current.parentElement ?? current.parentNode ?? null;
  }
  return false;
}

function findDelegatedMatch(target, selector, root) {
  if (typeof target?.closest === 'function') {
    const match = target.closest(selector);
    return match && isWithinRoot(match, root) ? match : null;
  }

  // Lightweight fallback for DOM-like hosts and test environments without Element.closest().
  let current = target;
  while (current) {
    let matches = false;
    if (typeof current.matches === 'function') {
      matches = current.matches(selector);
    } else {
      const attributeSelector = selector.match(/^\[([^=\]]+)\]$/);
      if (attributeSelector) matches = Boolean(current.hasAttribute?.(attributeSelector[1]));
    }
    if (matches) return isWithinRoot(current, root) ? current : null;
    if (current === root) break;
    current = current.parentElement ?? current.parentNode ?? null;
  }
  return null;
}

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
    const match = findDelegatedMatch(event.target, selector, root);
    if (match) {
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
