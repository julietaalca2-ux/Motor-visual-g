import { designTokens, createTokenSet, resolveToken, tokensToCssVars } from './tokens.js';
import { BUILT_IN_THEME_PRESETS } from './presets.js';

const BASE_MODES = new Set(['light', 'dark', 'system']);
const VALID_DENSITIES = new Set(['compact', 'comfortable', 'spacious']);
const VALID_CONTRASTS = new Set(['normal', 'high']);

export function createThemeController({
  root = globalThis.document?.documentElement,
  attribute = 'data-ogve-theme',
  densityAttribute = 'data-ogve-density',
  contrastAttribute = 'data-ogve-contrast',
  storageKey = 'ogve.theme',
  initial = 'system',
  density = 'comfortable',
  contrast = 'normal',
  observeSystem = true,
  syncMetaThemeColor = true,
  presets = BUILT_IN_THEME_PRESETS,
  events
} = {}) {
  const customThemes = new Map();
  let tokenOverrides = {};
  let appliedCustomVars = new Set();
  let currentDensity = VALID_DENSITIES.has(density) ? density : 'comfortable';
  let currentContrast = VALID_CONTRASTS.has(contrast) ? contrast : 'normal';
  let media;
  let mediaHandler;

  const isKnownTheme = (value) => BASE_MODES.has(value) || customThemes.has(value);

  const registerTheme = (name, definition = {}) => {
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new TypeError('Custom theme name must be kebab-case (e.g. "midnight", "warm-paper").');
    }
    if (BASE_MODES.has(name)) {
      throw new TypeError(`Cannot override reserved theme mode "${name}".`);
    }
    const base = definition.base === 'dark' ? 'dark' : 'light';
    const record = Object.freeze({
      name,
      label: definition.label ?? name,
      base,
      tokens: definition.tokens ?? {}
    });
    customThemes.set(name, record);
    events?.emit('themeregistered', { name: record.name, label: record.label, base: record.base });
    return record;
  };

  if (presets && typeof presets === 'object') {
    for (const [presetName, presetDef] of Object.entries(presets)) {
      if (!BASE_MODES.has(presetName)) {
        registerTheme(presetName, presetDef);
      }
    }
  }

  let preference = isKnownTheme(initial) ? initial : 'system';

  try {
    const saved = globalThis.localStorage?.getItem(storageKey);
    if (isKnownTheme(saved)) preference = saved;
  } catch { /* Storage may be unavailable in private or restricted contexts. */ }

  const systemTheme = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const resolveState = () => {
    if (preference === 'system') {
      const sys = systemTheme();
      return { preference, theme: sys, colorScheme: sys, isCustom: false };
    }
    if (customThemes.has(preference)) {
      const custom = customThemes.get(preference);
      return { preference, theme: custom.name, colorScheme: custom.base, isCustom: true };
    }
    return { preference, theme: preference, colorScheme: preference, isCustom: false };
  };

  const getEffectiveTokens = () => {
    const { theme, colorScheme } = resolveState();
    const customDef = customThemes.get(theme);
    let merged = designTokens;
    if (customDef?.tokens) {
      merged = createTokenSet(customDef.tokens, merged);
    }
    if (tokenOverrides && Object.keys(tokenOverrides).length > 0) {
      merged = createTokenSet(tokenOverrides, merged);
    }
    return { tokens: merged, colorScheme };
  };

  const syncInlineCssVars = () => {
    if (!root?.style) return;
    const { theme, colorScheme, isCustom } = resolveState();
    const hasOverrides = Object.keys(tokenOverrides).length > 0;

    if (!isCustom && !hasOverrides) {
      for (const prop of appliedCustomVars) {
        root.style.removeProperty(prop);
      }
      appliedCustomVars.clear();
      return;
    }

    const { tokens } = getEffectiveTokens();
    const nextVars = tokensToCssVars(tokens, { theme: colorScheme });

    for (const prop of appliedCustomVars) {
      if (!(prop in nextVars)) {
        root.style.removeProperty(prop);
      }
    }

    const nextSet = new Set();
    for (const [prop, val] of Object.entries(nextVars)) {
      root.style.setProperty(prop, val);
      nextSet.add(prop);
    }
    appliedCustomVars = nextSet;
  };

  const syncMetaColor = (backgroundHex) => {
    if (!syncMetaThemeColor || !globalThis.document?.querySelector || !backgroundHex) return;
    const meta = globalThis.document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', backgroundHex);
  };

  const applyDensity = () => {
    root?.setAttribute(densityAttribute, currentDensity);
    return currentDensity;
  };

  const applyContrast = () => {
    root?.setAttribute(contrastAttribute, currentContrast);
    return currentContrast;
  };

  const apply = () => {
    const state = resolveState();
    root?.setAttribute(attribute, state.theme);
    root?.setAttribute('data-ogve-color-scheme', state.colorScheme);
    root?.style?.setProperty('color-scheme', state.colorScheme);
    applyDensity();
    applyContrast();
    syncInlineCssVars();

    const { tokens } = getEffectiveTokens();
    const bg = resolveToken('color.background', { theme: state.colorScheme, tokens });
    syncMetaColor(bg);

    events?.emit('themechange', {
      preference: state.preference,
      theme: state.theme,
      colorScheme: state.colorScheme,
      isCustom: state.isCustom
    });
    return state.theme;
  };

  if (observeSystem && globalThis.matchMedia) {
    media = globalThis.matchMedia('(prefers-color-scheme: dark)');
    mediaHandler = () => { if (preference === 'system') apply(); };
    media.addEventListener?.('change', mediaHandler);
  }

  return {
    set(value) {
      if (!isKnownTheme(value)) throw new TypeError(`Unknown theme: ${value}`);
      preference = value;
      try { globalThis.localStorage?.setItem(storageKey, value); } catch { /* Ignore storage errors. */ }
      return apply();
    },
    get() {
      return resolveState();
    },
    registerTheme,
    getThemes() {
      return ['light', 'dark', 'system', ...customThemes.keys()];
    },
    setTokens(overrides = {}) {
      if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
        throw new TypeError('Token overrides must be a plain object.');
      }
      tokenOverrides = createTokenSet(overrides, tokenOverrides);
      apply();
      const effective = getEffectiveTokens().tokens;
      events?.emit('tokenschange', { overrides: tokenOverrides, tokens: effective });
      return effective;
    },
    resetTokens() {
      tokenOverrides = {};
      apply();
      const effective = getEffectiveTokens().tokens;
      events?.emit('tokenschange', { overrides: tokenOverrides, tokens: effective });
      return effective;
    },
    setAccent(accent, { hover, soft, contrast: accentContrast } = {}) {
      if (typeof accent !== 'string' || !accent.trim()) {
        throw new TypeError('Accent color must be a non-empty CSS color string.');
      }
      const patch = {
        accent,
        ...(hover ? { accentHover: hover } : { accentHover: accent }),
        ...(soft ? { accentSoft: soft } : {}),
        ...(accentContrast ? { accentContrast } : {})
      };
      return this.setTokens({
        color: {
          light: patch,
          dark: patch
        }
      });
    },
    getToken(path) {
      const { tokens, colorScheme } = getEffectiveTokens();
      return resolveToken(path, { theme: colorScheme, tokens });
    },
    getTokens() {
      return getEffectiveTokens().tokens;
    },
    setDensity(value) {
      if (!VALID_DENSITIES.has(value)) {
        throw new TypeError(`Unknown density "${value}". Expected "compact", "comfortable", or "spacious".`);
      }
      currentDensity = value;
      applyDensity();
      events?.emit('densitychange', { density: currentDensity });
      return currentDensity;
    },
    getDensity() {
      return currentDensity;
    },
    setContrast(value) {
      if (!VALID_CONTRASTS.has(value)) {
        throw new TypeError(`Unknown contrast "${value}". Expected "normal" or "high".`);
      }
      currentContrast = value;
      applyContrast();
      events?.emit('contrastchange', { contrast: currentContrast });
      return currentContrast;
    },
    getContrast() {
      return currentContrast;
    },
    apply,
    destroy() {
      if (media && mediaHandler) media.removeEventListener?.('change', mediaHandler);
      if (root?.style) {
        for (const prop of appliedCustomVars) {
          root.style.removeProperty(prop);
        }
      }
      appliedCustomVars.clear();
    }
  };
}
