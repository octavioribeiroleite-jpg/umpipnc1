import { useEffect } from 'react';
import { retainWorkspaceTheme } from '@/lib/workspace-theme';
import '@/components/layout/diretoria-theme.css';

/** Body scope includes menus and dialogs portalled outside the active shell. */
export function useWorkspaceTheme(active = true): void {
  useEffect(() => {
    if (!active) return;
    return retainWorkspaceTheme(document.body);
  }, [active]);
}
