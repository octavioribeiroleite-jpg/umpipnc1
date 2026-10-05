const IDENTITY_ATTRIBUTES = [
  'id', 'name', 'for', 'form', 'list', 'headers', 'autofocus',
  'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns',
  'aria-activedescendant', 'aria-details', 'aria-errormessage',
];

// The snapshot is only a visual placeholder. Keep the live React tree and its
// draft values untouched; copied IDs must not steal its labels or references.
export function decorativeSnapshotHtml(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  for (const node of clone.querySelectorAll<HTMLElement>('*')) {
    for (const attribute of IDENTITY_ATTRIBUTES) node.removeAttribute(attribute);
    if (node.matches('a, button, input, select, textarea, [tabindex], [contenteditable]')) {
      node.setAttribute('tabindex', '-1');
    }
  }
  return clone.innerHTML;
}
