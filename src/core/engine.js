import { createConfigStore } from './config.js';
import { createEventBus } from './events.js';
import { createLifecycleManager } from './lifecycle.js';
import { createModuleRegistry } from './modules.js';
import { designTokens } from '../design-system/tokens.js';
import { createThemeController } from '../design-system/theme.js';
import { createComponentRegistry } from '../components/registry.js';
import { registerBuiltInComponents } from '../components/primitives.js';
import { renderContent } from '../rendering/render.js';
import { setLoading as applyLoading } from '../loading/loading.js';
import {
  prefersReducedMotion,
  motionDuration,
  createMotionController
} from '../motion/motion.js';
import { delegate } from '../interactions/delegation.js';
import { createInteractionController } from '../interactions/interactions.js';
import { measure } from '../performance/measure.js';

export const ENGINE_VERSION = '0.4.0';

export function createCoreEngine(options = {}) {
  let events = createEventBus({
    maxListeners: options.maxListeners ?? 100
  });

  const configStore = createConfigStore(options, { events });
  const initialConfig = configStore.get();

  const lifecycle = createLifecycleManager({
    events,
    strict: initialConfig.strictLifecycle,
    getPayload: () => ({
      version: ENGINE_VERSION,
      theme: themeController?.get().theme ?? initialConfig.theme
    })
  });

  let themeController = null;

  const ensureThemeController = () => {
    if (!themeController) {
      const cfg = configStore.get();
      themeController = createThemeController({
        root: cfg.root ?? globalThis.document?.documentElement,
        attribute: cfg.attribute,
        storageKey: cfg.storageKey,
        initial: cfg.theme,
        density: cfg.density,
        contrast: cfg.contrast,
        observeSystem: cfg.observeSystemTheme,
        syncMetaThemeColor: cfg.syncMetaThemeColor,
        events
      });
    }
    return themeController;
  };

  const motionController = createMotionController({
    events,
    getConfig: () => configStore.get()
  });

  const interactionController = createInteractionController({
    events
  });

  const componentRegistry = createComponentRegistry({
    events,
    getContext: () => ({
      version: ENGINE_VERSION,
      events,
      config: configStore.get(),
      tokens: themeController?.getTokens() ?? designTokens,
      createComponent: (name, props) => componentRegistry.create(name, props),
      animate: motionController.animate,
      delegate,
      trackPress: interactionController.trackPress
    })
  });

  if (initialConfig.registerBuiltins) {
    registerBuiltInComponents(componentRegistry);
  }

  const getModuleContext = (moduleName) => ({
    moduleName,
    version: ENGINE_VERSION,
    config: configStore.get(),
    events,
    lifecycle: {
      getState: lifecycle.getState,
      isReady: lifecycle.isReady,
      isPaused: lifecycle.isPaused
    },
    getModule: (name) => modules.get(name),
    hasModule: (name) => modules.has(name),
    tokens: themeController?.getTokens() ?? designTokens
  });

  const modules = createModuleRegistry({
    events,
    getContext: getModuleContext
  });

  const registerBuiltinModules = () => {
    modules.register({
      name: 'theme',
      version: ENGINE_VERSION,
      init() {
        ensureThemeController();
      },
      start() {
        ensureThemeController().apply();
      },
      destroy() {
        themeController?.destroy();
        themeController = null;
      },
      api: () => ({
        set: (value) => engine.setTheme(value),
        get: () => engine.getTheme(),
        registerTheme: (name, def) => engine.registerTheme(name, def),
        getThemes: () => engine.getThemes(),
        setTokens: (overrides) => engine.setTokens(overrides),
        resetTokens: () => engine.resetTokens(),
        getToken: (path) => engine.getToken(path),
        getTokens: () => engine.getTokens(),
        setAccent: (accent, variants) => engine.setAccent(accent, variants),
        setDensity: (density) => engine.setDensity(density),
        getDensity: () => engine.getDensity(),
        setContrast: (contrast) => engine.setContrast(contrast),
        getContrast: () => engine.getContrast(),
        apply: () => ensureThemeController().apply()
      })
    });

    modules.register({
      name: 'components',
      version: ENGINE_VERSION,
      destroy() {
        componentRegistry.unmountAll();
      },
      api: {
        register: componentRegistry.register,
        unregister: componentRegistry.unregister,
        create: componentRegistry.create,
        mount: componentRegistry.mount,
        update: componentRegistry.update,
        unmount: componentRegistry.unmount,
        unmountAll: componentRegistry.unmountAll,
        hydrate: componentRegistry.hydrate,
        has: componentRegistry.has,
        list: componentRegistry.list,
        describe: componentRegistry.describe,
        getInstances: componentRegistry.getInstances
      }
    });

    modules.register({
      name: 'renderer',
      version: ENGINE_VERSION,
      api: {
        render: renderContent
      }
    });

    modules.register({
      name: 'loading',
      version: ENGINE_VERSION,
      api: {
        set: applyLoading
      }
    });

    modules.register({
      name: 'motion',
      version: ENGINE_VERSION,
      pause() {
        motionController.cancelAll();
      },
      destroy() {
        motionController.cancelAll();
      },
      api: {
        prefersReducedMotion,
        duration: motionDuration,
        animate: motionController.animate,
        transition: motionController.transition,
        stagger: motionController.stagger,
        registerPreset: motionController.registerPreset,
        getPreset: motionController.getPreset,
        getPresets: motionController.getPresets,
        cancelAll: motionController.cancelAll,
        getActiveCount: motionController.getActiveCount
      }
    });

    modules.register({
      name: 'interactions',
      version: ENGINE_VERSION,
      destroy() {
        interactionController.destroyAll();
      },
      api: {
        delegate,
        onAction: interactionController.onAction,
        bindShortcuts: interactionController.bindShortcuts,
        observeViewport: interactionController.observeViewport,
        trackPress: interactionController.trackPress,
        bindGesture: interactionController.bindGesture,
        destroyAll: interactionController.destroyAll,
        getActiveBindingsCount: interactionController.getActiveBindingsCount
      }
    });

    modules.register({
      name: 'performance',
      version: ENGINE_VERSION,
      api: {
        measure
      }
    });
  };

  registerBuiltinModules();

  events.on('configchange', ({ current, changedKeys }) => {
    if (changedKeys.includes('theme') && themeController) {
      themeController.set(current.theme);
    }
    if (changedKeys.includes('density') && themeController) {
      themeController.setDensity(current.density);
    }
    if (changedKeys.includes('contrast') && themeController) {
      themeController.setContrast(current.contrast);
    }
    if (current.debug && globalThis.console?.debug) {
      globalThis.console.debug('[ÖG Visual Engine] Configuration updated:', changedKeys, current);
    }
  });

  lifecycle.onHook('beforeStart', () => {
    modules.initAll();
  });

  lifecycle.onHook('start', () => {
    modules.startAll();
  });

  lifecycle.onHook('pause', () => {
    modules.pauseAll();
  });

  lifecycle.onHook('resume', () => {
    modules.resumeAll();
  });

  lifecycle.onHook('destroy', () => {
    modules.destroyAll();
  });

  const engine = {
    version: ENGINE_VERSION,
    tokens: designTokens,

    // Lifecycle API
    start() {
      if (lifecycle.isDestroyed()) {
        events = createEventBus({ maxListeners: configStore.get('maxListeners') });
      }
      lifecycle.start();
      return engine;
    },
    pause() {
      lifecycle.pause();
      return engine;
    },
    resume() {
      lifecycle.resume();
      return engine;
    },
    restart() {
      if (lifecycle.isDestroyed()) {
        events = createEventBus({ maxListeners: configStore.get('maxListeners') });
      }
      lifecycle.restart();
      return engine;
    },
    destroy() {
      const destroyed = lifecycle.destroy();
      if (destroyed) {
        events.clear();
      }
      return destroyed;
    },
    getState() {
      return lifecycle.getState();
    },
    isReady() {
      return lifecycle.isReady();
    },
    getMetrics() {
      return lifecycle.getMetrics();
    },
    onLifecycle(phase, handler) {
      return lifecycle.onHook(phase, handler);
    },

    // Configuration API
    getConfig(key) {
      return configStore.get(key);
    },
    configure(patch) {
      return configStore.set(patch);
    },
    resetConfig() {
      return configStore.reset();
    },

    // Event System API
    on(name, callback) {
      return events.on(name, callback);
    },
    once(name, callback) {
      return events.once(name, callback);
    },
    off(name, callback) {
      return events.off(name, callback);
    },
    onAny(callback) {
      return events.onAny(callback);
    },
    emit(name, detail) {
      return events.emit(name, detail);
    },
    emitAsync(name, detail) {
      return events.emitAsync(name, detail);
    },
    listenerCount(name) {
      return events.listenerCount(name);
    },
    eventNames() {
      return events.eventNames();
    },

    // Module Registry API
    use(definition, opts) {
      modules.register(definition, opts);
      return engine;
    },
    registerModule(definition, opts) {
      return modules.register(definition, opts);
    },
    unregisterModule(name, opts) {
      return modules.unregister(name, opts);
    },
    getModule(name) {
      return modules.get(name);
    },
    hasModule(name) {
      return modules.has(name);
    },
    getModules() {
      return modules.list();
    },

    // Design System & Adaptive Themes API
    setTheme(value) {
      return ensureThemeController().set(value);
    },
    getTheme() {
      return ensureThemeController().get();
    },
    registerTheme(name, definition) {
      return ensureThemeController().registerTheme(name, definition);
    },
    getThemes() {
      return ensureThemeController().getThemes();
    },
    setTokens(overrides) {
      return ensureThemeController().setTokens(overrides);
    },
    resetTokens() {
      return ensureThemeController().resetTokens();
    },
    getToken(path) {
      return ensureThemeController().getToken(path);
    },
    getTokens() {
      return ensureThemeController().getTokens();
    },
    setAccent(accent, variants) {
      return ensureThemeController().setAccent(accent, variants);
    },
    setDensity(value) {
      return ensureThemeController().setDensity(value);
    },
    getDensity() {
      return ensureThemeController().getDensity();
    },
    setContrast(value) {
      return ensureThemeController().setContrast(value);
    },
    getContrast() {
      return ensureThemeController().getContrast();
    },

    // Component Engine API
    registerComponent: componentRegistry.register,
    unregisterComponent: componentRegistry.unregister,
    createComponent: componentRegistry.create,
    mountComponent: componentRegistry.mount,
    updateComponent: componentRegistry.update,
    unmountComponent: componentRegistry.unmount,
    hydrateComponents: componentRegistry.hydrate,
    hasComponent: componentRegistry.has,
    getComponents: componentRegistry.list,
    describeComponent: componentRegistry.describe,
    getComponentInstances: componentRegistry.getInstances,

    // Motion Engine API
    prefersReducedMotion,
    motionDuration,
    animate: motionController.animate,
    transition: motionController.transition,
    stagger: motionController.stagger,
    registerMotionPreset: motionController.registerPreset,
    getMotionPreset: motionController.getPreset,
    getMotionPresets: motionController.getPresets,
    cancelAnimations: motionController.cancelAll,

    // Interaction Engine API
    delegate,
    onAction: interactionController.onAction,
    bindShortcuts: interactionController.bindShortcuts,
    observeViewport: interactionController.observeViewport,
    trackPress: interactionController.trackPress,
    bindGesture: interactionController.bindGesture,

    // Rendering & Loading API
    render: renderContent,
    setLoading: applyLoading,

    // Performance Utility
    measure,

    // Diagnostics & Introspection
    inspect() {
      const ctrl = ensureThemeController();
      return Object.freeze({
        version: ENGINE_VERSION,
        state: lifecycle.getState(),
        metrics: lifecycle.getMetrics(),
        config: configStore.get(),
        theme: ctrl.get(),
        registeredThemes: ctrl.getThemes(),
        density: ctrl.getDensity(),
        contrast: ctrl.getContrast(),
        modules: modules.inspect(),
        components: componentRegistry.list(),
        mountedComponents: componentRegistry.getInstances(),
        motion: {
          presets: motionController.getPresets(),
          activeAnimations: motionController.getActiveCount(),
          reducedMotion: prefersReducedMotion()
        },
        interactions: {
          activeBindings: interactionController.getActiveBindingsCount()
        },
        events: {
          activeChannels: events.eventNames(),
          listenerCount: events.listenerCount()
        }
      });
    }
  };

  if (initialConfig.autoStart) {
    engine.start();
  }

  return engine;
}
