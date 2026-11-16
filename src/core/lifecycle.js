export const LIFECYCLE_STATES = Object.freeze({
  IDLE: 'idle',
  STARTING: 'starting',
  READY: 'ready',
  PAUSED: 'paused',
  DESTROYING: 'destroying',
  DESTROYED: 'destroyed'
});

export const LIFECYCLE_PHASES = Object.freeze([
  'beforeStart',
  'start',
  'ready',
  'pause',
  'resume',
  'beforeDestroy',
  'destroy'
]);

const VALID_PHASES = new Set(LIFECYCLE_PHASES);
const TEARDOWN_PHASES = new Set(['beforeDestroy', 'destroy']);

const ALLOWED_TRANSITIONS = Object.freeze({
  [LIFECYCLE_STATES.IDLE]: new Set([LIFECYCLE_STATES.STARTING, LIFECYCLE_STATES.DESTROYING]),
  [LIFECYCLE_STATES.STARTING]: new Set([LIFECYCLE_STATES.READY, LIFECYCLE_STATES.IDLE, LIFECYCLE_STATES.DESTROYING]),
  [LIFECYCLE_STATES.READY]: new Set([LIFECYCLE_STATES.PAUSED, LIFECYCLE_STATES.DESTROYING]),
  [LIFECYCLE_STATES.PAUSED]: new Set([LIFECYCLE_STATES.READY, LIFECYCLE_STATES.DESTROYING]),
  [LIFECYCLE_STATES.DESTROYING]: new Set([LIFECYCLE_STATES.DESTROYED]),
  [LIFECYCLE_STATES.DESTROYED]: new Set([LIFECYCLE_STATES.STARTING])
});

export function createLifecycleManager({ events, strict = true, getPayload = () => ({}) } = {}) {
  let state = LIFECYCLE_STATES.IDLE;
  const hooks = new Map(LIFECYCLE_PHASES.map(phase => [phase, new Set()]));

  const metrics = {
    createdAt: Date.now(),
    startedAt: null,
    pausedAt: null,
    destroyedAt: null,
    startCount: 0,
    pauseCount: 0
  };

  const transition = (nextState, meta = {}) => {
    const previous = state;
    if (previous === nextState) return false;
    const allowed = ALLOWED_TRANSITIONS[previous];
    if (!allowed || !allowed.has(nextState)) {
      if (strict) {
        throw new Error(`Invalid lifecycle transition: "${previous}" -> "${nextState}".`);
      }
      return false;
    }
    state = nextState;
    events?.emit('lifecycle:statechange', { previous, current: state, ...meta });
    return true;
  };

  const runHooks = (phase, context) => {
    const bucket = hooks.get(phase);
    if (!bucket || bucket.size === 0) return;
    const ordered = TEARDOWN_PHASES.has(phase) ? [...bucket].reverse() : [...bucket];
    for (const handler of ordered) {
      handler(context);
    }
  };

  const onHook = (phase, handler) => {
    if (!VALID_PHASES.has(phase)) {
      throw new TypeError(`Unknown lifecycle phase: "${phase}".`);
    }
    if (typeof handler !== 'function') {
      throw new TypeError('Lifecycle hook handler must be a function.');
    }
    const bucket = hooks.get(phase);
    bucket.add(handler);
    return () => bucket.delete(handler);
  };

  const start = (extraContext = {}) => {
    if (state === LIFECYCLE_STATES.READY) return false;
    if (state === LIFECYCLE_STATES.PAUSED) return resume(extraContext);

    transition(LIFECYCLE_STATES.STARTING);
    const context = { ...getPayload(), ...extraContext, state: LIFECYCLE_STATES.STARTING };

    try {
      events?.emit('lifecycle:before-start', context);
      runHooks('beforeStart', context);

      runHooks('start', context);
      events?.emit('lifecycle:start', context);

      transition(LIFECYCLE_STATES.READY);
      metrics.startedAt = Date.now();
      metrics.pausedAt = null;
      metrics.startCount += 1;

      const readyContext = { ...getPayload(), ...extraContext, state: LIFECYCLE_STATES.READY };
      runHooks('ready', readyContext);
      events?.emit('ready', readyContext);
      return true;
    } catch (error) {
      state = LIFECYCLE_STATES.IDLE;
      events?.emit('lifecycle:error', { phase: 'start', error });
      throw error;
    }
  };

  const pause = (extraContext = {}) => {
    if (state !== LIFECYCLE_STATES.READY) {
      if (strict) {
        throw new Error(`Cannot pause engine while in "${state}" state.`);
      }
      return false;
    }

    transition(LIFECYCLE_STATES.PAUSED);
    metrics.pausedAt = Date.now();
    metrics.pauseCount += 1;
    const context = { ...getPayload(), ...extraContext, state: LIFECYCLE_STATES.PAUSED };
    runHooks('pause', context);
    events?.emit('lifecycle:pause', context);
    return true;
  };

  const resume = (extraContext = {}) => {
    if (state !== LIFECYCLE_STATES.PAUSED) {
      if (strict) {
        throw new Error(`Cannot resume engine while in "${state}" state.`);
      }
      return false;
    }

    transition(LIFECYCLE_STATES.READY);
    metrics.pausedAt = null;
    const context = { ...getPayload(), ...extraContext, state: LIFECYCLE_STATES.READY };
    runHooks('resume', context);
    events?.emit('lifecycle:resume', context);
    return true;
  };

  const destroy = (extraContext = {}) => {
    if (state === LIFECYCLE_STATES.IDLE || state === LIFECYCLE_STATES.DESTROYED) {
      return false;
    }

    transition(LIFECYCLE_STATES.DESTROYING);
    const context = { ...getPayload(), ...extraContext, state: LIFECYCLE_STATES.DESTROYING };
    events?.emit('lifecycle:before-destroy', context);
    runHooks('beforeDestroy', context);

    runHooks('destroy', context);
    transition(LIFECYCLE_STATES.DESTROYED);
    metrics.destroyedAt = Date.now();

    const destroyedContext = { ...getPayload(), ...extraContext, state: LIFECYCLE_STATES.DESTROYED };
    events?.emit('destroy', destroyedContext);
    return true;
  };

  const restart = (extraContext = {}) => {
    if (state !== LIFECYCLE_STATES.IDLE && state !== LIFECYCLE_STATES.DESTROYED) {
      destroy(extraContext);
    }
    return start(extraContext);
  };

  const getMetrics = () => {
    const now = Date.now();
    const isActive = state === LIFECYCLE_STATES.READY || state === LIFECYCLE_STATES.PAUSED;
    return Object.freeze({
      state,
      createdAt: metrics.createdAt,
      startedAt: metrics.startedAt,
      pausedAt: metrics.pausedAt,
      destroyedAt: metrics.destroyedAt,
      startCount: metrics.startCount,
      pauseCount: metrics.pauseCount,
      uptimeMs: isActive && metrics.startedAt ? Math.max(0, now - metrics.startedAt) : 0
    });
  };

  return {
    getState: () => state,
    isReady: () => state === LIFECYCLE_STATES.READY,
    isPaused: () => state === LIFECYCLE_STATES.PAUSED,
    isDestroyed: () => state === LIFECYCLE_STATES.DESTROYED,
    canTransition: (nextState) => Boolean(ALLOWED_TRANSITIONS[state]?.has(nextState)),
    onHook,
    start,
    pause,
    resume,
    restart,
    destroy,
    getMetrics
  };
}
