import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileHeader } from './MobileHeader';
import { OfflineBanner } from '@/components/OfflineBanner';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen">
      <OfflineBanner />
      {/* Desktop layout with sidebar */}
      <div className="hidden md:flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 overflow-auto bg-background/85 backdrop-blur-sm">
          <div className="container py-4 md:py-6 px-4 lg:px-8">{children}</div>
        </main>
      </div>

      {/* Mobile layout with hamburger menu */}
      <div className="md:hidden flex flex-col min-h-screen">
        <MobileHeader />
        <main className="flex-1 overflow-auto pt-14 px-3 pb-4 bg-background/85 backdrop-blur-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
