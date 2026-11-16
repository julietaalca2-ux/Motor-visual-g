export const BUILT_IN_THEME_PRESETS = Object.freeze({
  midnight: Object.freeze({
    name: 'midnight',
    label: 'Midnight OLED',
    base: 'dark',
    tokens: Object.freeze({
      color: Object.freeze({
        dark: Object.freeze({
          background: '#08080c',
          surface: '#111118',
          surfaceElevated: '#181822',
          surfaceSubtle: '#0d0d13',
          text: '#f8fafc',
          muted: '#94a3b8',
          border: '#242636',
          accent: '#818cf8',
          accentHover: '#a5b4fc',
          accentSoft: '#191d38',
          accentContrast: '#090a14',
          focusRing: 'rgba(129, 140, 248, 0.42)'
        })
      })
    })
  }),
  'warm-paper': Object.freeze({
    name: 'warm-paper',
    label: 'Warm Paper',
    base: 'light',
    tokens: Object.freeze({
      color: Object.freeze({
        light: Object.freeze({
          background: '#faf7f2',
          surface: '#fffdf9',
          surfaceElevated: '#ffffff',
          surfaceSubtle: '#f2ece1',
          text: '#1f1c18',
          muted: '#6e6559',
          border: '#e5ddd0',
          accent: '#b45309',
          accentHover: '#92400e',
          accentSoft: '#fef3c7',
          accentContrast: '#ffffff',
          focusRing: 'rgba(180, 83, 9, 0.32)'
        })
      })
    })
  })
});

export function getThemePreset(name) {
  return BUILT_IN_THEME_PRESETS[name] ?? null;
}
