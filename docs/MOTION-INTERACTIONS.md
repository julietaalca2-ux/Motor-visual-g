# ÖG Visual Engine — Fase 4: Motion & Interaction Engine

Documentación técnica del motor de movimiento adaptativo, gestos y delegación de interacciones implementados en la Fase 4.

## 1. Arquitectura

- `src/motion/motion.js`: controlador de animaciones (`createMotionController`), curvas de aceleración (`EASING_CURVES`), presets integrados, transiciones (`transition`), secuencias escalonadas (`stagger`), resortes físicos (`spring`) y secuencias (`sequence`), con soporte para `prefers-reduced-motion`.
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


## Advanced Motion 2.0 — Fase 6 (0.6.0)

### Spring physics

`engine.spring(target, from, to, options)` convierte estilos numéricos compatibles en keyframes de un resorte amortiguado. Los valores deben usar la misma unidad en ambos extremos (por ejemplo, `16px` y `0px`). Las propiedades no numéricas se aplican en el último fotograma.

Opciones físicas: `mass`, `stiffness`, `damping`, `velocity`, `restDelta`, `restSpeed` e `maxDuration`. También se puede elegir `preset: 'gentle' | 'standard' | 'snappy' | 'bouncy'`. `duration` pode substituir a duração calculada, y `respectReducedMotion` conserva el comportamiento accesible existente.

`createSpringKeyframes(from, to, options)` permite generar los fotogramas sin iniciar una animación.

### Sequences

`engine.sequence(target, steps, options)` ejecuta una lista de pasos en orden. Cada etapa aceita `motion`, `preset` ou `keyframes`, e um objeto opcional `options`. El controlador expone `finished` e `cancel()`.

### Social motion presets

- `post-enter`: entrada de publicação no feed.
- `reaction-pop`: feedback de reação.
- `story-enter`: entrada de elemento de história.
- `comment-enter`: entrada de comentário.
- `notification-drop`: entrada de notificação.

Todos los recursos siguen siendo genéricos e independientes de ÖG Social y de cualquier backend.
