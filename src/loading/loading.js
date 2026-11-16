export function setLoading(target, loading, label = 'Cargando…') {
  if (!target?.setAttribute) throw new TypeError('A valid DOM target is required.');
  if (loading) {
    target.setAttribute('aria-busy', 'true');
    target.classList.add('ogve-loading');
    if (label) target.setAttribute('data-ogve-loading-label', label);
  } else {
    target.removeAttribute('aria-busy');
    target.classList.remove('ogve-loading');
    target.removeAttribute('data-ogve-loading-label');
  }
}
