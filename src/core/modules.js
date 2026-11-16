const MODULE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export function createModuleRegistry({ events, getContext = () => ({}) } = {}) {
  const entries = new Map();
  let activePhase = 'idle';

  const validateDefinition = (definition) => {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      throw new TypeError('Module definition must be an object.');
    }
    if (typeof definition.name !== 'string' || !MODULE_NAME_PATTERN.test(definition.name)) {
      throw new TypeError('Module name must be non-empty kebab-case (e.g. "theme", "custom-fx").');
    }
    if ('dependencies' in definition && definition.dependencies !== undefined) {
      if (!Array.isArray(definition.dependencies) || definition.dependencies.some(dep => typeof dep !== 'string' || !MODULE_NAME_PATTERN.test(dep))) {
        throw new TypeError(`Module "${definition.name}" dependencies must be an array of valid module names.`);
      }
      if (definition.dependencies.includes(definition.name)) {
        throw new Error(`Module "${definition.name}" cannot depend on itself.`);
      }
    }
    for (const hook of ['init', 'start', 'pause', 'resume', 'destroy']) {
      if (hook in definition && definition[hook] !== undefined && typeof definition[hook] !== 'function') {
        throw new TypeError(`Module "${definition.name}" hook "${hook}" must be a function.`);
      }
    }
  };

  const resolveOrder = (subsetNames = null) => {
    const targets = subsetNames ? [...subsetNames] : [...entries.keys()];
    const visited = new Set();
    const visiting = new Set();
    const ordered = [];

    const visit = (name, chain = []) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        const cycle = [...chain, name].join(' -> ');
        throw new Error(`Circular module dependency detected: ${cycle}`);
      }
      const record = entries.get(name);
      if (!record) {
        const requester = chain[chain.length - 1] ?? 'root';
        throw new Error(`Missing module dependency "${name}" required by "${requester}".`);
      }

      visiting.add(name);
      for (const dep of record.dependencies) {
        visit(dep, [...chain, name]);
      }
      visiting.delete(name);
      visited.add(name);
      ordered.push(record);
    };

    for (const name of targets) {
      visit(name, []);
    }

    return ordered;
  };

  const initializeRecord = (record) => {
    if (record.status !== 'registered') return;
    const ctx = getContext(record.name);
    try {
      record.definition.init?.(ctx);
      if (typeof record.definition.api === 'function') {
        record.api = record.definition.api(ctx);
      } else if (record.definition.api && typeof record.definition.api === 'object') {
        record.api = record.definition.api;
      }
      record.status = 'initialized';
      events?.emit('module:initialized', { name: record.name, version: record.version });
    } catch (error) {
      record.status = 'error';
      events?.emit('module:error', { name: record.name, phase: 'init', error });
      throw error;
    }
  };

  const startRecord = (record) => {
    if (record.status === 'registered') {
      initializeRecord(record);
    }
    if (record.status === 'started') return;
    const ctx = getContext(record.name);
    try {
      record.definition.start?.(ctx);
      record.status = 'started';
      events?.emit('module:started', { name: record.name, version: record.version });
    } catch (error) {
      record.status = 'error';
      events?.emit('module:error', { name: record.name, phase: 'start', error });
      throw error;
    }
  };

  const pauseRecord = (record) => {
    if (record.status !== 'started') return;
    const ctx = getContext(record.name);
    record.definition.pause?.(ctx);
    record.status = 'paused';
    events?.emit('module:paused', { name: record.name });
  };

  const resumeRecord = (record) => {
    if (record.status !== 'paused') return;
    const ctx = getContext(record.name);
    record.definition.resume?.(ctx);
    record.status = 'started';
    events?.emit('module:resumed', { name: record.name });
  };

  const destroyRecord = (record) => {
    if (record.status === 'registered' || record.status === 'destroyed') {
      record.status = 'destroyed';
      return;
    }
    const ctx = getContext(record.name);
    try {
      record.definition.destroy?.(ctx);
    } finally {
      record.status = 'destroyed';
      events?.emit('module:destroyed', { name: record.name });
    }
  };

  const register = (definition, { replace = false } = {}) => {
    validateDefinition(definition);
    const { name } = definition;

    if (entries.has(name) && !replace) {
      throw new Error(`Module "${name}" is already registered.`);
    }

    if (entries.has(name) && replace) {
      destroyRecord(entries.get(name));
      entries.delete(name);
    }

    const record = {
      name,
      version: definition.version ?? '1.0.0',
      dependencies: [...(definition.dependencies ?? [])],
      definition,
      api: null,
      status: 'registered',
      registeredAt: Date.now()
    };

    entries.set(name, record);
    events?.emit('module:registered', {
      name: record.name,
      version: record.version,
      dependencies: [...record.dependencies]
    });

    if (activePhase === 'ready' || activePhase === 'paused') {
      const ordered = resolveOrder([name]);
      for (const item of ordered) {
        if (item.status === 'registered') initializeRecord(item);
        if (activePhase === 'ready' && item.status === 'initialized') startRecord(item);
      }
      if (activePhase === 'paused' && record.status === 'initialized') {
        startRecord(record);
        pauseRecord(record);
      }
    }

    return record.api;
  };

  const unregister = (name, { force = false } = {}) => {
    const record = entries.get(name);
    if (!record) return false;

    if (!force) {
      const dependents = [...entries.values()]
        .filter(item => item.name !== name && item.dependencies.includes(name))
        .map(item => item.name);
      if (dependents.length > 0) {
        throw new Error(`Cannot unregister module "${name}" because it is required by: ${dependents.join(', ')}.`);
      }
    }

    destroyRecord(record);
    entries.delete(name);
    events?.emit('module:unregistered', { name });
    return true;
  };

  const initAll = () => {
    const ordered = resolveOrder();
    for (const record of ordered) {
      initializeRecord(record);
    }
    return ordered.map(r => r.name);
  };

  const startAll = () => {
    const ordered = resolveOrder();
    for (const record of ordered) {
      startRecord(record);
    }
    activePhase = 'ready';
    return ordered.map(r => r.name);
  };

  const pauseAll = () => {
    const ordered = resolveOrder().reverse();
    for (const record of ordered) {
      pauseRecord(record);
    }
    activePhase = 'paused';
  };

  const resumeAll = () => {
    const ordered = resolveOrder();
    for (const record of ordered) {
      resumeRecord(record);
    }
    activePhase = 'ready';
  };

  const destroyAll = () => {
    let ordered;
    try {
      ordered = resolveOrder().reverse();
    } catch {
      ordered = [...entries.values()].reverse();
    }
    for (const record of ordered) {
      destroyRecord(record);
    }
    activePhase = 'idle';
  };

  const get = (name) => entries.get(name)?.api;
  const has = (name) => entries.has(name);
  const list = () => [...entries.keys()];

  const inspect = (name) => {
    if (typeof name === 'string') {
      const record = entries.get(name);
      if (!record) return null;
      return Object.freeze({
        name: record.name,
        version: record.version,
        status: record.status,
        dependencies: Object.freeze([...record.dependencies]),
        hasApi: record.api !== null
      });
    }
    return [...entries.keys()].map(modName => inspect(modName));
  };

  return {
    register,
    unregister,
    resolveOrder,
    initAll,
    startAll,
    pauseAll,
    resumeAll,
    destroyAll,
    get,
    has,
    list,
    inspect
  };
}
