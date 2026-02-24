import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Calendar, Megaphone, MessageSquare, Heart, Globe, Vote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export function PastorMobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [societies, setSocieties] = useState<Society[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name')
      .then(({ data }) => { if (data) setSocieties(data); });
  }, []);

  const isActive = (path: string) => {
    if (path === '/pastor') return location.pathname === '/pastor';
    return location.pathname.startsWith(path);
  };

  const isSocietyActive = location.pathname.startsWith('/pastor/sociedade');

  const items = [
    { path: '/pastor', icon: LayoutDashboard, label: 'Geral' },
    { path: 'societies', icon: Users, label: 'Sociedades' },
    { path: '/pastor/calendario', icon: Calendar, label: 'Calendário' },
    { path: '/pastor/comunicados', icon: Megaphone, label: 'Comunicados' },
    { path: '/pastor/sugestoes', icon: MessageSquare, label: 'Sugestões' },
    { path: '/eleicoes', icon: Vote, label: 'Eleições' },
    { path: '/dizimos', icon: Heart, label: 'Dízimos' },
    { path: '/visitantes', icon: Globe, label: 'Visitantes' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        {items.map(item => {
          if (item.path === 'societies') {
            return (
              <Sheet key="societies" open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                      isSocietyActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-xl">
                  <SheetHeader>
                    <SheetTitle>Sociedades</SheetTitle>
                  </SheetHeader>
                  <div className="grid gap-2 py-4">
                    {societies.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { navigate(`/pastor/sociedade/${s.slug}`); setSheetOpen(false); }}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                          location.pathname === `/pastor/sociedade/${s.slug}` ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        )}
                      >
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="font-medium">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isActive(item.path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
