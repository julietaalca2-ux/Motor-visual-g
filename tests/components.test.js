import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVisualEngine,
  createComponentRegistry,
  createElement,
  cx,
  registerBuiltInComponents,
  BUILT_IN_COMPONENTS
} from '../src/index.js';
import { createEventBus } from '../src/core/events.js';

function createMockElement(tagName, doc) {
  const attrs = new Map();
  const styles = new Map();
  const listeners = new Map();
  const children = [];
  let text = '';

  const el = {
    nodeType: 1,
    nodeName: tagName.toUpperCase(),
    tagName: tagName.toUpperCase(),
    ownerDocument: doc,
    parentNode: null,
    children,
    style: {
      setProperty(k, v) { styles.set(k, String(v)); },
      getPropertyValue(k) { return styles.get(k) ?? ''; },
      removeProperty(k) { styles.delete(k); }
    },
    get attributes() {
      return [...attrs.entries()].map(([name, value]) => ({ name, value }));
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
      for (const fn of listeners.get(event.type) ?? []) {
        fn({ ...event, target: el });
      }
    },
    appendChild(child) {
      if (child && typeof child === 'object') {
        child.parentNode = el;
        children.push(child);
      }
      return child;
    },
    replaceChildren(...nodes) {
      children.length = 0;
      text = '';
      for (const n of nodes) {
        if (n && typeof n === 'object') {
          n.parentNode = el;
          children.push(n);
        } else if (n != null) {
          text += String(n);
        }
      }
    },
    remove() {
      if (el.parentNode) {
        const idx = el.parentNode.children.indexOf(el);
        if (idx >= 0) el.parentNode.children.splice(idx, 1);
      }
    },
    contains(other) {
      if (other === el) return true;
      return children.some(c => c.contains?.(other));
    },
    get textContent() {
      if (children.length > 0) {
        return children.map(c => c.textContent ?? '').join('');
      }
      return text;
    },
    set textContent(v) {
      children.length = 0;
      text = v == null ? '' : String(v);
    }
  };

  if (tagName.toLowerCase() === 'input') {
    el.value = '';
  }

  return el;
}

function createMockDocument() {
  const doc = {
    createElement(tag) {
      return createMockElement(tag, doc);
    },
    createTextNode(str) {
      return {
        nodeType: 3,
        nodeName: '#text',
        textContent: String(str),
        parentNode: null
      };
    }
  };
  return doc;
}

test('dom helpers build safe elements and compose class names', () => {
  const doc = createMockDocument();
  assert.equal(cx('a', false, ['b', { c: true, d: false }]), 'a b c');

  let clicked = 0;
  const btn = createElement('button', {
    ownerDocument: doc,
    className: ['ogve-btn', 'ogve-btn--primary'],
    ariaLabel: 'Guardar',
    dataset: { testId: 'save-btn' },
    onClick: () => { clicked += 1; },
    text: '<script>alert(1)</script>'
  });

  assert.equal(btn.getAttribute('class'), 'ogve-btn ogve-btn--primary');
  assert.equal(btn.getAttribute('aria-label'), 'Guardar');
  assert.equal(btn.getAttribute('data-test-id'), 'save-btn');
  assert.equal(btn.textContent, '<script>alert(1)</script>');
  btn.dispatchEvent({ type: 'click' });
  assert.equal(clicked, 1);
});

test('component registry supports factories, descriptors, variants, mount, update, and unmount', () => {
  const doc = createMockDocument();
  const bus = createEventBus();
  const registry = createComponentRegistry({ events: bus });
  const lifecycleTrace = [];

  registry.register('status-pill', {
    version: '1.2.0',
    defaults: { label: 'Listo', tone: 'neutral' },
    variants: {
      ok: { tone: 'success', label: 'Activo' }
    },
    setup(props) {
      return createElement('span', {
        ownerDocument: doc,
        className: `pill-${props.tone}`,
        text: props.label
      });
    },
    onMount() { lifecycleTrace.push('mount'); },
    onUpdate(_el, next) {
      lifecycleTrace.push(`update:${next.label}`);
      return false;
    },
    onDestroy() { lifecycleTrace.push('destroy'); }
  });

  const info = registry.describe('status-pill');
  assert.equal(info.version, '1.2.0');
  assert.deepEqual(info.variants, ['ok']);

  const standalone = registry.create('status-pill', { variant: 'ok' });
  assert.equal(standalone.textContent, 'Activo');
  assert.equal(standalone.getAttribute('data-ogve-component'), 'status-pill');

  const host = doc.createElement('div');
  const handle = registry.mount('status-pill', host, { variant: 'ok' });
  assert.equal(host.children[0].textContent, 'Activo');
  assert.equal(registry.getInstances('status-pill').length, 1);

  handle.update({ label: 'Sincronizado' });
  assert.equal(host.children[0].textContent, 'Sincronizado');

  assert.equal(handle.unmount(), true);
  assert.equal(host.children.length, 0);
  assert.equal(registry.getInstances().length, 0);
  assert.deepEqual(lifecycleTrace, ['mount', 'update:Sincronizado', 'mount', 'destroy']);
});

test('built-in primitives render accessible DOM structures and integrate with createVisualEngine', () => {
  const prevDoc = globalThis.document;
  const doc = createMockDocument();
  globalThis.document = doc;

  try {
    const engine = createVisualEngine({
      theme: 'light',
      observeSystemTheme: false,
      syncMetaThemeColor: false
    }).start();

    assert.equal(engine.version, '0.4.0');
    for (const def of BUILT_IN_COMPONENTS) {
      assert.equal(engine.hasComponent(def.name), true);
    }

    const btn = engine.createComponent('og-button', { variant: 'primary', label: 'Enviar', loading: true });
    assert.equal(btn.getAttribute('aria-busy'), 'true');
    assert.equal(btn.getAttribute('disabled'), '');

    const card = engine.createComponent('og-card', {
      eyebrow: 'MÓDULO',
      title: 'Título',
      body: 'Contenido seguro'
    });
    assert.equal(card.getAttribute('data-ogve-component'), 'og-card');

    const input = engine.createComponent('og-input', {
      label: 'Correo',
      required: true,
      error: 'Campo obligatorio'
    });
    assert.equal(input.getAttribute('data-ogve-component'), 'og-input');

    const alert = engine.createComponent('og-alert', {
      tone: 'danger',
      title: 'Error',
      message: 'Reintentá',
      dismissible: true
    });
    assert.equal(alert.getAttribute('role'), 'alert');

    const avatar = engine.createComponent('og-avatar', {
      name: 'Julieta Alca',
      status: 'online'
    });
    assert.equal(avatar.textContent, 'JA');

    const container = doc.createElement('div');
    const mounted = engine.mountComponent('og-badge', container, { label: 'En vivo', tone: 'success', dot: true });
    assert.equal(engine.getComponentInstances('og-badge').length, 1);

    mounted.update({ label: 'Pausado', tone: 'warning' });
    assert.equal(container.children[0].textContent, 'Pausado');

    // Engine destroy unmounts active component instances automatically
    engine.destroy();
    assert.equal(engine.getComponentInstances().length, 0);
  } finally {
    globalThis.document = prevDoc;
  }
});

test('hydrateComponents mounts declarative data-ogve-component hosts', () => {
  const prevDoc = globalThis.document;
  const doc = createMockDocument();
  globalThis.document = doc;

  try {
    const host = doc.createElement('div');
    host.setAttribute('data-ogve-component', 'og-badge');
    host.setAttribute('data-ogve-prop-label', 'Declarativo');
    host.setAttribute('data-ogve-prop-tone', 'accent');
    host.setAttribute('data-ogve-prop-dot', 'true');

    const root = {
      querySelectorAll(selector) {
        return selector === '[data-ogve-component]' ? [host] : [];
      }
    };

    const registry = createComponentRegistry();
    registerBuiltInComponents(registry);
    const hydrated = registry.hydrate(root);
    assert.equal(hydrated.length, 1);
    assert.equal(host.children[0].textContent, 'Declarativo');
  } finally {
    globalThis.document = prevDoc;
  }
});
