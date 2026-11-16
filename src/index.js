import { resolveConfig } from './core/config.js';
import { createEventBus } from './core/events.js';
import { createThemeController } from './design-system/theme.js';
import { createComponentRegistry } from './components/registry.js';
import { renderContent } from './rendering/render.js';
import { setLoading as applyLoading } from './loading/loading.js';

export function createVisualEngine(options = {}) {
  const config = resolveConfig(options);
  const events = createEventBus();
  const components = createComponentRegistry();
  const theme = createThemeController({
    attribute: config.attribute,
    storageKey: config.storageKey,
    initial: config.theme,
    observeSystem: config.observeSystemTheme,
    events
  });
  let started = false;

  return {
    version: '0.1.0',
    start() {
      if (started) return this;
      started = true;
      const activeTheme = theme.apply();
      events.emit('ready', { version: this.version, theme: activeTheme });
      return this;
    },
    destroy() {
      if (!started) return;
      theme.destroy();
      events.emit('destroy', {});
      events.clear();
      started = false;
    },
    setTheme(value) { return theme.set(value); },
    getTheme() { return theme.get(); },
    on: events.on,
    emit: events.emit,
    registerComponent: components.register,
    createComponent: components.create,
    getComponents: components.list,
    render: renderContent,
    setLoading: applyLoading
  };
}

export { designTokens } from './design-system/tokens.js';
export { prefersReducedMotion, motionDuration } from './motion/motion.js';
export { delegate } from './interactions/delegation.js';
export { measure } from './performance/measure.js';
