import { createCoreEngine } from './core/engine.js';

export function createVisualEngine(options = {}) {
  return createCoreEngine(options);
}

export { ENGINE_VERSION, createCoreEngine } from './core/engine.js';
export { DEFAULT_CONFIG, resolveConfig, validateConfig, createConfigStore } from './core/config.js';
export { createEventBus } from './core/events.js';
export { createLifecycleManager, LIFECYCLE_STATES, LIFECYCLE_PHASES } from './core/lifecycle.js';
export { createModuleRegistry } from './core/modules.js';
export { designTokens, createTokenSet, resolveToken, tokensToCssVars, formatCssRule } from './design-system/tokens.js';
export { BUILT_IN_THEME_PRESETS, getThemePreset } from './design-system/presets.js';
export { createThemeController } from './design-system/theme.js';
export { createComponentRegistry } from './components/registry.js';
export { prefersReducedMotion, motionDuration } from './motion/motion.js';
export { delegate } from './interactions/delegation.js';
export { renderContent } from './rendering/render.js';
export { setLoading } from './loading/loading.js';
export { measure } from './performance/measure.js';
