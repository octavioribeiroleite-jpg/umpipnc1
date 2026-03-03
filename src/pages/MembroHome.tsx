import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMembroSession } from '@/contexts/MembroSessionContext';
import { supabase } from '@/integrations/supabase/client';
import { MembroLayout, type MembroTab } from '@/components/membro/MembroLayout';
import { MembroInicio } from '@/components/membro/MembroInicio';
import { MembroEventos } from '@/components/membro/MembroEventos';
import { MembroPagamentos } from '@/components/membro/MembroPagamentos';
import { MembroComunicados } from '@/components/membro/MembroComunicados';
import { MembroDizimos } from '@/components/membro/MembroDizimos';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MembroHome() {
  const { session } = useMembroSession();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MembroTab>('inicio');

  useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  // Event notifications (7 days)
  useEffect(() => {
    if (!session) return;
    const key = `event-notif-membro-${session.memberId}`;
    if (sessionStorage.getItem(key)) return;

    const fetchUpcoming = async () => {
      const now = new Date();
      const inWeek = new Date();
      inWeek.setDate(inWeek.getDate() + 7);

      const { data } = await supabase
        .from('events')
        .select('title, start_date')
        .gte('start_date', now.toISOString())
        .lte('start_date', inWeek.toISOString())
        .neq('status', 'cancelado')
        .order('start_date', { ascending: true })
        .limit(3);

      if (data && data.length > 0) {
        sessionStorage.setItem(key, '1');
        data.forEach((event, i) => {
          const days = differenceInDays(new Date(event.start_date), now);
          const label = days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days} dias`;
          setTimeout(() => {
            toast(`📅 ${label}: ${event.title}`, {
              description: format(new Date(event.start_date), "EEEE, dd/MM", { locale: ptBR }),
              duration: 6000,
            });
          }, i * 1500);
        });
      }
    };
    fetchUpcoming();
  }, [session]);

  if (!session) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return <MembroInicio onTabChange={setActiveTab} />;
      case 'eventos':
        return <MembroEventos />;
      case 'pagamentos':
        return <MembroPagamentos />;
      case 'comunicados':
        return <MembroComunicados />;
      case 'dizimos':
        return <MembroDizimos />;
    }
  };

  return (
    <MembroLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </MembroLayout>
  );
}
