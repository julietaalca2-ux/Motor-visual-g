export function measure(name, task, onMeasure) {
  const start = globalThis.performance?.now?.() ?? Date.now();
  const finish = value => {
    const duration = (globalThis.performance?.now?.() ?? Date.now()) - start;
    onMeasure?.({ name, duration });
    return value;
  };
  try {
    const result = task();
    return result && typeof result.then === 'function' ? result.then(finish, error => { finish(); throw error; }) : finish(result);
  } catch (error) {
    finish();
    throw error;
  }
}
