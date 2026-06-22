import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ExitConfirmDialog } from './ExitConfirmDialog';

/**
 * Intercepts the browser/device "back" navigation and asks the user to
 * confirm before leaving the current page. Works globally on every route.
 */
export function BackConfirmGuard() {
  const [open, setOpen] = useState(false);
  const confirmedRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    // Push a sentinel entry so the first "back" press is captured here.
    window.history.pushState({ __backGuard: true }, '');

    const onPopState = () => {
      if (confirmedRef.current) {
        // User already confirmed: let the navigation proceed.
        return;
      }
      // Re-push the sentinel to cancel the back action and show the dialog.
      window.history.pushState({ __backGuard: true }, '');
      setOpen(true);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // Re-arm the guard whenever the route changes.
  }, [location.pathname]);

  const handleConfirm = () => {
    confirmedRef.current = true;
    setOpen(false);
    // Go back past the sentinel and the current page to the previous screen.
    window.history.go(-2);
    // Reset the flag shortly after so the guard re-arms on the new page.
    setTimeout(() => {
      confirmedRef.current = false;
    }, 100);
  };

  return (
    <ExitConfirmDialog
      open={open}
      onOpenChange={setOpen}
      onConfirm={handleConfirm}
      title="Sair desta página?"
      description="Você tem certeza que deseja voltar? As alterações não salvas podem ser perdidas."
    />
  );
}
