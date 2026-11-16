import { createElement, appendChildren, cx } from './dom.js';

export const buttonComponent = {
  name: 'og-button',
  version: '1.0.0',
  defaults: {
    label: 'Acción',
    variant: 'secondary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false
  },
  variants: {
    primary: { variant: 'primary' },
    secondary: { variant: 'secondary' },
    ghost: { variant: 'ghost' },
    danger: { variant: 'danger' }
  },
  setup(props, ctx) {
    const isDisabled = Boolean(props.disabled || props.loading);
    const btn = createElement('button', {
      type: props.type || 'button',
      className: cx('ogve-btn', `ogve-btn--${props.variant}`, `ogve-btn--${props.size}`, props.className),
      disabled: isDisabled,
      ariaLabel: props.ariaLabel,
      dataset: {
        ogveComponent: 'og-button',
        ogveVariant: props.variant,
        ogveSize: props.size
      },
      attrs: {
        ...(props.loading ? { 'aria-busy': 'true' } : {})
      }
    });

    if (props.loading) {
      btn.appendChild(createElement('span', { className: 'ogve-spinner', 'aria-hidden': 'true' }));
    }

    btn.appendChild(createElement('span', {
      className: 'ogve-btn__label',
      text: props.loading && props.loadingLabel ? props.loadingLabel : props.label
    }));

    if (typeof props.onClick === 'function') {
      const handler = (event) => {
        if (isDisabled) return;
        props.onClick(event);
      };
      btn.addEventListener?.('click', handler);
      ctx?.onCleanup?.(() => btn.removeEventListener?.('click', handler));
    }

    return btn;
  }
};

export const badgeComponent = {
  name: 'og-badge',
  version: '1.0.0',
  defaults: {
    label: 'Estado',
    tone: 'neutral',
    dot: false
  },
  variants: {
    neutral: { tone: 'neutral' },
    accent: { tone: 'accent' },
    success: { tone: 'success' },
    warning: { tone: 'warning' },
    danger: { tone: 'danger' }
  },
  setup(props) {
    const badge = createElement('span', {
      className: cx('ogve-badge', `ogve-badge--${props.tone}`, props.className),
      dataset: {
        ogveComponent: 'og-badge',
        ogveTone: props.tone
      }
    });

    if (props.dot) {
      badge.appendChild(createElement('span', { className: 'ogve-badge__dot', 'aria-hidden': 'true' }));
    }

    badge.appendChild(createElement('span', { text: props.label }));
    return badge;
  }
};

export const cardComponent = {
  name: 'og-card',
  version: '1.0.0',
  defaults: {
    eyebrow: '',
    title: '',
    subtitle: '',
    body: '',
    footer: null,
    elevated: false,
    interactive: false
  },
  setup(props) {
    const article = createElement('article', {
      className: cx(
        'ogve-card',
        {
          'ogve-card--elevated': Boolean(props.elevated),
          'ogve-card--interactive': Boolean(props.interactive)
        },
        props.className
      ),
      dataset: {
        ogveComponent: 'og-card'
      }
    });

    if (props.eyebrow || props.title || props.subtitle) {
      const header = createElement('header', { className: 'ogve-card__header' });
      if (props.eyebrow) {
        header.appendChild(createElement('div', { className: 'ogve-card__eyebrow', text: props.eyebrow }));
      }
      if (props.title) {
        header.appendChild(createElement('h3', { className: 'ogve-card__title', text: props.title }));
      }
      if (props.subtitle) {
        header.appendChild(createElement('p', { className: 'ogve-card__subtitle', text: props.subtitle }));
      }
      article.appendChild(header);
    }

    if (props.body !== undefined && props.body !== null && props.body !== '') {
      const bodyEl = createElement('div', { className: 'ogve-card__body' });
      if (typeof props.body === 'string' || typeof props.body === 'number') {
        bodyEl.appendChild(createElement('p', { className: 'ogve-card__text', text: String(props.body) }));
      } else {
        appendChildren(bodyEl, props.body);
      }
      article.appendChild(bodyEl);
    }

    if (props.footer) {
      const footerEl = createElement('footer', { className: 'ogve-card__footer' });
      appendChildren(footerEl, props.footer);
      article.appendChild(footerEl);
    }

    return article;
  }
};

let inputUid = 0;

export const inputComponent = {
  name: 'og-input',
  version: '1.0.0',
  defaults: {
    label: '',
    name: '',
    type: 'text',
    placeholder: '',
    value: '',
    hint: '',
    error: '',
    required: false,
    disabled: false
  },
  setup(props, ctx) {
    inputUid += 1;
    const fieldId = props.id || `ogve-field-${inputUid}`;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;
    const describedBy = [];
    if (props.hint) describedBy.push(hintId);
    if (props.error) describedBy.push(errorId);

    const wrapper = createElement('div', {
      className: cx('ogve-field', { 'ogve-field--error': Boolean(props.error) }, props.className),
      dataset: { ogveComponent: 'og-input' }
    });

    if (props.label) {
      wrapper.appendChild(createElement('label', {
        className: 'ogve-field__label',
        for: fieldId,
        text: props.required ? `${props.label} *` : props.label
      }));
    }

    const input = createElement('input', {
      id: fieldId,
      name: props.name || undefined,
      type: props.type || 'text',
      className: 'ogve-field__control',
      placeholder: props.placeholder || undefined,
      value: props.value ?? '',
      required: Boolean(props.required),
      disabled: Boolean(props.disabled),
      attrs: {
        ...(props.error ? { 'aria-invalid': 'true' } : {}),
        ...(describedBy.length ? { 'aria-describedby': describedBy.join(' ') } : {})
      }
    });

    if (typeof props.onInput === 'function') {
      const handler = (e) => props.onInput(e.target?.value ?? '', e);
      input.addEventListener?.('input', handler);
      ctx?.onCleanup?.(() => input.removeEventListener?.('input', handler));
    }

    if (typeof props.onChange === 'function') {
      const handler = (e) => props.onChange(e.target?.value ?? '', e);
      input.addEventListener?.('change', handler);
      ctx?.onCleanup?.(() => input.removeEventListener?.('change', handler));
    }

    wrapper.appendChild(input);

    if (props.hint) {
      wrapper.appendChild(createElement('div', {
        id: hintId,
        className: 'ogve-field__hint',
        text: props.hint
      }));
    }

    if (props.error) {
      wrapper.appendChild(createElement('div', {
        id: errorId,
        className: 'ogve-field__error',
        role: 'alert',
        text: props.error
      }));
    }

    return wrapper;
  }
};

export const alertComponent = {
  name: 'og-alert',
  version: '1.0.0',
  defaults: {
    title: '',
    message: '',
    tone: 'info',
    dismissible: false
  },
  variants: {
    info: { tone: 'info' },
    success: { tone: 'success' },
    warning: { tone: 'warning' },
    danger: { tone: 'danger' }
  },
  setup(props, ctx) {
    const isUrgent = props.tone === 'danger' || props.tone === 'warning';
    const box = createElement('div', {
      className: cx('ogve-alert', `ogve-alert--${props.tone}`, props.className),
      role: isUrgent ? 'alert' : 'status',
      attrs: {
        'aria-live': isUrgent ? 'assertive' : 'polite'
      },
      dataset: {
        ogveComponent: 'og-alert',
        ogveTone: props.tone
      }
    });

    const content = createElement('div', { className: 'ogve-alert__content' });
    if (props.title) {
      content.appendChild(createElement('div', { className: 'ogve-alert__title', text: props.title }));
    }
    if (props.message) {
      content.appendChild(createElement('div', { className: 'ogve-alert__message', text: props.message }));
    }
    box.appendChild(content);

    if (props.dismissible) {
      const closeBtn = createElement('button', {
        type: 'button',
        className: 'ogve-alert__close',
        ariaLabel: 'Cerrar notificación',
        text: '×'
      });
      const onDismiss = (event) => {
        props.onDismiss?.(event);
        box.remove?.();
      };
      closeBtn.addEventListener?.('click', onDismiss);
      ctx?.onCleanup?.(() => closeBtn.removeEventListener?.('click', onDismiss));
      box.appendChild(closeBtn);
    }

    return box;
  }
};

function computeInitials(name = '') {
  const cleaned = String(name).trim();
  if (!cleaned) return 'ÖG';
  const words = cleaned.split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export const avatarComponent = {
  name: 'og-avatar',
  version: '1.0.0',
  defaults: {
    name: 'ÖG User',
    src: '',
    alt: '',
    size: 'md',
    status: ''
  },
  setup(props, ctx) {
    const initials = computeInitials(props.name);
    const root = createElement('span', {
      className: cx('ogve-avatar', `ogve-avatar--${props.size}`, props.className),
      role: 'img',
      ariaLabel: props.alt || props.name || 'Avatar',
      dataset: {
        ogveComponent: 'og-avatar',
        ogveSize: props.size
      }
    });

    const fallback = createElement('span', {
      className: 'ogve-avatar__initials',
      'aria-hidden': 'true',
      text: initials
    });

    if (props.src) {
      const img = createElement('img', {
        className: 'ogve-avatar__img',
        src: props.src,
        alt: props.alt || props.name || ''
      });
      const onError = () => {
        img.remove?.();
        root.appendChild(fallback);
      };
      img.addEventListener?.('error', onError);
      ctx?.onCleanup?.(() => img.removeEventListener?.('error', onError));
      root.appendChild(img);
    } else {
      root.appendChild(fallback);
    }

    if (props.status) {
      root.appendChild(createElement('span', {
        className: cx('ogve-avatar__status', `ogve-avatar__status--${props.status}`),
        'aria-hidden': 'true'
      }));
    }

    return root;
  }
};

export const BUILT_IN_COMPONENTS = Object.freeze([
  buttonComponent,
  badgeComponent,
  cardComponent,
  inputComponent,
  alertComponent,
  avatarComponent
]);

export function registerBuiltInComponents(registry) {
  for (const def of BUILT_IN_COMPONENTS) {
    registry.register(def.name, def);
  }
  return registry.list();
}
