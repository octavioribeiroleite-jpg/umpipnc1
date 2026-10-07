import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ExitConfirmDialog, useExitConfirm } from './ExitConfirmDialog';
import { getAppNavigationItems, isNavigationPathActive } from './appNavigation';
import { NavigationSidebar } from './WorkspaceNavigation';

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();
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
    <NavigationSidebar items={items} onHome={() => navigate('/')} onExit={requestExit} profile={profile ? { name: profile.full_name, description: profile.email } : undefined} />
    <ExitConfirmDialog open={showConfirm} onOpenChange={setShowConfirm} onConfirm={handleSignOut} />
  </>;
}
