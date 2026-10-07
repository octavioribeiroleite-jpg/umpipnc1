import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ExitConfirmDialog, useExitConfirm } from './ExitConfirmDialog';
import { getAppNavigationItems, isNavigationPathActive } from './appNavigation';
import { NavigationRail } from './WorkspaceNavigation';

export function TabletNavigationRail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();
  const { showConfirm, setShowConfirm, requestExit } = useExitConfirm();
  const items = getAppNavigationItems(isAdmin).map(item => ({
    ...item,
    active: isNavigationPathActive(location.pathname, item.path),
    onClick: () => navigate(item.path),
  }));
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return <>
    <NavigationRail items={items} onHome={() => navigate('/')} onExit={requestExit} />
    <ExitConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} onConfirm={handleSignOut} />
  </>;
}
