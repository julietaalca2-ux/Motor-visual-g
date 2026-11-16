export function renderContent(target, content) {
  if (!target?.replaceChildren) throw new TypeError('A valid DOM target is required.');
  if (content instanceof globalThis.Node) target.replaceChildren(content);
  else target.textContent = content == null ? '' : String(content);
  return target;
}
