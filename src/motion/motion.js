export const EASING_CURVES = Object.freeze({
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  spring: 'cubic-bezier(0.22, 1.12, 0.36, 1)'
});

export const MOTION_PRESETS = Object.freeze({
  'fade-in': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ opacity: 0 }),
      Object.freeze({ opacity: 1 })
    ]),
    duration: 220,
    easing: EASING_CURVES.decelerate,
    fill: 'both'
  }),
  'fade-out': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ opacity: 1 }),
      Object.freeze({ opacity: 0 })
    ]),
    duration: 180,
    easing: EASING_CURVES.accelerate,
    fill: 'both'
  }),
  'slide-up': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ opacity: 0, transform: 'translateY(14px)' }),
      Object.freeze({ opacity: 1, transform: 'translateY(0px)' })
    ]),
    duration: 240,
    easing: EASING_CURVES.decelerate,
    fill: 'both'
  }),
  'slide-down': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ opacity: 0, transform: 'translateY(-14px)' }),
      Object.freeze({ opacity: 1, transform: 'translateY(0px)' })
    ]),
    duration: 240,
    easing: EASING_CURVES.decelerate,
    fill: 'both'
  }),
  'scale-in': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ opacity: 0, transform: 'scale(0.95)' }),
      Object.freeze({ opacity: 1, transform: 'scale(1)' })
    ]),
    duration: 220,
    easing: EASING_CURVES.spring,
    fill: 'both'
  }),
  'scale-out': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ opacity: 1, transform: 'scale(1)' }),
      Object.freeze({ opacity: 0, transform: 'scale(0.95)' })
    ]),
    duration: 180,
    easing: EASING_CURVES.accelerate,
    fill: 'both'
  }),
  pulse: Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ transform: 'scale(1)' }),
      Object.freeze({ transform: 'scale(1.035)' }),
      Object.freeze({ transform: 'scale(1)' })
    ]),
    duration: 280,
    easing: EASING_CURVES.standard,
    fill: 'none'
  }),
  'post-enter': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ opacity: 0, transform: 'translateY(18px) scale(0.985)' }),
      Object.freeze({ opacity: 1, transform: 'translateY(0px) scale(1)' })
    ]),
    duration: 360, easing: EASING_CURVES.decelerate, fill: 'both'
  }),
  'reaction-pop': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ transform: 'scale(1)' }),
      Object.freeze({ transform: 'scale(1.28)' }),
      Object.freeze({ transform: 'scale(0.92)' }),
      Object.freeze({ transform: 'scale(1.08)' }),
      Object.freeze({ transform: 'scale(1)' })
    ]),
    duration: 420, easing: EASING_CURVES.spring, fill: 'both'
  }),
  'story-enter': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ opacity: 0, transform: 'scale(0.88)' }),
      Object.freeze({ opacity: 1, transform: 'scale(1)' })
    ]),
    duration: 320, easing: EASING_CURVES.spring, fill: 'both'
  }),
  'comment-enter': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ opacity: 0, transform: 'translateY(10px)' }),
      Object.freeze({ opacity: 1, transform: 'translateY(0px)' })
    ]),
    duration: 260, easing: EASING_CURVES.decelerate, fill: 'both'
  }),
  'notification-drop': Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ opacity: 0, transform: 'translateY(-12px) scale(0.98)' }),
      Object.freeze({ opacity: 1, transform: 'translateY(0px) scale(1)' })
    ]),
    duration: 340, easing: EASING_CURVES.spring, fill: 'both'
  }),
  shake: Object.freeze({
    keyframes: Object.freeze([
      Object.freeze({ transform: 'translateX(0px)' }),
      Object.freeze({ transform: 'translateX(-6px)' }),
      Object.freeze({ transform: 'translateX(6px)' }),
      Object.freeze({ transform: 'translateX(-4px)' }),
      Object.freeze({ transform: 'translateX(4px)' }),
      Object.freeze({ transform: 'translateX(0px)' })
    ]),
    duration: 320,
    easing: EASING_CURVES.standard,
    fill: 'none'
  })
});


export const SPRING_PRESETS = Object.freeze({
  gentle: Object.freeze({ mass: 1, stiffness: 120, damping: 18, velocity: 0 }),
  standard: Object.freeze({ mass: 1, stiffness: 170, damping: 22, velocity: 0 }),
  snappy: Object.freeze({ mass: 1, stiffness: 260, damping: 24, velocity: 0 }),
  bouncy: Object.freeze({ mass: 1, stiffness: 220, damping: 12, velocity: 0 })
});

const NUMERIC_STYLE = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i;

/** Build WAAPI keyframes from a damped spring simulation. */
export function createSpringKeyframes(from = {}, to = {}, options = {}) {
  if (!from || !to || typeof from !== 'object' || typeof to !== 'object' || Array.isArray(from) || Array.isArray(to)) {
    throw new TypeError('Spring endpoints must be style objects.');
  }
  const preset = typeof options.preset === 'string' ? SPRING_PRESETS[options.preset] : null;
  if (options.preset && !preset) throw new Error(`Unknown spring preset: ${options.preset}`);
  const cfg = { ...SPRING_PRESETS.standard, ...(preset ?? {}), ...options };
  const mass = Math.max(0.01, Number(cfg.mass) || 1);
  const stiffness = Math.max(0.01, Number(cfg.stiffness) || 170);
  const damping = Math.max(0, Number(cfg.damping) || 0);
  const initialVelocity = Number.isFinite(Number(cfg.velocity)) ? Number(cfg.velocity) : 0;
  const restDelta = Math.max(0.0001, Number(cfg.restDelta) || 0.001);
  const restSpeed = Math.max(0.0001, Number(cfg.restSpeed) || 0.01);
  const maxDuration = Math.min(5000, Math.max(100, Number(cfg.maxDuration) || 2200));
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
  const pairs = [];
  for (const key of keys) {
    const a = String(from[key] ?? to[key] ?? '0').trim();
    const b = String(to[key] ?? from[key] ?? '0').trim();
    const ma = a.match(NUMERIC_STYLE);
    const mb = b.match(NUMERIC_STYLE);
    if (ma && mb && ma[2] === mb[2]) {
      pairs.push({ key, start: Number(ma[1]), end: Number(mb[1]), unit: ma[2] });
    }
  }
  const dt = 1 / 120;
  let position = 0;
  let velocity = initialVelocity;
  const samples = [0];
  const maxSteps = Math.ceil(maxDuration / (dt * 1000));
  for (let i = 0; i < maxSteps; i += 1) {
    const acceleration = (-stiffness * (position - 1) - damping * velocity) / mass;
    velocity += acceleration * dt;
    position += velocity * dt;
    samples.push(position);
    if (Math.abs(1 - position) <= restDelta && Math.abs(velocity) <= restSpeed) break;
  }
  const last = samples.length - 1;
  if (last === 0) samples.push(1);
  samples[samples.length - 1] = 1;
  const indexes = samples.map((_, index) => index);
  return indexes.map((sampleIndex, index) => {
    const progress = samples[sampleIndex];
    const frame = { offset: index / Math.max(1, indexes.length - 1) };
    for (const pair of pairs) {
      const value = pair.start + (pair.end - pair.start) * progress;
      frame[pair.key] = `${Number(value.toFixed(4))}${pair.unit}`;
    }
    if (index === indexes.length - 1) {
      for (const key of keys) if (!pairs.some(pair => pair.key === key)) frame[key] = to[key] ?? from[key];
    }
    return frame;
  });
}

export function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function parseDurationMs(value, fallback = 220) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.endsWith('ms')) {
      const n = Number.parseFloat(trimmed.slice(0, -2));
      return Number.isFinite(n) ? Math.max(0, n) : fallback;
    }
    if (trimmed.endsWith('s')) {
      const n = Number.parseFloat(trimmed.slice(0, -1));
      return Number.isFinite(n) ? Math.max(0, n * 1000) : fallback;
    }
    const n = Number.parseFloat(trimmed);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return fallback;
}

export function motionDuration(duration = 220, { respectReducedMotion = true } = {}) {
  const ms = parseDurationMs(duration, 220);
  if (respectReducedMotion && prefersReducedMotion()) {
    return 0;
  }
  return ms;
}

function applyKeyframeStyles(target, frame) {
  if (!target?.style || !frame || typeof frame !== 'object') return;
  for (const [prop, val] of Object.entries(frame)) {
    if (prop === 'offset' || prop === 'easing' || prop === 'composite' || val == null) continue;
    if (prop.startsWith('--')) {
      target.style.setProperty?.(prop, String(val));
    } else {
      target.style[prop] = String(val);
    }
  }
}

export function createMotionController({ events, getConfig = () => ({ respectReducedMotion: true }) } = {}) {
  const presets = new Map(Object.entries(MOTION_PRESETS));
  const activeAnimations = new Map();
  let animCounter = 0;

  const registerPreset = (name, definition) => {
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new TypeError('Motion preset name must be kebab-case.');
    }
    if (!definition || typeof definition !== 'object' || !Array.isArray(definition.keyframes) || definition.keyframes.length === 0) {
      throw new TypeError(`Motion preset "${name}" must provide a non-empty keyframes array.`);
    }
    const normalized = Object.freeze({
      keyframes: Object.freeze(definition.keyframes.map(f => Object.freeze({ ...f }))),
      duration: parseDurationMs(definition.duration, 220),
      easing: definition.easing ?? EASING_CURVES.standard,
      fill: definition.fill ?? 'both'
    });
    presets.set(name, normalized);
    events?.emit('motion:presetregistered', { name });
    return normalized;
  };

  const getPreset = (name) => presets.get(name) ?? null;
  const getPresets = () => [...presets.keys()];

  const animate = (target, keyframesOrPreset, options = {}) => {
    if (!target || typeof target !== 'object') {
      throw new TypeError('A valid DOM target is required for animate().');
    }

    let presetName = null;
    let baseKeyframes = null;
    let baseDuration = 220;
    let baseEasing = EASING_CURVES.standard;
    let baseFill = 'both';

    if (typeof keyframesOrPreset === 'string') {
      const preset = presets.get(keyframesOrPreset);
      if (!preset) {
        throw new Error(`Unknown motion preset: ${keyframesOrPreset}`);
      }
      presetName = keyframesOrPreset;
      baseKeyframes = preset.keyframes.map(f => ({ ...f }));
      baseDuration = preset.duration;
      baseEasing = preset.easing;
      baseFill = preset.fill;
    } else if (Array.isArray(keyframesOrPreset)) {
      baseKeyframes = keyframesOrPreset.map(f => ({ ...f }));
    } else if (keyframesOrPreset && typeof keyframesOrPreset === 'object') {
      baseKeyframes = [{ ...keyframesOrPreset }];
    } else {
      throw new TypeError('animate() requires a preset name, keyframes array, or style object.');
    }

    const respectReduced = options.respectReducedMotion ?? getConfig()?.respectReducedMotion ?? true;
    const requestedDuration = options.duration !== undefined ? options.duration : baseDuration;
    const effectiveDuration = motionDuration(requestedDuration, { respectReducedMotion: respectReduced });
    const delay = effectiveDuration === 0 ? 0 : Math.max(0, parseDurationMs(options.delay, 0));
    const easing = options.easing ?? baseEasing;
    const fill = options.fill ?? baseFill;
    const iterations = options.iterations ?? 1;

    animCounter += 1;
    const id = `ogve-anim-${animCounter}`;
    const lastFrame = baseKeyframes[baseKeyframes.length - 1];

    let cancelled = false;
    let settled = false;
    let nativeAnim = null;
    let timerId = null;

    let resolveFinished;
    const finished = new Promise((resolve) => {
      resolveFinished = resolve;
    });

    const finalize = (reason = 'finish') => {
      if (settled) return;
      settled = true;
      activeAnimations.delete(id);
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (reason === 'finish' && (fill === 'both' || fill === 'forwards')) {
        applyKeyframeStyles(target, lastFrame);
      }
      options.onFinish?.({ id, preset: presetName, reason });
      events?.emit(reason === 'cancel' ? 'motion:cancel' : 'motion:finish', {
        id,
        preset: presetName,
        duration: effectiveDuration,
        reason
      });
      resolveFinished({ id, preset: presetName, reason });
    };

    const record = {
      id,
      preset: presetName,
      target,
      cancel() {
        if (settled) return;
        cancelled = true;
        try {
          nativeAnim?.cancel?.();
        } catch { /* Ignore native WAAPI cancel errors */ }
        finalize('cancel');
      },
      finish() {
        if (settled) return;
        try {
          nativeAnim?.finish?.();
        } catch { /* Ignore native WAAPI finish errors */ }
        finalize('finish');
      }
    };

    activeAnimations.set(id, record);
    events?.emit('motion:start', {
      id,
      preset: presetName,
      duration: effectiveDuration,
      reducedMotion: effectiveDuration === 0 && parseDurationMs(requestedDuration, 220) > 0
    });

    if (effectiveDuration === 0) {
      finalize('finish');
    } else if (typeof target.animate === 'function') {
      try {
        nativeAnim = target.animate(baseKeyframes, {
          duration: effectiveDuration,
          delay,
          easing,
          fill,
          iterations
        });
        nativeAnim.onfinish = () => finalize('finish');
        nativeAnim.oncancel = () => {
          if (!cancelled) finalize('cancel');
        };
      } catch {
        // Fallback when WAAPI throws in partial DOM environments
        timerId = setTimeout(() => finalize('finish'), effectiveDuration + delay);
      }
    } else {
      timerId = setTimeout(() => finalize('finish'), effectiveDuration + delay);
    }

    return Object.freeze({
      id,
      preset: presetName,
      duration: effectiveDuration,
      finished,
      cancel: record.cancel,
      finish: record.finish
    });
  };

  const spring = (target, from, to, options = {}) => {
    const keyframes = createSpringKeyframes(from, to, options);
    const duration = options.duration ?? Math.max(120, (keyframes.length - 1) * (1000 / 120));
    return animate(target, keyframes, { ...options, duration, easing: 'linear', fill: options.fill ?? 'both' });
  };

  const sequence = (target, steps, options = {}) => {
    if (!Array.isArray(steps)) throw new TypeError('sequence() requires an array of motion steps.');
    let cancelled = false;
    let active = null;
    const finished = (async () => {
      const results = [];
      for (const step of steps) {
        if (cancelled) break;
        if (!step || typeof step !== 'object') throw new TypeError('Each sequence step must be an object.');
        active = animate(target, step.motion ?? step.preset ?? step.keyframes, { ...options, ...(step.options ?? {}) });
        const result = await active.finished;
        results.push(result);
        if (result.reason !== 'finish') break;
      }
      return results;
    })();
    return Object.freeze({ finished, cancel() { cancelled = true; active?.cancel(); } });
  };

  const transition = (target, styles, options = {}) => {
    if (!styles || typeof styles !== 'object' || Array.isArray(styles)) {
      throw new TypeError('transition() requires a target style object.');
    }
    return animate(target, [styles], {
      duration: options.duration ?? 220,
      easing: options.easing ?? EASING_CURVES.standard,
      fill: 'both',
      ...options
    });
  };

  const stagger = (targets, keyframesOrPreset, options = {}) => {
    const list = Array.isArray(targets) ? targets : [...(targets ?? [])];
    const staggerMs = Math.max(0, parseDurationMs(options.staggerMs ?? options.stagger ?? 45, 45));
    const baseDelay = Math.max(0, parseDurationMs(options.delay ?? 0, 0));

    const handles = list.map((el, index) =>
      animate(el, keyframesOrPreset, {
        ...options,
        delay: baseDelay + index * staggerMs
      })
    );

    return Object.freeze({
      handles,
      finished: Promise.all(handles.map(h => h.finished)),
      cancel() {
        for (const h of handles) h.cancel();
      }
    });
  };

  const cancelAll = () => {
    const list = [...activeAnimations.values()];
    for (const record of list) {
      record.cancel();
    }
    return list.length;
  };

  const getActiveCount = () => activeAnimations.size;

  return {
    registerPreset,
    getPreset,
    getPresets,
    animate,
    transition,
    stagger,
    spring,
    sequence,
    cancelAll,
    getActiveCount
  };
}
