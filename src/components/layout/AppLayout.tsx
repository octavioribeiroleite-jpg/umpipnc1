import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileHeader } from './MobileHeader';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PullToRefresh } from './PullToRefresh';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <OfflineBanner />
      {/* Desktop layout with sidebar (>= lg breakpoint to give tablets the mobile UX) */}
      <div className="hidden lg:flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden bg-background/60 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-7xl py-4 md:py-6 px-4 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile + tablet layout with hamburger menu */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <MobileHeader />
        <main className="flex-1 overflow-x-hidden pt-14 px-3 sm:px-4 pb-4 bg-background/60 backdrop-blur-sm">
          <PullToRefresh>
            <div className="mx-auto w-full max-w-3xl">
              {children}
            </div>
          </PullToRefresh>
        </main>
      </div>
    </div>
  );
}
