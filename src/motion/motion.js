export function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function motionDuration(duration = 220) {
  return prefersReducedMotion() ? 0 : Math.max(0, Number(duration) || 0);
}
