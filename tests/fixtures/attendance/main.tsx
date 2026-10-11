import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import AppShell from '@/components/layout/AppShell';
import Secretaria from '@/pages/Secretaria';
import { startSystemTheme } from '@/lib/system-theme';
import { startAppOpening } from '@/lib/app-opening';
import { applyFixtureSafeAreas } from '../mobile-safe-area';
import { fixture } from './backend';
import '../../../src/index.css';
import '../../../src/responsive-foundation.css';
import '../../../src/auth-readability.css';
import '../../../src/society-selector.css';
import '../../../src/identity-confirmation.css';
import '../../../src/interface-system.css';
import '../../../src/mobile-app-shell.css';
import '../../../src/opening.css';

applyFixtureSafeAreas(new URLSearchParams(location.search));
const stopTheme = startSystemTheme();
const root = document.getElementById('root')!;
const splash = document.getElementById('ipnc-opening');
const opening = splash ? startAppOpening({ root, splash }) : null;
function Fixture() {
  const [, render] = useState(0);
  fixture.onChange = () => render(value => value + 1);
  return <><Secretaria /><output id="attendance-fixture-evidence" hidden>{JSON.stringify({ isolated: true, role: fixture.role, writes: fixture.writes, rows: fixture.tables.ebd_attendance, visitors: fixture.tables.ebd_class_visitor_entries, statuses: fixture.tables.ebd_call_status, closures: fixture.tables.ebd_day_closures })}</output></>;
}
const reactRoot = createRoot(root);
reactRoot.render(<AppShell><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthProvider><TooltipProvider><BrowserRouter><Fixture /></BrowserRouter><Toaster /></TooltipProvider></AuthProvider></QueryClientProvider></AppShell>);
if (import.meta.hot) import.meta.hot.dispose(() => { reactRoot.unmount(); stopTheme(); opening?.stop(); });
