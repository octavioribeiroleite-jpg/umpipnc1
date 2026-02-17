import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SocietyStats {
  membersActive: number;
  tasksPending: number;
  saldo: number;
}

export function SocietyOverviewCard({ society }: { society: Society }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SocietyStats>({ membersActive: 0, tasksPending: 0, saldo: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [membersRes, tasksRes, transRes, paymentsRes] = await Promise.all([
        supabase.from('members').select('id').eq('active', true).eq('society_id', society.id),
        supabase.from('tasks').select('id').neq('status', 'done').eq('society_id', society.id),
        supabase.from('transactions').select('amount, type').eq('society_id', society.id),
        supabase.from('membership_payments').select('amount, status, member_id').eq('status', 'pago'),
      ]);

      const trans = transRes.data || [];
      const entradas = trans.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.amount), 0);
      const saidas = trans.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.amount), 0);

      // Filter payments by members of this society
      const memberIds = new Set((membersRes.data || []).map(m => m.id));
      const mensalidades = (paymentsRes.data || []).filter(p => memberIds.has(p.member_id)).reduce((s, p) => s + Number(p.amount), 0);

      setStats({
        membersActive: (membersRes.data || []).length,
        tasksPending: (tasksRes.data || []).length,
        saldo: mensalidades + entradas - saidas,
      });
    };
    fetchStats();
  }, [society.id]);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/pastor/sociedade/${society.slug}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: society.color }}>
              {society.name.substring(0, 3)}
            </div>
            <div>
              <p className="font-semibold text-sm">{society.name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{stats.membersActive} membros</span>
                <span>{stats.tasksPending} tarefas</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${stats.saldo >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              R$ {stats.saldo.toFixed(0)}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
