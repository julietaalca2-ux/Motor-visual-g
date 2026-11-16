# ÖG Visual Engine

Motor visual independiente, modular y adaptable para aplicaciones web. Construido sin dependencias de ÖG Social ni de frameworks externos.

## Requisitos
- Node.js 18 o superior (solo para ejecutar las pruebas).
- Navegador moderno para usarlo directamente mediante módulos ES.

## Estructura
- `src/core`: núcleo del motor (`config.js`, `events.js`, `lifecycle.js`, `modules.js`, `engine.js`).
- `src/design-system`: tokens semánticos (`tokens.js`), presets (`presets.js`) y controlador adaptativo de temas (`theme.js`).
- `src/components`: constructores DOM seguros (`dom.js`), registro con ciclo de vida (`registry.js`), primitivas nativas (`primitives.js`) y estilos (`components.css`).
- `src/motion`: presets de movimiento, curvas de aceleración y controlador de animaciones (`motion.js`).
- `src/interactions`: delegación de eventos (`delegation.js`) y controlador de acciones, atajos, visibilidad y gestos (`interactions.js`).
- `src/rendering`: renderizado seguro de nodos DOM.
- `src/loading`: estados de carga accesibles.
- `src/performance`: medición ligera de rendimiento.
- `themes`: hojas de estilo de tokens base (`tokens.css`) y presets (`presets.css`).
- `examples`: demos independientes en HTML/JS vanilla.
- `docs`: documentación técnica por fase (`CORE-ENGINE.md`, `DESIGN-SYSTEM.md`, `COMPONENT-ENGINE.md`, `MOTION-INTERACTIONS.md`).
- `tests`: suite de pruebas automatizadas con `node:test`.

## Inicio rápido

```js
import { createVisualEngine } from './src/index.js';
import './src/styles.css';

const engine = createVisualEngine({ theme: 'system' }).start();

const card = engine.mountComponent('og-card', document.querySelector('#app'), {
  eyebrow: 'BIENVENIDO',
  title: 'ÖG Visual Engine',
  body: 'Componentes modulares, movimiento adaptativo y temas listos para producción.'
});

await engine.animate(card.element, 'slide-up').finished;
```

## API Principal (Fases 1, 2, 3 y 4)
- **Ciclo de vida:** `start()`, `pause()`, `resume()`, `restart()`, `destroy()`, `getState()`, `isReady()`, `getMetrics()`, `onLifecycle(phase, handler)`
- **Configuración:** `getConfig(key?)`, `configure(patch)`, `resetConfig()`
- **Eventos:** `on(name, cb)`, `once(name, cb)`, `off(name, cb?)`, `onAny(cb)`, `emit(name, detail)`, `emitAsync(name, detail)`, `listenerCount(name?)`, `eventNames()`
- **Módulos:** `use(definition)`, `registerModule(definition)`, `unregisterModule(name)`, `getModule(name)`, `hasModule(name)`, `getModules()`
- **Design System & Temas:** `setTheme(name)`, `getTheme()`, `registerTheme(name, def)`, `getThemes()`, `setTokens(overrides)`, `resetTokens()`, `getToken(path)`, `getTokens()`, `setAccent(color, variants?)`, `setDensity(mode)`, `getDensity()`, `setContrast(mode)`, `getContrast()`
- **Component Engine:** `registerComponent(name, def)`, `unregisterComponent(name)`, `createComponent(name, props)`, `mountComponent(name, target, props)`, `updateComponent(targetOrId, props)`, `unmountComponent(targetOrId)`, `hydrateComponents(root?)`, `hasComponent(name)`, `getComponents()`, `describeComponent(name)`, `getComponentInstances(name?)`
- **Motion Engine:** `animate(target, presetOrKeyframes, opts?)`, `transition(target, styles, opts?)`, `stagger(targets, presetOrKeyframes, opts?)`, `registerMotionPreset(name, def)`, `getMotionPreset(name)`, `getMotionPresets()`, `cancelAnimations()`, `prefersReducedMotion()`, `motionDuration(ms)`
- **Interaction Engine:** `delegate(root, event, selector, handler, opts?)`, `onAction(root, actionMap, opts?)`, `bindShortcuts(target, shortcutsMap, opts?)`, `observeViewport(targets, cb, opts?)`, `trackPress(target, handlers)`, `bindGesture(target, handlers, opts?)`
- **Subsistemas:** `render()`, `setLoading()`, `measure()`, `inspect()`

## Principios
1. Independiente: no requiere ÖG Social, Supabase ni frameworks.
2. Progresivo: cada módulo evoluciona sobre el núcleo sin romper contratos.
3. Accesible: respeta `prefers-reduced-motion`, contraste alto y atributos ARIA.
4. Seguro: el renderizador y las primitivas insertan texto seguro mediante `textContent`.
5. No destructivo: administra únicamente atributos y clases con prefijo `ogve-`.

## Estado
- **Fase 1 (`0.1.0`) — Core Engine:** Completada.
- **Fase 2 (`0.2.0`) — Design System & Adaptive Themes:** Completada.
- **Fase 3 (`0.3.0`) — Component Engine:** Completada.
- **Fase 4 (`0.4.0`) — Motion & Interaction Engine:** Completada (presets de animación, `animate`, `transition`, `stagger`, soporte `prefers-reduced-motion`, acciones declarativas `onAction`, atajos `bindShortcuts`, visibilidad `observeViewport`, `trackPress` y gestos `bindGesture`).
