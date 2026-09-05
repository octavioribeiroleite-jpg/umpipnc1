/** Persist object references, never expiring signed URLs or public receipt links. */
export function receiptPath(reference: string): string {
  let path: string;
  if (reference.startsWith('storage://receipts/')) {
    path = reference.slice('storage://receipts/'.length);
  } else if (/^https?:\/\//i.test(reference)) {
    const url = new URL(reference);
    const prefix = /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/receipts\//;
    if (!url.pathname.match(prefix)) throw new Error('Referência de comprovante inválida');
    path = decodeURIComponent(url.pathname.replace(prefix, ''));
  } else {
    path = reference;
  }
  if (!path || path.startsWith('/') || /[\\\u0000-\u001f?#]/.test(path) ||
      path.split('/').some(part => !part || part === '.' || part === '..') ||
      /^[a-z][a-z0-9+.-]*:/i.test(path)) {
    throw new Error('Caminho de comprovante inválido');
  }
  return path;
}

export function receiptReference(path: string): string {
  return `storage://receipts/${receiptPath(path)}`;
}
