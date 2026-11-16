# ÖG Visual Engine — Fase 4: Motion & Interaction Engine

Documentación técnica del motor de movimiento adaptativo, gestos y delegación de interacciones implementados en la Fase 4.

## 1. Arquitectura

- `src/motion/motion.js`: Controlador de animaciones (`createMotionController`), curvas de aceleración (`EASING_CURVES`), presets integrados (`MOTION_PRESETS`: `fade-in`, `fade-out`, `slide-up`, `slide-down`, `scale-in`, `scale-out`, `pulse`, `shake`), transiciones (`transition`) y secuencias escalonadas (`stagger`) con soporte automático para `prefers-reduced-motion`.
- `src/interactions/delegation.js`: Delegación eficiente de eventos (`delegate`) con soporte para `once`, `preventDefault` y `stopPropagation`.
- `src/interactions/interactions.js`: Controlador de interacciones (`createInteractionController`) con acciones declarativas (`onAction` sobre `data-ogve-action`), atajos de teclado (`bindShortcuts`), detección de visibilidad (`observeViewport`), estados de presión (`trackPress`) y reconocimiento unificado de gestos (`bindGesture`: `swipe`, `tap`, `longpress`).

## 2. API Pública de Movimiento e Interacción

```js
import { createVisualEngine } from '../src/index.js';

const engine = createVisualEngine({ theme: 'system' }).start();

// 1. Animaciones con presets y stagger
await engine.animate(cardElement, 'slide-up').finished;
await engine.stagger(document.querySelectorAll('.item'), 'fade-in', { staggerMs: 60 }).finished;

// 2. Acciones declarativas y atajos de teclado
engine.onAction(document.body, {
  'open-search': ({ trigger, payload }) => console.log('Abrir búsqueda', payload)
});

engine.bindShortcuts(document, {
  'Mod+K': () => console.log('Atajo rápido ejecutado')
});

// 3. Gestos y feedback táctil
engine.trackPress(buttonElement, {
  onPress: () => console.log('Botón activado')
});

engine.bindGesture(carouselElement, {
  onSwipeLeft: () => console.log('Siguiente'),
  onSwipeRight: () => console.log('Anterior'),
  onLongPress: () => console.log('Menú contextual')
});
```
