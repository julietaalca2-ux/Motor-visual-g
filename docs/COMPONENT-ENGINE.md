# ÖG Visual Engine — Fase 3: Component Engine

Documentación técnica del motor de componentes, primitivas nativas y gestión de instancias implementados en la Fase 3.

## 1. Arquitectura (`src/components/`)

- `src/components/dom.js`: Utilidades seguras de construcción DOM (`createElement`, `applyProps`, `appendChildren`, `cx`) que insertan texto mediante `textContent` / `TextNode`, administran atributos ARIA, `dataset` y registran funciones de limpieza de listeners.
- `src/components/registry.js`: Registro extensible (`createComponentRegistry`) compatible con fábricas funcionales simples `(props, ctx) => node` y descriptores completos con `defaults`, `variants`, `setup`, `onMount`, `onUpdate` y `onDestroy`. Incluye montaje administrado (`mount`), actualización reactiva (`update`), desmontaje (`unmount`, `unmountAll`) e hidratación declarativa (`hydrate`).
- `src/components/primitives.js`: Primitivas UI accesibles registradas por defecto en el motor (`og-button`, `og-badge`, `og-card`, `og-input`, `og-alert`, `og-avatar`).
- `src/components/components.css`: Hojas de estilo modulares basadas en variables `--ogve-*` adaptativas a temas, densidad y alto contraste.

## 2. API Pública del Component Engine

```js
import { createVisualEngine } from '../src/index.js';

const engine = createVisualEngine({ theme: 'system' }).start();

// 1. Creación directa de primitivas o componentes personalizados
const btn = engine.createComponent('og-button', {
  variant: 'primary',
  label: 'Guardar cambios',
  onClick: () => console.log('Click!')
});

// 2. Montaje administrado con actualización y limpieza automática
const card = engine.mountComponent('og-card', document.querySelector('#slot'), {
  eyebrow: 'PERFIL',
  title: 'ÖG Visual Engine',
  body: 'Componente montado y sincronizado con el ciclo de vida.'
});

card.update({ title: 'Título actualizado' });
card.unmount();

// 3. Hidratación declarativa desde atributos HTML
// <div data-ogve-component="og-badge" data-ogve-prop-label="Activo" data-ogve-prop-tone="success"></div>
engine.hydrateComponents(document);
```

## Social components (0.5.0)

`og-post`, `og-reaction`, `og-story-ring` and `og-comment` are registered as built-ins. They are presentation components: callbacks let the host application connect navigation, persistence, media viewers, and backend services without coupling those concerns to the engine.
