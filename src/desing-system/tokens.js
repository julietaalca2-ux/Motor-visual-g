export const designTokens = Object.freeze({
  color: Object.freeze({
    light: Object.freeze({
      background: '#fbf8fc',
      surface: '#ffffff',
      surfaceElevated: '#ffffff',
      surfaceSubtle: '#f3eff6',
      text: '#1b1b1f',
      muted: '#686873',
      border: '#e8e5eb',
      accent: '#1d4ed8',
      accentHover: '#1e40af',
      accentSoft: '#eff4ff',
      accentContrast: '#ffffff',
      success: '#15803d',
      warning: '#b45309',
      danger: '#b91c1c',
      info: '#0369a1',
      focusRing: 'rgba(29, 78, 216, 0.35)'
    }),
    dark: Object.freeze({
      background: '#111116',
      surface: '#1b1b23',
      surfaceElevated: '#23232e',
      surfaceSubtle: '#16161d',
      text: '#f4f2f7',
      muted: '#aaa7b4',
      border: '#34313c',
      accent: '#8ba9ff',
      accentHover: '#a8bfff',
      accentSoft: '#1e2640',
      accentContrast: '#0d111d',
      success: '#4ade80',
      warning: '#fbbf24',
      danger: '#f87171',
      info: '#38bdf8',
      focusRing: 'rgba(139, 169, 255, 0.4)'
    })
  }),
  typography: Object.freeze({
    fontSans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    size: Object.freeze({
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.375rem',
      '2xl': '1.875rem',
      '3xl': '2.75rem'
    }),
    weight: Object.freeze({
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }),
    lineHeight: Object.freeze({
      tight: '1.15',
      normal: '1.55',
      relaxed: '1.7'
    }),
    tracking: Object.freeze({
      tight: '-0.03em',
      normal: '0em',
      wide: '0.08em'
    })
  }),
  radius: Object.freeze({
    sm: '8px',
    md: '14px',
    lg: '22px',
    xl: '28px',
    pill: '999px'
  }),
  space: Object.freeze({
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px'
  }),
  elevation: Object.freeze({
    light: Object.freeze({
      none: 'none',
      sm: '0 2px 8px rgba(17, 17, 22, 0.04)',
      md: '0 8px 28px rgba(17, 17, 22, 0.06)',
      lg: '0 18px 44px rgba(17, 17, 22, 0.10)'
    }),
    dark: Object.freeze({
      none: 'none',
      sm: '0 2px 10px rgba(0, 0, 0, 0.28)',
      md: '0 10px 30px rgba(0, 0, 0, 0.42)',
      lg: '0 20px 50px rgba(0, 0, 0, 0.58)'
    })
  }),
  motion: Object.freeze({
    fast: '120ms',
    normal: '220ms',
    slow: '360ms',
    easingStandard: 'cubic-bezier(0.2, 0, 0, 1)',
    easingDecelerate: 'cubic-bezier(0, 0, 0.2, 1)'
  }),
  zIndex: Object.freeze({
    base: 0,
    dropdown: 100,
    sticky: 200,
    overlay: 300,
    modal: 400,
    toast: 500
  })
});

function toKebabCase(str) {
  return String(str).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function deepMerge(target, source) {
  const output = { ...target };
  if (!source || typeof source !== 'object' || Array.isArray(source)) return output;
  for (const [key, val] of Object.entries(source)) {
    if (val && typeof val === 'object' && !Array.isArray(val) && target[key] && typeof target[key] === 'object') {
      output[key] = deepMerge(target[key], val);
    } else if (val !== undefined) {
      output[key] = val;
    }
  }
  return output;
}

export function createTokenSet(overrides = {}, baseTokens = designTokens) {
  return deepMerge(baseTokens, overrides);
}

export function resolveToken(path, { theme = 'light', tokens = designTokens } = {}) {
  if (typeof path !== 'string' || !path.trim()) return undefined;
  const parts = path.split('.');

  // Support shorthand semantic lookups like 'color.accent' or 'elevation.md'
  if ((parts[0] === 'color' || parts[0] === 'elevation') && parts.length === 2 && parts[1] !== 'light' && parts[1] !== 'dark') {
    const modeBucket = tokens[parts[0]]?.[theme];
    if (modeBucket && parts[1] in modeBucket) return modeBucket[parts[1]];
  }

  let cursor = tokens;
  for (const part of parts) {
    if (cursor == null || typeof cursor !== 'object') return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

export function tokensToCssVars(tokens = designTokens, { theme = 'light', prefix = '--ogve' } = {}) {
  const vars = {};
  const colorPalette = tokens.color?.[theme] ?? tokens.color?.light ?? {};
  for (const [key, value] of Object.entries(colorPalette)) {
    vars[`${prefix}-color-${toKebabCase(key)}`] = String(value);
  }

  const elevationPalette = tokens.elevation?.[theme] ?? tokens.elevation?.light ?? {};
  for (const [key, value] of Object.entries(elevationPalette)) {
    vars[`${prefix}-shadow-${toKebabCase(key)}`] = String(value);
  }

  if (tokens.typography) {
    if (tokens.typography.fontSans) vars[`${prefix}-font-sans`] = String(tokens.typography.fontSans);
    if (tokens.typography.fontMono) vars[`${prefix}-font-mono`] = String(tokens.typography.fontMono);
    for (const [group, prefixPart] of [
      ['size', 'text'],
      ['weight', 'font-weight'],
      ['lineHeight', 'leading'],
      ['tracking', 'tracking']
    ]) {
      const bucket = tokens.typography[group];
      if (bucket && typeof bucket === 'object') {
        for (const [k, v] of Object.entries(bucket)) {
          vars[`${prefix}-${prefixPart}-${toKebabCase(k)}`] = String(v);
        }
      }
    }
  }

  for (const [group, prefixPart] of [
    ['radius', 'radius'],
    ['space', 'space'],
    ['motion', 'motion'],
    ['zIndex', 'z']
  ]) {
    const bucket = tokens[group];
    if (bucket && typeof bucket === 'object') {
      for (const [k, v] of Object.entries(bucket)) {
        vars[`${prefix}-${prefixPart}-${toKebabCase(k)}`] = String(v);
      }
    }
  }

  return vars;
}

export function formatCssRule(selector, varsMap) {
  const declarations = Object.entries(varsMap)
    .map(([prop, val]) => `  ${prop}: ${val};`)
    .join('\n');
  return `${selector} {\n${declarations}\n}`;
}
