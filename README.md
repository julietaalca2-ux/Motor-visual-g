# ÖG Visual Engine

Motor visual independiente, modular y adaptable para aplicaciones web. Esta primera versión establece la arquitectura base sin depender de ÖG Social ni de frameworks externos.

## Requisitos
- Node.js 18 o superior (solo para ejecutar las pruebas).
- Navegador moderno para usarlo directamente.

## Estructura
- `src/core`: configuración, eventos y ciclo de vida.
- `src/design-system`: tokens y temas claro/oscuro/sistema.
- `src/components`: registro y creación de componentes.
- `src/motion`: preferencias y utilidades de movimiento.
- `src/interactions`: delegación de interacciones.
- `src/rendering`: renderizado seguro de nodos DOM.
- `src/loading`: estados de carga.
- `src/performance`: medición ligera de rendimiento.
- `themes`: hojas de estilo de los temas.
- `examples`: ejemplo de integración independiente.

## Inicio rápido

```js
import { createVisualEngine } from './src/index.js';
import './src/styles.css';

const engine = createVisualEngine({ theme: 'system' });
engine.start();

engine.setTheme('dark');
console.log(engine.getTheme());
```

También se puede usar sin bundler copiando `src/` y cargando `src/index.js` como módulo ES.

## API inicial
- `start()` / `destroy()`
- `setTheme('light' | 'dark' | 'system')`
- `getTheme()`
- `registerComponent(name, factory)` / `createComponent(name, props)`
- `render(target, content)`
- `setLoading(target, boolean, label?)`
- `on(eventName, callback)` / `emit(eventName, detail)`

## Principios
1. Independiente: no requiere ÖG Social, Supabase ni frameworks.
2. Progresivo: cada módulo puede evolucionar sin reescribir los demás.
3. Accesible: respeta `prefers-reduced-motion` y usa atributos semánticos.
4. Seguro: el renderizador de texto usa `textContent`; no interpreta HTML arbitrario.
5. No destructivo: solo administra los atributos y clases con prefijo `ogve-`.

## Estado
Versión `0.1.0` — Fase 1: estructura, núcleo, temas adaptativos y API inicial. Los componentes avanzados, animaciones, renderizado incremental y optimizaciones se desarrollarán en fases posteriores.
