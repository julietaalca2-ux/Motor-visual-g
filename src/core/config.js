const RESERVED_THEME_MODES = new Set(['light', 'dark', 'system']);
const VALID_DENSITIES = new Set(['compact', 'comfortable', 'spacious']);
const VALID_CONTRASTS = new Set(['normal', 'high']);

export const DEFAULT_CONFIG = Object.freeze({
  theme: 'system',
  density: 'comfortable',
  contrast: 'normal',
  attribute: 'data-ogve-theme',
  storageKey: 'ogve.theme',
  observeSystemTheme: true,
  respectReducedMotion: true,
  syncMetaThemeColor: true,
  registerBuiltins: true,
  debug: false,
  autoStart: false,
  maxListeners: 100,
  strictLifecycle: true,
  root: null
});

export function validateConfig(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Engine configuration must be a plain object.');
  }

  if ('theme' in options) {
    if (typeof options.theme !== 'string' || (!RESERVED_THEME_MODES.has(options.theme) && !/^[a-z][a-z0-9-]*$/.test(options.theme))) {
      throw new TypeError(`Invalid theme "${options.theme}". Expected "light", "dark", "system", or a kebab-case custom theme name.`);
    }
  }

  if ('density' in options && !VALID_DENSITIES.has(options.density)) {
    throw new TypeError(`Invalid density "${options.density}". Expected "compact", "comfortable", or "spacious".`);
  }

  if ('contrast' in options && !VALID_CONTRASTS.has(options.contrast)) {
    throw new TypeError(`Invalid contrast "${options.contrast}". Expected "normal" or "high".`);
  }

  if ('attribute' in options && (typeof options.attribute !== 'string' || !options.attribute.trim())) {
    throw new TypeError('Config "attribute" must be a non-empty string.');
  }

  if ('storageKey' in options && typeof options.storageKey !== 'string') {
    throw new TypeError('Config "storageKey" must be a string.');
  }

  for (const flag of ['observeSystemTheme', 'respectReducedMotion', 'syncMetaThemeColor', 'registerBuiltins', 'debug', 'autoStart', 'strictLifecycle']) {
    if (flag in options && typeof options[flag] !== 'boolean') {
      throw new TypeError(`Config "${flag}" must be a boolean.`);
    }
  }

  if ('maxListeners' in options) {
    if (!Number.isInteger(options.maxListeners) || options.maxListeners < 1) {
      throw new RangeError('Config "maxListeners" must be a positive integer.');
    }
  }

  if ('root' in options && options.root !== null && typeof options.root !== 'object') {
    throw new TypeError('Config "root" must be a DOM element or null.');
  }

  return true;
}

export function resolveConfig(options = {}) {
  validateConfig(options);
  return { ...DEFAULT_CONFIG, ...options };
}

export function createConfigStore(initialOptions = {}, { events } = {}) {
  const initialSnapshot = Object.freeze(resolveConfig(initialOptions));
  let current = { ...initialSnapshot };

  return {
    get(key) {
      if (typeof key === 'string') return current[key];
      return Object.freeze({ ...current });
    },
    set(patch = {}) {
      validateConfig(patch);
      const previous = Object.freeze({ ...current });
      const changedKeys = [];

      for (const [key, value] of Object.entries(patch)) {
        if (current[key] !== value) {
          current[key] = value;
          changedKeys.push(key);
        }
      }

      const next = Object.freeze({ ...current });
      if (changedKeys.length > 0) {
        events?.emit('configchange', { previous, current: next, changedKeys });
      }
      return { previous, current: next, changedKeys };
    },
    reset() {
      const previous = Object.freeze({ ...current });
      const changedKeys = Object.keys(initialSnapshot).filter(key => current[key] !== initialSnapshot[key]);
      current = { ...initialSnapshot };
      const next = Object.freeze({ ...current });
      if (changedKeys.length > 0) {
        events?.emit('configchange', { previous, current: next, changedKeys });
      }
      return { previous, current: next, changedKeys };
    },
    toJSON() {
      return { ...current };
    }
  };
}
