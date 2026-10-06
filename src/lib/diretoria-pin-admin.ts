export interface DirectoryPinSociety {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface DirectoryPinRecord {
  key: string;
  value: string;
}

export interface DirectoryPinUpdate extends DirectoryPinRecord {
  updated_at: string;
}

interface QueryResult<T> {
  data: T | null;
  error: unknown | null;
}

export interface DirectoryPinStore {
  loadSocieties(): PromiseLike<QueryResult<DirectoryPinSociety[]>>;
  loadPins(keys: string[]): PromiseLike<QueryResult<DirectoryPinRecord[]>>;
  savePins(rows: DirectoryPinUpdate[]): PromiseLike<QueryResult<DirectoryPinRecord[]>>;
}

interface AdminAccess {
  isAdmin(): boolean;
}

export type DirectoryPinValues = Record<string, string>;
export type DirectoryPinStatus = 'saved' | 'unsaved' | 'unset' | 'invalid';
type ErrorCode = 'access' | 'load' | 'invalid' | 'save' | 'confirmation' | 'copy-unsaved' | 'clipboard';

const errorMessages: Record<ErrorCode, string> = {
  access: 'Somente administradores podem gerenciar estes PINs.',
  load: 'Não foi possível consultar os PINs da Diretoria.',
  invalid: 'Use exatamente 6 números em cada PIN alterado. Um PIN salvo não pode ficar vazio.',
  save: 'Não foi possível salvar os PINs. Suas alterações continuam nos campos para tentar novamente.',
  confirmation: 'Não foi possível confirmar o salvamento dos PINs. Tente salvar novamente.',
  'copy-unsaved': 'Salve um PIN válido antes de copiá-lo.',
  clipboard: 'Não foi possível copiar. Selecione o PIN salvo e copie manualmente.',
};

export class DirectoryPinAdminError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(errorMessages[code]);
    this.name = 'DirectoryPinAdminError';
    this.code = code;
  }
}

function assertAdmin(access: AdminAccess) {
  if (!access.isAdmin()) throw new DirectoryPinAdminError('access');
}

function pinKey(slug: string) {
  return `diretoria_pin_${slug}`;
}

export function isValidDirectoryPin(value: string) {
  return /^\d{6}$/.test(value);
}

export function directoryPinStatus(draft: string, saved: string = ''): DirectoryPinStatus {
  if (!draft && !saved) return 'unset';
  if (!isValidDirectoryPin(draft)) return 'invalid';
  return draft === saved ? 'saved' : 'unsaved';
}

export async function loadDirectoryPins({ store, ...access }: AdminAccess & { store: DirectoryPinStore }) {
  assertAdmin(access);
  let societiesResult: QueryResult<DirectoryPinSociety[]>;
  try {
    societiesResult = await store.loadSocieties();
  } catch {
    throw new DirectoryPinAdminError('load');
  }
  assertAdmin(access);
  if (societiesResult.error || !Array.isArray(societiesResult.data)) throw new DirectoryPinAdminError('load');

  const seen = new Set(['geral', 'pastor']);
  const societies = societiesResult.data.filter(society => {
    if (!society.slug || seen.has(society.slug)) return false;
    seen.add(society.slug);
    return true;
  });
  const slugs = ['pastor', ...societies.map(society => society.slug)];
  const keys = slugs.map(pinKey);
  let pinsResult: QueryResult<DirectoryPinRecord[]>;
  try {
    pinsResult = await store.loadPins(keys);
  } catch {
    throw new DirectoryPinAdminError('load');
  }
  assertAdmin(access);
  if (pinsResult.error || !Array.isArray(pinsResult.data)) throw new DirectoryPinAdminError('load');

  const savedPins: DirectoryPinValues = {};
  for (const slug of slugs) {
    const record = pinsResult.data.find(row => row.key === pinKey(slug));
    if (record && typeof record.value === 'string') savedPins[slug] = record.value;
  }
  return { societies, savedPins };
}

export async function saveDirectoryPins({ store, drafts, savedPins, slugs, ...access }: AdminAccess & {
  store: DirectoryPinStore;
  drafts: DirectoryPinValues;
  savedPins: DirectoryPinValues;
  slugs: string[];
}) {
  assertAdmin(access);
  const allowed = new Set(slugs.filter(slug => slug && slug !== 'geral'));
  if (Object.keys(drafts).some(slug => !allowed.has(slug))) throw new DirectoryPinAdminError('invalid');
  const updatedAt = new Date().toISOString();
  const updates: DirectoryPinUpdate[] = [];
  for (const slug of allowed) {
    const value = drafts[slug] ?? '';
    const saved = savedPins[slug] ?? '';
    if (value === saved) continue;
    if (!value && !saved) continue;
    if (!isValidDirectoryPin(value)) throw new DirectoryPinAdminError('invalid');
    updates.push({ key: pinKey(slug), value, updated_at: updatedAt });
  }
  if (!updates.length) return { savedPins: { ...savedPins }, changed: false };

  let result: QueryResult<DirectoryPinRecord[]>;
  try {
    result = await store.savePins(updates);
  } catch {
    throw new DirectoryPinAdminError('save');
  }
  assertAdmin(access);
  if (result.error) throw new DirectoryPinAdminError('save');
  if (!Array.isArray(result.data) || updates.some(update => !result.data.some(row => row.key === update.key && row.value === update.value))) {
    throw new DirectoryPinAdminError('confirmation');
  }
  const confirmedPins = { ...savedPins };
  for (const slug of allowed) {
    if (updates.some(update => update.key === pinKey(slug))) confirmedPins[slug] = drafts[slug];
  }
  return { savedPins: confirmedPins, changed: true };
}

export async function copySavedDirectoryPin({ draft, saved, clipboard, ...access }: AdminAccess & {
  draft: string;
  saved: string;
  clipboard?: { writeText(value: string): Promise<void> };
}) {
  assertAdmin(access);
  if (directoryPinStatus(draft, saved) !== 'saved') throw new DirectoryPinAdminError('copy-unsaved');
  if (!clipboard?.writeText) throw new DirectoryPinAdminError('clipboard');
  try {
    await clipboard.writeText(saved);
  } catch {
    throw new DirectoryPinAdminError('clipboard');
  }
  assertAdmin(access);
}
