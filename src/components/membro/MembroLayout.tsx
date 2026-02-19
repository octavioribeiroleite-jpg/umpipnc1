import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, CreditCard, LogOut } from 'lucide-react';
import logoIpnc from '@/assets/logo-ipnc.png';

interface MembroLayoutProps {
  children: ReactNode;
  activeTab: 'eventos' | 'pagamentos';
  onTabChange: (tab: 'eventos' | 'pagamentos') => void;
}

export function MembroLayout({ children, activeTab, onTabChange }: MembroLayoutProps) {
  const { profile, signOut, society } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card safe-top">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <img src={logoIpnc} alt="IPNC" className="h-8 w-8 object-contain" />
            <div>
              <p className="font-semibold text-sm leading-tight">{profile?.full_name || 'Membro'}</p>
              {society && (
                <p className="text-xs text-muted-foreground">{society.name}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="max-w-2xl mx-auto w-full p-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card safe-bottom">
        <div className="flex max-w-2xl mx-auto">
          <button
            onClick={() => onTabChange('eventos')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              activeTab === 'eventos' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Calendar className="h-5 w-5" />
            Eventos
          </button>
          <button
            onClick={() => onTabChange('pagamentos')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              activeTab === 'pagamentos' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <CreditCard className="h-5 w-5" />
            Pagamentos
          </button>
        </div>
      </nav>
    </div>
  );
}
