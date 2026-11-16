const VALID_THEMES = new Set(['light', 'dark', 'system']);

export function createThemeController({ root = globalThis.document?.documentElement, attribute = 'data-ogve-theme', storageKey = 'ogve.theme', initial = 'system', observeSystem = true, events } = {}) {
  let preference = VALID_THEMES.has(initial) ? initial : 'system';
  let media;
  let mediaHandler;

  try {
    const saved = globalThis.localStorage?.getItem(storageKey);
    if (VALID_THEMES.has(saved)) preference = saved;
  } catch { /* Storage may be unavailable in private or restricted contexts. */ }

  const systemTheme = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const resolved = () => preference === 'system' ? systemTheme() : preference;
  const apply = () => {
    const theme = resolved();
    root?.setAttribute(attribute, theme);
    root?.style.setProperty('color-scheme', theme);
    events?.emit('themechange', { preference, theme });
    return theme;
  };

  if (observeSystem && globalThis.matchMedia) {
    media = globalThis.matchMedia('(prefers-color-scheme: dark)');
    mediaHandler = () => { if (preference === 'system') apply(); };
    media.addEventListener?.('change', mediaHandler);
  }

  return {
    set(value) {
      if (!VALID_THEMES.has(value)) throw new TypeError(`Unknown theme: ${value}`);
      preference = value;
      try { globalThis.localStorage?.setItem(storageKey, value); } catch { /* Ignore storage errors. */ }
      return apply();
    },
    get() { return { preference, theme: resolved() }; },
    apply,
    destroy() { if (media && mediaHandler) media.removeEventListener?.('change', mediaHandler); }
  };
}
