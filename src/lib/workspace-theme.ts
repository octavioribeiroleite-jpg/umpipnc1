/** Retain a shared body theme across nested workspace shells and portals. */
interface ThemeHost {
  classList: Pick<DOMTokenList, 'contains' | 'add' | 'remove'>;
}
const owners = new WeakMap<ThemeHost, { count: number; alreadyPresent: boolean }>();
const workspaceClass = 'ipnc-workspace-theme';

export function retainWorkspaceTheme(host: ThemeHost): () => void {
  let state = owners.get(host);
  if (!state) {
    state = { count: 0, alreadyPresent: host.classList.contains(workspaceClass) };
    owners.set(host, state);
  }
  state.count += 1;
  host.classList.add(workspaceClass);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.count -= 1;
    if (state.count === 0) {
      if (!state.alreadyPresent) host.classList.remove(workspaceClass);
      owners.delete(host);
    }
  };
}
