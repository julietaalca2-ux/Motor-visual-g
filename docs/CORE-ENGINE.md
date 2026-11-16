# ÖG Visual Engine — Fase 1: Core Engine

Documentación técnica de la arquitectura del núcleo implementada en la Fase 1.

## 1. Arquitectura del Núcleo (`src/core/`)

- `src/core/config.js`: Validación estricta (`validateConfig`), resolución con valores por defecto (`resolveConfig`) y almacén reactivo (`createConfigStore`) que emite `configchange` con `{ previous, current, changedKeys }`.
- `src/core/events.js`: Bus de eventos (`createEventBus`) con suscripción (`on`), suscripción única (`once`), desuscripción (`off`), observador global (`onAny`), emisión síncrona con aislamiento de errores (`emit`), emisión asíncrona (`emitAsync`) e introspección (`listenerCount`, `eventNames`).
- `src/core/lifecycle.js`: Máquina de estados finitos (`idle` → `starting` → `ready` ↔ `paused` → `destroying` → `destroyed`), ejecución ordenada de hooks (FIFO al iniciar, LIFO al destruir) y métricas de tiempo de ejecución (`getMetrics`).
- `src/core/modules.js`: Registro de módulos (`createModuleRegistry`) con resolución topológica de dependencias, detección de dependencias circulares, encapsulamiento de API pública por módulo y propagación automática del ciclo de vida.
- `src/core/engine.js`: Orquestador principal (`createCoreEngine`) que integra los módulos nativos (`theme`, `components`, `renderer`, `loading`, `motion`, `interactions`, `performance`) y expone la API pública del motor.

## 2. API Pública Principal

```js
import { createVisualEngine } from '../src/index.js';

const engine = createVisualEngine({ theme: 'system', debug: false });

// Ciclo de vida
engine.start();
engine.pause();
engine.resume();
engine.restart();
engine.getState();   // 'ready' | 'paused' | 'destroyed' | ...
engine.getMetrics(); // { state, createdAt, startedAt, startCount, uptimeMs, ... }

// Configuración en tiempo de ejecución
engine.getConfig();
engine.configure({ theme: 'dark', debug: true });
engine.resetConfig();

// Sistema de eventos
const off = engine.on('themechange', ({ theme }) => console.log(theme));
engine.once('ready', () => console.log('Motor listo'));
engine.onAny((eventName, detail) => console.log(eventName, detail));
engine.emit('custom:event', { ok: true });

// Registro de módulos con dependencias
engine.use({
  name: 'custom-plugin',
  version: '1.0.0',
  dependencies: ['theme', 'components'],
  init(ctx) { /* inicialización */ },
  start(ctx) { /* arranque */ },
  destroy(ctx) { /* limpieza */ },
  api: { hello: () => 'Hola desde plugin' }
});

engine.getModule('custom-plugin').hello();
engine.inspect();
```
