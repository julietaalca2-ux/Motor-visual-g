# ÖG Visual Engine — Fase 2: Design System & Adaptive Themes

Documentación técnica del sistema de diseño, tokens semánticos y motor de temas adaptativos implementados en la Fase 2.

## 1. Arquitectura (`src/design-system/` y `themes/`)

- `src/design-system/tokens.js`: Escalas inmutables (`color.light`, `color.dark`, `typography`, `radius`, `space`, `elevation`, `motion`, `zIndex`) junto con utilidades puras (`createTokenSet`, `resolveToken`, `tokensToCssVars`, `formatCssRule`).
- `src/design-system/presets.js`: Presets integrados (`midnight` y `warm-paper`) listos para uso inmediato o extensión.
- `src/design-system/theme.js`: Controlador adaptativo (`createThemeController`) que sincroniza atributos DOM (`data-ogve-theme`, `data-ogve-color-scheme`, `data-ogve-density`, `data-ogve-contrast`), variables CSS en tiempo real, persistencia en `localStorage`, preferencia del sistema operativo y `meta[name="theme-color"]`.
- `themes/tokens.css` y `themes/presets.css`: Definición declarativa en CSS de todas las variables `--ogve-*` para temas base, presets, escalas de densidad (`compact`, `comfortable`, `spacious`) y alto contraste (`high`).

## 2. API Pública del Design System

```js
import { createVisualEngine } from '../src/index.js';

const engine = createVisualEngine({ theme: 'system' }).start();

// Temas base y presets
engine.setTheme('midnight');
engine.getTheme(); // { preference: 'midnight', theme: 'midnight', colorScheme: 'dark', isCustom: true }
engine.getThemes(); // ['light', 'dark', 'system', 'midnight', 'warm-paper']

// Registro de temas personalizados
engine.registerTheme('brand-night', {
  base: 'dark',
  label: 'Brand Night',
  tokens: {
    color: {
      dark: { background: '#090d16', accent: '#38bdf8' }
    }
  }
});

// Tokens dinámicos y acento en tiempo de ejecución
engine.setAccent('#7c3aed', { soft: '#f5f3ff', contrast: '#ffffff' });
engine.getToken('color.accent'); // '#7c3aed'
engine.resetTokens();

// Ergonomía visual
engine.setDensity('compact'); // 'compact' | 'comfortable' | 'spacious'
engine.setContrast('high');   // 'normal' | 'high'
```
