import { createElement, appendChildren, cx } from './dom.js';

const safeText = (value, fallback = '') => value == null ? fallback : String(value);

export const reactionComponent = {
  name: 'og-reaction',
  version: '1.0.0',
  defaults: { count: 0, active: false, label: 'Me gusta', activeLabel: 'Te gusta', animation: 'pop', disabled: false },
  setup(props, ctx) {
    let active = Boolean(props.active);
    let count = Math.max(0, Number(props.count) || 0);
    const button = createElement('button', {
      type: 'button',
      className: cx('ogve-reaction', { 'is-active': active }, `ogve-reaction--${props.animation}`, props.className),
      attrs: { 'aria-pressed': String(active), 'aria-label': `${active ? props.activeLabel : props.label}, ${count}` },
      disabled: Boolean(props.disabled),
      dataset: { ogveComponent: 'og-reaction' }
    });
    const icon = createElement('span', { className: 'ogve-reaction__icon', text: props.icon || '♥', attrs: { 'aria-hidden': 'true' } });
    const value = createElement('span', { className: 'ogve-reaction__count', text: String(count) });
    button.appendChild(icon);
    button.appendChild(value);
    const render = () => {
      button.classList?.toggle('is-active', active);
      button.setAttribute?.('aria-pressed', String(active));
      button.setAttribute?.('aria-label', `${active ? props.activeLabel : props.label}, ${count}`);
      value.textContent = String(count);
    };
    const onClick = (event) => {
      if (props.disabled) return;
      active = !active;
      count = Math.max(0, count + (active ? 1 : -1));
      render();
      props.onChange?.({ active, count, event });
      ctx?.events?.emit?.('social:reaction', { active, count });
    };
    button.addEventListener?.('click', onClick);
    ctx?.onCleanup?.(() => button.removeEventListener?.('click', onClick));
    return button;
  }
};

export const storyRingComponent = {
  name: 'og-story-ring',
  version: '1.0.0',
  defaults: { name: 'Usuario', src: '', seen: false, size: 'md', label: '', onClick: null },
  setup(props, ctx) {
    const button = createElement('button', {
      type: 'button',
      className: cx('ogve-story-ring', `ogve-story-ring--${props.size}`, { 'is-seen': props.seen }, props.className),
      attrs: { 'aria-label': props.label || `Ver historia de ${props.name}` },
      dataset: { ogveComponent: 'og-story-ring', ogveSeen: String(Boolean(props.seen)) }
    });
    const frame = createElement('span', { className: 'ogve-story-ring__frame' });
    if (props.src) {
      const img = createElement('img', { className: 'ogve-story-ring__avatar', src: props.src, alt: '' });
      frame.appendChild(img);
    } else {
      frame.appendChild(createElement('span', { className: 'ogve-story-ring__fallback', text: safeText(props.name, 'ÖG').slice(0, 2).toUpperCase(), attrs: { 'aria-hidden': 'true' } }));
    }
    button.appendChild(frame);
    button.appendChild(createElement('span', { className: 'ogve-story-ring__name', text: props.name }));
    const onClick = (event) => props.onClick?.(event);
    button.addEventListener?.('click', onClick);
    ctx?.onCleanup?.(() => button.removeEventListener?.('click', onClick));
    return button;
  }
};

export const commentComponent = {
  name: 'og-comment',
  version: '1.0.0',
  defaults: { author: 'Usuario', avatar: '', time: '', text: '', likes: 0, verified: false, onReply: null },
  setup(props, ctx) {
    const root = createElement('article', { className: cx('ogve-comment', props.className), dataset: { ogveComponent: 'og-comment' } });
    const avatar = props.avatar
      ? createElement('img', { className: 'ogve-comment__avatar', src: props.avatar, alt: '' })
      : createElement('span', { className: 'ogve-comment__avatar ogve-comment__avatar--fallback', text: safeText(props.author, 'U').slice(0, 1).toUpperCase(), attrs: { 'aria-hidden': 'true' } });
    const content = createElement('div', { className: 'ogve-comment__content' });
    const meta = createElement('div', { className: 'ogve-comment__meta' });
    meta.appendChild(createElement('strong', { text: props.author }));
    if (props.verified) meta.appendChild(createElement('span', { className: 'ogve-comment__verified', text: '✓', attrs: { 'aria-label': 'Cuenta verificada' } }));
    if (props.time) meta.appendChild(createElement('time', { className: 'ogve-comment__time', text: props.time }));
    content.appendChild(meta);
    content.appendChild(createElement('p', { className: 'ogve-comment__text', text: props.text }));
    const actions = createElement('div', { className: 'ogve-comment__actions' });
    actions.appendChild(createElement('span', { className: 'ogve-comment__likes', text: `${Math.max(0, Number(props.likes) || 0)} me gusta` }));
    if (typeof props.onReply === 'function') {
      const reply = createElement('button', { type: 'button', className: 'ogve-comment__reply', text: 'Responder' });
      const onReply = (event) => props.onReply(event);
      reply.addEventListener?.('click', onReply);
      ctx?.onCleanup?.(() => reply.removeEventListener?.('click', onReply));
      actions.appendChild(reply);
    }
    content.appendChild(actions);
    root.appendChild(avatar);
    root.appendChild(content);
    return root;
  }
};

export const postComponent = {
  name: 'og-post',
  version: '1.0.0',
  defaults: { author: 'Usuario', handle: '', avatar: '', time: '', verified: false, content: '', media: '', mediaAlt: '', likes: 0, comments: 0, shares: 0, children: null, onAuthorClick: null, onMediaClick: null },
  setup(props, ctx) {
    const article = createElement('article', { className: cx('ogve-post', props.className), dataset: { ogveComponent: 'og-post' } });
    const header = createElement('header', { className: 'ogve-post__header' });
    const avatar = props.avatar
      ? createElement('img', { className: 'ogve-post__avatar', src: props.avatar, alt: '' })
      : createElement('span', { className: 'ogve-post__avatar ogve-post__avatar--fallback', text: safeText(props.author, 'U').slice(0, 1).toUpperCase(), attrs: { 'aria-hidden': 'true' } });
    const identity = createElement('div', { className: 'ogve-post__identity' });
    const author = createElement('button', { type: 'button', className: 'ogve-post__author', text: props.author });
    const onAuthorClick = (event) => props.onAuthorClick?.(event);
    author.addEventListener?.('click', onAuthorClick);
    ctx?.onCleanup?.(() => author.removeEventListener?.('click', onAuthorClick));
    identity.appendChild(author);
    if (props.verified) identity.appendChild(createElement('span', { className: 'ogve-post__verified', text: '✓', attrs: { 'aria-label': 'Cuenta verificada' } }));
    if (props.handle) identity.appendChild(createElement('span', { className: 'ogve-post__handle', text: props.handle }));
    if (props.time) identity.appendChild(createElement('time', { className: 'ogve-post__time', text: props.time }));
    header.appendChild(avatar);
    header.appendChild(identity);
    article.appendChild(header);
    if (props.content) article.appendChild(createElement('p', { className: 'ogve-post__text', text: props.content }));
    if (props.media) {
      const mediaButton = createElement('button', { type: 'button', className: 'ogve-post__media-button', attrs: { 'aria-label': props.mediaAlt || 'Abrir contenido multimedia' } });
      const media = createElement('img', { className: 'ogve-post__media', src: props.media, alt: props.mediaAlt || '' });
      mediaButton.appendChild(media);
      const onMediaClick = (event) => props.onMediaClick?.(event);
      mediaButton.addEventListener?.('click', onMediaClick);
      ctx?.onCleanup?.(() => mediaButton.removeEventListener?.('click', onMediaClick));
      article.appendChild(mediaButton);
    }
    if (props.children) {
      const slot = createElement('div', { className: 'ogve-post__slot' });
      appendChildren(slot, props.children);
      article.appendChild(slot);
    }
    const footer = createElement('footer', { className: 'ogve-post__footer' });
    for (const [label, count] of [['Me gusta', props.likes], ['Comentarios', props.comments], ['Compartidos', props.shares]]) {
      footer.appendChild(createElement('span', { className: 'ogve-post__stat', text: `${Math.max(0, Number(count) || 0)} ${label.toLowerCase()}` }));
    }
    article.appendChild(footer);
    return article;
  }
};

export const SOCIAL_COMPONENTS = Object.freeze([postComponent, reactionComponent, storyRingComponent, commentComponent]);
