export type EbdView = 'home' | 'chamada' | 'historico' | 'turmas' | 'aniversariantes' | 'planilha' | 'configuracoes' | 'acessos';
export interface EbdScreen { view: EbdView; day?: string; editing?: boolean; classId?: string; managedClassId?: string }
export interface EbdTrail { owner: string; id: string; screens: EbdScreen[] }
export const EBD_NAVIGATION_KEY = 'ebd_navigation_v1';
const views: EbdView[] = ['home','chamada','historico','turmas','aniversariantes','planilha','configuracoes','acessos'];
export function validTrail(value: unknown, owner: string): value is EbdTrail {
  if (!value || typeof value !== 'object') return false;
  const trail = value as EbdTrail;
  return trail.owner === owner && typeof trail.id === 'string' && Array.isArray(trail.screens) && trail.screens.length > 0 && trail.screens.every(screen => screen && views.includes(screen.view) && (!screen.day || /^\d{4}-\d{2}-\d{2}$/.test(screen.day)) && (!screen.classId || typeof screen.classId === 'string') && (!screen.managedClassId || typeof screen.managedClassId === 'string'));
}
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
interface NavigationHost {
  history: { state: Record<string, unknown> | null; pushState(data: unknown, unused: string, url?: string): void; replaceState(data: unknown, unused: string, url?: string): void; go(delta: number): void };
  location: { pathname: string };
  addEventListener(type: string, handler: (event: { state: Record<string, unknown> | null }) => void): void;
  removeEventListener(type: string, handler: (event: { state: Record<string, unknown> | null }) => void): void;
}

// A same-route floor keeps browser/Android Back inside Secretaria until the user
// confirms logout. Every real internal screen has its own native history entry.
export function createEbdNavigation(host: NavigationHost, stores: StorageLike[], owner: string, callbacks: { change: (screen: EbdScreen) => void; exit: () => void; intercept?: () => boolean }) {
  let trail: EbdTrail = { owner, id: crypto.randomUUID(), screens: [{view:'home'}] };
  let active = false;
  const current = () => trail.screens[trail.screens.length - 1];
  const url = (screen: EbdScreen) => {
    const query = new URLSearchParams({ view: screen.view });
    if (screen.day) query.set('day', screen.day);
    if (screen.editing) query.set('edit', '1');
    if (screen.classId) query.set('class', screen.classId);
    if (screen.managedClassId) query.set('group', screen.managedClassId);
    return `${host.location.pathname}?${query}`;
  };
  const persist = () => { for (const store of stores) try { store.setItem(EBD_NAVIGATION_KEY, JSON.stringify(trail)); } catch { /* History still works without storage. */ } };
  const publish = () => { persist(); callbacks.change(current()); };
  const push = () => host.history.pushState({ ...host.history.state, idx: Number(host.history.state?.idx || 0) + 1, ebdFloor: false, ebdTrail: trail }, '', url(current()));
  const pop = (event: { state: Record<string, unknown> | null }) => {
    if (!active) return;
    if (callbacks.intercept?.()) { push(); publish(); return; }
    const next = event.state?.ebdTrail;
    if (!event.state?.ebdFloor && validTrail(next, owner) && next.id === trail.id) {
      trail = next; publish();
    } else {
      // Synchronous restoration also handles repeated Back presses while the
      // confirmation is visible, without exposing the previous login page.
      push(); publish(); callbacks.exit();
    }
  };
  return {
    start() {
      if (active) return;
      let savedTrail: EbdTrail | null = null;
      for (const store of stores) {
        try { const saved = JSON.parse(store.getItem(EBD_NAVIGATION_KEY) || 'null'); if (validTrail(saved, owner)) { savedTrail = saved; break; } } catch { /* Ignore invalid persisted UI state. */ }
      }
      const existing = host.history.state?.ebdTrail;
      if (validTrail(existing, owner) && !host.history.state?.ebdFloor && savedTrail?.id === existing.id) trail = existing;
      else {
        if (savedTrail) trail = savedTrail;
        const screens = trail.screens;
        host.history.replaceState({ ...host.history.state, ebdFloor: true, ebdTrail: null }, '', url({view:'home'}));
        for (let index = 0; index < screens.length; index++) { trail = { ...trail, screens: screens.slice(0,index+1) }; push(); }
      }
      active = true;
      host.addEventListener('popstate', pop); publish();
    },
    open(screen: EbdScreen) {
      if (!active || JSON.stringify(screen) === JSON.stringify(current())) return;
      trail = { ...trail, screens: [...trail.screens, screen] };
      push(); publish();
    },
    back() { if (!active) return; if (trail.screens.length > 1) host.history.go(-1); else if (!callbacks.intercept?.()) callbacks.exit(); },
    backTo(matches: (screen: EbdScreen) => boolean) {
      for (let index = trail.screens.length - 2; index >= 0; index--) if (matches(trail.screens[index])) { host.history.go(index - trail.screens.length + 1); return; }
      this.back();
    },
    stop() { active = false; host.removeEventListener('popstate', pop); },
    clear() { this.stop(); for (const store of stores) try { store.removeItem(EBD_NAVIGATION_KEY); } catch { /* Ignore unavailable storage. */ } },
  };
}
