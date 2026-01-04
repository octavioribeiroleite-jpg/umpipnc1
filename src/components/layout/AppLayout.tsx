import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container py-6 px-4 lg:px-8">{children}</div>
        </main>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        <MobileNav />
        <main className="pt-20 pb-6 px-4">{children}</main>
      </div>
    </div>
  );
}
