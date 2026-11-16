# ÖG Visual Engine

Motor visual independiente, modular y adaptable para aplicaciones web. Construido sin dependencias de ÖG Social ni de frameworks externos.

## Requisitos
- Node.js 18 o superior (solo para ejecutar las pruebas).
- Navegador moderno para usarlo directamente mediante módulos ES.

## Estructura
- `src/core`: núcleo del motor (`config.js`, `events.js`, `lifecycle.js`, `modules.js`, `engine.js`).
- `src/design-system`: tokens semánticos (`tokens.js`), presets (`presets.js`) y controlador adaptativo de temas (`theme.js`).
- `src/components`: registro y creación de componentes.
- `src/motion`: preferencias y utilidades de movimiento.
- `src/interactions`: delegación de interacciones.
- `src/rendering`: renderizado seguro de nodos DOM.
- `src/loading`: estados de carga accesibles.
- `src/performance`: medición ligera de rendimiento.
- `themes`: hojas de estilo de tokens base (`tokens.css`) y presets (`presets.css`).
- `examples`: demos independientes en HTML/JS vanilla.
- `docs`: documentación técnica por fase (`CORE-ENGINE.md`, `DESIGN-SYSTEM.md`).
- `tests`: suite de pruebas automatizadas con `node:test`.

## Inicio rápido

```js
import { createVisualEngine } from './src/index.js';
import './src/styles.css';

const engine = createVisualEngine({ theme: 'system' });
engine.start();

engine.setTheme('midnight');
engine.setDensity('comfortable');
console.log(engine.getTheme());
console.log(engine.getToken('color.accent'));
```

## API Principal (Fases 1 y 2)
- **Ciclo de vida:** `start()`, `pause()`, `resume()`, `restart()`, `destroy()`, `getState()`, `isReady()`, `getMetrics()`, `onLifecycle(phase, handler)`
- **Configuración:** `getConfig(key?)`, `configure(patch)`, `resetConfig()`
- **Eventos:** `on(name, cb)`, `once(name, cb)`, `off(name, cb?)`, `onAny(cb)`, `emit(name, detail)`, `emitAsync(name, detail)`, `listenerCount(name?)`, `eventNames()`
- **Módulos:** `use(definition)`, `registerModule(definition)`, `unregisterModule(name)`, `getModule(name)`, `hasModule(name)`, `getModules()`
- **Design System & Temas:** `setTheme(name)`, `getTheme()`, `registerTheme(name, def)`, `getThemes()`, `setTokens(overrides)`, `resetTokens()`, `getToken(path)`, `getTokens()`, `setAccent(color, variants?)`, `setDensity(mode)`, `getDensity()`, `setContrast(mode)`, `getContrast()`
- **Subsistemas:** `registerComponent()`, `createComponent()`, `hasComponent()`, `getComponents()`, `render()`, `setLoading()`, `delegate()`, `measure()`, `prefersReducedMotion()`, `motionDuration()`, `inspect()`

## Principios
1. Independiente: no requiere ÖG Social, Supabase ni frameworks.
2. Progresivo: cada módulo evoluciona sobre el núcleo sin romper contratos.
3. Accesible: respeta `prefers-reduced-motion`, contraste alto y atributos ARIA.
4. Seguro: el renderizador inserta nodos o texto seguro mediante `textContent`.
5. No destructivo: administra únicamente atributos y clases con prefijo `ogve-`.

## Estado
- **Fase 1 (`0.1.0`) — Core Engine:** Completada (configuración validada, bus de eventos, máquina de estados de ciclo de vida, registro topológico de módulos y API pública).
- **Fase 2 (`0.2.0`) — Design System & Adaptive Themes:** Completada (escala completa de tokens, presets de temas, temas personalizados en tiempo real, densidad, alto contraste y sincronización CSS/DOM).
