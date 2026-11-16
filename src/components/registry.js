const COMPONENT_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export function createComponentRegistry({ events, getContext = () => ({}) } = {}) {
  const definitions = new Map();
  const instances = new Map();
  const targetIndex = new WeakMap();
  let instanceCounter = 0;

  const normalizeDefinition = (name, factoryOrDef) => {
    if (typeof factoryOrDef === 'function') {
      return {
        name,
        version: '1.0.0',
        defaults: {},
        variants: {},
        setup: factoryOrDef,
        onMount: null,
        onUpdate: null,
        onDestroy: null
      };
    }

    if (!factoryOrDef || typeof factoryOrDef !== 'object' || Array.isArray(factoryOrDef)) {
      throw new TypeError('Component factory must be a function or a component definition object.');
    }

    const setupFn = factoryOrDef.setup ?? factoryOrDef.render ?? factoryOrDef.create;
    if (typeof setupFn !== 'function') {
      throw new TypeError(`Component "${name}" definition must provide a setup(props, ctx) function.`);
    }

    return {
      name,
      version: factoryOrDef.version ?? '1.0.0',
      defaults: factoryOrDef.defaults && typeof factoryOrDef.defaults === 'object' ? { ...factoryOrDef.defaults } : {},
      variants: factoryOrDef.variants && typeof factoryOrDef.variants === 'object' ? { ...factoryOrDef.variants } : {},
      setup: setupFn,
      onMount: typeof factoryOrDef.onMount === 'function' ? factoryOrDef.onMount : null,
      onUpdate: typeof factoryOrDef.onUpdate === 'function' ? factoryOrDef.onUpdate : null,
      onDestroy: typeof factoryOrDef.onDestroy === 'function' ? factoryOrDef.onDestroy : null
    };
  };

  const resolveProps = (def, rawProps = {}) => {
    const incoming = rawProps && typeof rawProps === 'object' ? rawProps : {};
    const variantKey = incoming.variant ?? def.defaults.variant;
    const variantDefaults = (variantKey && def.variants[variantKey]) ? def.variants[variantKey] : {};
    return {
      ...def.defaults,
      ...variantDefaults,
      ...incoming
    };
  };

  const buildComponentContext = (name, cleanups = []) => ({
    ...getContext(),
    componentName: name,
    onCleanup(fn) {
      if (typeof fn === 'function') cleanups.push(fn);
    }
  });

  const register = (name, factoryOrDef, { replace = true } = {}) => {
    if (typeof name !== 'string' || !COMPONENT_NAME_PATTERN.test(name)) {
      throw new TypeError('Component names must be kebab-case.');
    }
    if (definitions.has(name) && !replace) {
      throw new Error(`Component "${name}" is already registered.`);
    }
    const normalized = normalizeDefinition(name, factoryOrDef);
    definitions.set(name, normalized);
    events?.emit('component:registered', { name, version: normalized.version });
    return normalized;
  };

  const unregister = (name) => {
    if (!definitions.has(name)) return false;
    for (const [id, record] of [...instances.entries()]) {
      if (record.name === name) {
        unmount(id);
      }
    }
    definitions.delete(name);
    events?.emit('component:unregistered', { name });
    return true;
  };

  const create = (name, props = {}) => {
    const def = definitions.get(name);
    if (!def) throw new Error(`Component not registered: ${name}`);

    const resolvedProps = resolveProps(def, props);
    const cleanups = [];
    const ctx = buildComponentContext(name, cleanups);

    try {
      const node = def.setup(resolvedProps, ctx);
      if (node && typeof node === 'object' && typeof node.setAttribute === 'function') {
        if (!node.hasAttribute?.('data-ogve-component')) {
          node.setAttribute('data-ogve-component', name);
        }
        if (resolvedProps.variant && !node.hasAttribute?.('data-ogve-variant')) {
          node.setAttribute('data-ogve-variant', String(resolvedProps.variant));
        }
        if (resolvedProps.size && !node.hasAttribute?.('data-ogve-size')) {
          node.setAttribute('data-ogve-size', String(resolvedProps.size));
        }
      }
      events?.emit('component:created', { name, props: resolvedProps });
      return { node, resolvedProps, cleanups, def };
    } catch (error) {
      events?.emit('component:error', { name, phase: 'create', error });
      throw error;
    }
  };

  // Preserve exact original create() return value (the element/result directly)
  const createPublic = (name, props = {}) => create(name, props).node;

  const unmount = (targetOrId) => {
    if (!targetOrId) return false;
    let record = null;

    if (typeof targetOrId === 'string') {
      record = instances.get(targetOrId) ?? null;
    } else if (typeof targetOrId === 'object') {
      if (typeof targetOrId.id === 'string' && instances.has(targetOrId.id)) {
        record = instances.get(targetOrId.id);
      } else if (targetIndex.has(targetOrId)) {
        record = targetIndex.get(targetOrId);
      }
    }

    if (!record) return false;

    for (const fn of record.cleanups.splice(0).reverse()) {
      try {
        fn();
      } catch { /* Ignore cleanup errors during teardown */ }
    }

    try {
      record.def.onDestroy?.(record.element, record.props, record.ctx);
    } catch { /* Ignore hook errors during teardown */ }

    if (record.target?.replaceChildren) {
      record.target.replaceChildren();
    } else if (record.element?.remove) {
      record.element.remove();
    }

    instances.delete(record.id);
    if (record.target && typeof record.target === 'object') {
      targetIndex.delete(record.target);
    }

    events?.emit('component:unmounted', { id: record.id, name: record.name });
    return true;
  };

  const unmountAll = (rootTarget = null) => {
    let count = 0;
    for (const [id, record] of [...instances.entries()]) {
      if (!rootTarget || record.target === rootTarget || rootTarget.contains?.(record.target)) {
        if (unmount(id)) count += 1;
      }
    }
    return count;
  };

  const mount = (name, target, props = {}, { replace = true } = {}) => {
    if (!target || typeof target !== 'object' || typeof target.replaceChildren !== 'function') {
      throw new TypeError('A valid DOM target container is required to mount a component.');
    }

    if (targetIndex.has(target)) {
      if (!replace) {
        throw new Error('Target container already has a mounted component instance.');
      }
      unmount(target);
    }

    const { node, resolvedProps, cleanups, def } = create(name, props);
    if (node instanceof globalThis.Node || (node && typeof node === 'object' && typeof node.nodeType === 'number')) {
      target.replaceChildren(node);
    } else {
      target.textContent = node == null ? '' : String(node);
    }

    instanceCounter += 1;
    const id = `ogve-cmp-${instanceCounter}`;
    const ctx = buildComponentContext(name, cleanups);

    const record = {
      id,
      name,
      target,
      element: node,
      props: resolvedProps,
      cleanups,
      def,
      ctx,
      mountedAt: Date.now()
    };

    instances.set(id, record);
    targetIndex.set(target, record);

    def.onMount?.(node, resolvedProps, ctx);
    events?.emit('component:mounted', { id, name, props: resolvedProps });

    const handle = Object.freeze({
      id,
      name,
      get element() { return record.element; },
      get props() { return { ...record.props }; },
      update(nextProps = {}) {
        return update(id, nextProps);
      },
      unmount() {
        return unmount(id);
      }
    });

    record.handle = handle;
    return handle;
  };

  const update = (targetOrId, nextProps = {}) => {
    let record = null;
    if (typeof targetOrId === 'string') {
      record = instances.get(targetOrId) ?? null;
    } else if (targetOrId && typeof targetOrId === 'object') {
      if (typeof targetOrId.id === 'string') record = instances.get(targetOrId.id) ?? null;
      else record = targetIndex.get(targetOrId) ?? null;
    }

    if (!record) {
      throw new Error('Cannot update component: active mounted instance not found.');
    }

    const mergedProps = resolveProps(record.def, { ...record.props, ...nextProps });

    if (record.def.onUpdate) {
      const handled = record.def.onUpdate(record.element, mergedProps, record.props, record.ctx);
      record.props = mergedProps;
      events?.emit('component:updated', { id: record.id, name: record.name, props: mergedProps });
      if (handled !== false) return record.handle;
    }

    // Re-render element cleanly when onUpdate is not provided or returns false
    for (const fn of record.cleanups.splice(0).reverse()) {
      try { fn(); } catch { /* Ignore cleanup errors */ }
    }
    const { node, resolvedProps, cleanups } = create(record.name, mergedProps);
    record.cleanups.push(...cleanups);
    record.element = node;
    record.props = resolvedProps;
    if (node && typeof node === 'object' && typeof node.nodeType === 'number') {
      record.target.replaceChildren(node);
    } else {
      record.target.textContent = node == null ? '' : String(node);
    }
    record.def.onMount?.(node, resolvedProps, record.ctx);
    events?.emit('component:updated', { id: record.id, name: record.name, props: resolvedProps });
    return record.handle;
  };

  const parseDeclarativeProps = (el) => {
    let parsed = {};
    const rawJson = el.getAttribute?.('data-ogve-props');
    if (rawJson) {
      try {
        const obj = JSON.parse(rawJson);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          parsed = { ...obj };
        }
      } catch { /* Ignore invalid JSON and fall back to data attributes */ }
    }

    if (el.attributes) {
      for (const attr of [...el.attributes]) {
        if (!attr.name.startsWith('data-ogve-prop-')) continue;
        const propKey = attr.name
          .slice('data-ogve-prop-'.length)
          .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
        const val = attr.value;
        if (val === 'true') parsed[propKey] = true;
        else if (val === 'false') parsed[propKey] = false;
        else if (val !== '' && !Number.isNaN(Number(val))) parsed[propKey] = Number(val);
        else parsed[propKey] = val;
      }
    }

    return parsed;
  };

  const hydrate = (root = globalThis.document) => {
    if (!root?.querySelectorAll) return [];
    const hosts = [...root.querySelectorAll('[data-ogve-component]')];
    const mounted = [];

    for (const host of hosts) {
      const name = host.getAttribute('data-ogve-component');
      if (!name || !definitions.has(name)) continue;
      if (targetIndex.has(host)) continue;
      const props = parseDeclarativeProps(host);
      mounted.push(mount(name, host, props));
    }

    return mounted;
  };

  const has = (name) => definitions.has(name);
  const list = () => [...definitions.keys()];

  const describe = (name) => {
    const def = definitions.get(name);
    if (!def) return null;
    return Object.freeze({
      name: def.name,
      version: def.version,
      defaults: Object.freeze({ ...def.defaults }),
      variants: Object.freeze(Object.keys(def.variants))
    });
  };

  const getInstances = (name) => {
    const all = [...instances.values()];
    const filtered = typeof name === 'string' ? all.filter(r => r.name === name) : all;
    return filtered.map(r => Object.freeze({
      id: r.id,
      name: r.name,
      mountedAt: r.mountedAt,
      props: Object.freeze({ ...r.props })
    }));
  };

  return {
    register,
    unregister,
    create: createPublic,
    mount,
    update,
    unmount,
    unmountAll,
    hydrate,
    has,
    list,
    describe,
    getInstances
  };
}
