import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVisualEngine,
  designTokens,
  createTokenSet,
  resolveToken,
  tokensToCssVars,
  formatCssRule,
  BUILT_IN_THEME_PRESETS,
  getThemePreset,
  createThemeController
} from '../src/index.js';
import { createEventBus } from '../src/core/events.js';

function createMockRoot() {
  const attrs = new Map();
  const styles = new Map();
  return {
    attrs,
    styles,
    setAttribute(k, v) { attrs.set(k, String(v)); },
    getAttribute(k) { return attrs.get(k) ?? null; },
    removeAttribute(k) { attrs.delete(k); },
    style: {
      setProperty(k, v) { styles.set(k, String(v)); },
      getPropertyValue(k) { return styles.get(k) ?? ''; },
      removeProperty(k) { styles.delete(k); }
    }
  };
}

test('design tokens resolve semantic and scale paths and generate CSS variables', () => {
  assert.equal(resolveToken('color.background', { theme: 'light' }), designTokens.color.light.background);
  assert.equal(resolveToken('color.background', { theme: 'dark' }), designTokens.color.dark.background);
  assert.equal(resolveToken('space.4'), '16px');
  assert.equal(resolveToken('radius.lg'), '22px');
  assert.equal(resolveToken('typography.size.md'), '1rem');

  const customTokens = createTokenSet({
    color: { light: { accent: '#059669' } }
  });
  assert.equal(resolveToken('color.accent', { theme: 'light', tokens: customTokens }), '#059669');
  assert.equal(resolveToken('color.background', { theme: 'light', tokens: customTokens }), designTokens.color.light.background);

  const vars = tokensToCssVars(customTokens, { theme: 'light' });
  assert.equal(vars['--ogve-color-accent'], '#059669');
  assert.equal(vars['--ogve-radius-md'], '14px');
  assert.equal(vars['--ogve-space-4'], '16px');

  const cssRule = formatCssRule(':root', { '--ogve-color-accent': '#059669' });
  assert.ok(cssRule.includes(':root {'));
  assert.ok(cssRule.includes('--ogve-color-accent: #059669;'));
});

test('presets module provides midnight and warm-paper themes', () => {
  assert.ok(BUILT_IN_THEME_PRESETS.midnight);
  assert.equal(getThemePreset('midnight').base, 'dark');
  assert.equal(getThemePreset('warm-paper').base, 'light');
  assert.equal(getThemePreset('unknown'), null);
});

test('theme controller manages built-in modes, custom themes, token overrides, density, and contrast', () => {
  const root = createMockRoot();
  const bus = createEventBus();
  const eventsLog = [];
  bus.onAny((name, detail) => eventsLog.push({ name, detail }));

  const ctrl = createThemeController({
    root,
    initial: 'light',
    observeSystem: false,
    syncMetaThemeColor: false,
    events: bus
  });

  ctrl.apply();
  assert.equal(root.getAttribute('data-ogve-theme'), 'light');
  assert.equal(root.getAttribute('data-ogve-color-scheme'), 'light');
  assert.equal(root.getAttribute('data-ogve-density'), 'comfortable');
  assert.equal(root.getAttribute('data-ogve-contrast'), 'normal');

  // Switch to built-in custom theme preset
  ctrl.set('midnight');
  assert.equal(root.getAttribute('data-ogve-theme'), 'midnight');
  assert.equal(root.getAttribute('data-ogve-color-scheme'), 'dark');
  assert.equal(root.styles.get('--ogve-color-background'), '#08080c');

  // Switch back to standard dark theme and ensure custom inline vars are cleaned up
  ctrl.set('dark');
  assert.equal(root.getAttribute('data-ogve-theme'), 'dark');
  assert.equal(root.styles.has('--ogve-color-background'), false);

  // Register custom user theme
  ctrl.registerTheme('ocean', {
    base: 'dark',
    label: 'Oceanic',
    tokens: { color: { dark: { accent: '#38bdf8' } } }
  });
  ctrl.set('ocean');
  assert.equal(ctrl.get().theme, 'ocean');
  assert.equal(ctrl.get().isCustom, true);
  assert.equal(ctrl.getToken('color.accent'), '#38bdf8');

  // Accent override & reset
  ctrl.setAccent('#e11d48');
  assert.equal(ctrl.getToken('color.accent'), '#e11d48');
  ctrl.resetTokens();
  assert.equal(ctrl.getToken('color.accent'), '#38bdf8');

  // Density & contrast
  ctrl.setDensity('compact');
  assert.equal(root.getAttribute('data-ogve-density'), 'compact');
  ctrl.setContrast('high');
  assert.equal(root.getAttribute('data-ogve-contrast'), 'high');

  ctrl.destroy();
  assert.ok(eventsLog.some(e => e.name === 'themechange'));
  assert.ok(eventsLog.some(e => e.name === 'densitychange'));
  assert.ok(eventsLog.some(e => e.name === 'contrastchange'));
});

test('createVisualEngine integrates Fase 2 design system API end-to-end', () => {
  const root = createMockRoot();
  const engine = createVisualEngine({
    root,
    theme: 'warm-paper',
    density: 'spacious',
    contrast: 'high',
    observeSystemTheme: false,
    syncMetaThemeColor: false
  }).start();

  assert.equal(engine.version, '0.6.0');
  assert.equal(engine.getTheme().theme, 'warm-paper');
  assert.equal(engine.getTheme().colorScheme, 'light');
  assert.equal(engine.getDensity(), 'spacious');
  assert.equal(engine.getContrast(), 'high');
  assert.equal(engine.getToken('color.accent'), '#b45309');

  engine.setAccent('#10b981');
  assert.equal(engine.getToken('color.accent'), '#10b981');

  const snapshot = engine.inspect();
  assert.equal(snapshot.density, 'spacious');
  assert.equal(snapshot.contrast, 'high');
  assert.ok(snapshot.registeredThemes.includes('midnight'));
  assert.ok(snapshot.registeredThemes.includes('warm-paper'));

  engine.destroy();
});
