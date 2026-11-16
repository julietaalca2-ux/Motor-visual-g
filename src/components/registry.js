export function createComponentRegistry() {
  const factories = new Map();
  return {
    register(name, factory) {
      if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new TypeError('Component names must be kebab-case.');
      if (typeof factory !== 'function') throw new TypeError('Component factory must be a function.');
      factories.set(name, factory);
    },
    create(name, props = {}) {
      const factory = factories.get(name);
      if (!factory) throw new Error(`Component not registered: ${name}`);
      return factory(props);
    },
    has(name) { return factories.has(name); },
    list() { return [...factories.keys()]; }
  };
}
