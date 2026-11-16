export const DEFAULT_CONFIG = Object.freeze({
  theme: 'system',
  attribute: 'data-ogve-theme',
  storageKey: 'ogve.theme',
  observeSystemTheme: true,
  respectReducedMotion: true,
  debug: false
});

export function resolveConfig(options = {}) {
  return { ...DEFAULT_CONFIG, ...options };
}
