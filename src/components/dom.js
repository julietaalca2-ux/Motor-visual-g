export function cx(...parts) {
  const tokens = [];
  for (const part of parts) {
    if (!part) continue;
    if (typeof part === 'string') {
      tokens.push(part.trim());
    } else if (Array.isArray(part)) {
      const nested = cx(...part);
      if (nested) tokens.push(nested);
    } else if (typeof part === 'object') {
      for (const [key, enabled] of Object.entries(part)) {
        if (enabled) tokens.push(key);
      }
    }
  }
  return tokens.filter(Boolean).join(' ');
}

function isDomNode(value, doc) {
  if (!value || typeof value !== 'object') return false;
  if (typeof globalThis.Node === 'function' && value instanceof globalThis.Node) return true;
  if (doc?.defaultView?.Node && value instanceof doc.defaultView.Node) return true;
  return typeof value.nodeType === 'number' && typeof value.nodeName === 'string';
}

export function appendChildren(parent, children, doc = parent?.ownerDocument ?? globalThis.document) {
  if (!parent || children == null || children === false) return parent;

  if (Array.isArray(children)) {
    for (const child of children) {
      appendChildren(parent, child, doc);
    }
    return parent;
  }

  if (isDomNode(children, doc)) {
    parent.appendChild(children);
    return parent;
  }

  if (typeof children === 'string' || typeof children === 'number') {
    const textNode = doc?.createTextNode
      ? doc.createTextNode(String(children))
      : String(children);
    if (typeof textNode === 'string') {
      parent.textContent = (parent.textContent ?? '') + textNode;
    } else {
      parent.appendChild(textNode);
    }
  }

  return parent;
}

export function applyProps(element, props = {}, { cleanup = null } = {}) {
  if (!element || !props || typeof props !== 'object') return element;

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || key === 'children' || key === 'text') continue;

    if (key === 'className' || key === 'class') {
      const cls = cx(value);
      if (cls) element.setAttribute('class', cls);
      else element.removeAttribute('class');
      continue;
    }

    if (key === 'style' && value && typeof value === 'object') {
      for (const [prop, val] of Object.entries(value)) {
        if (val == null) {
          element.style?.removeProperty?.(prop);
        } else if (prop.startsWith('--')) {
          element.style?.setProperty?.(prop, String(val));
        } else if (element.style) {
          element.style[prop] = String(val);
        }
      }
      continue;
    }

    if (key === 'dataset' && value && typeof value === 'object') {
      for (const [dataKey, dataVal] of Object.entries(value)) {
        const attrName = `data-${dataKey.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
        if (dataVal == null || dataVal === false) {
          element.removeAttribute(attrName);
        } else {
          element.setAttribute(attrName, dataVal === true ? '' : String(dataVal));
        }
      }
      continue;
    }

    if (key === 'attrs' && value && typeof value === 'object') {
      for (const [attrName, attrVal] of Object.entries(value)) {
        if (attrVal == null || attrVal === false) {
          element.removeAttribute(attrName);
        } else {
          element.setAttribute(attrName, attrVal === true ? '' : String(attrVal));
        }
      }
      continue;
    }

    if (key.startsWith('on') && key.length > 2 && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener?.(eventName, value);
      if (typeof cleanup === 'function') {
        cleanup(() => element.removeEventListener?.(eventName, value));
      }
      continue;
    }

    if (key === 'disabled' || key === 'required' || key === 'checked' || key === 'hidden' || key === 'readOnly') {
      const attr = key.toLowerCase();
      if (value) {
        element.setAttribute(attr, '');
        element[key] = true;
      } else {
        element.removeAttribute(attr);
        element[key] = false;
      }
      continue;
    }

    if (key === 'value' && 'value' in element) {
      element.value = value == null ? '' : String(value);
      continue;
    }

    if (key === 'ariaLabel') {
      if (value == null) element.removeAttribute('aria-label');
      else element.setAttribute('aria-label', String(value));
      continue;
    }

    if (value === null || value === false) {
      element.removeAttribute(key);
    } else if (value === true) {
      element.setAttribute(key, '');
    } else {
      element.setAttribute(key, String(value));
    }
  }

  if ('text' in props && props.text !== undefined) {
    element.textContent = props.text == null ? '' : String(props.text);
  }

  if ('children' in props && props.children !== undefined) {
    appendChildren(element, props.children, element.ownerDocument ?? globalThis.document);
  }

  return element;
}

export function createElement(tag, props = {}, ...children) {
  const doc = props?.ownerDocument ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error('Document is not available to create DOM elements.');
  }
  const el = doc.createElement(tag);
  const { ownerDocument: _ignored, ...rest } = props ?? {};
  applyProps(el, rest);
  if (children.length > 0) {
    appendChildren(el, children, doc);
  }
  return el;
}
