import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

export type ExtratoType = 'all' | 'entrada' | 'saida';

interface Tx {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const brl = (v: number) => `R$ ${(v || 0).toFixed(2).replace('.', ',')}`;

const TITLES: Record<ExtratoType, string> = {
  all: 'Extrato Completo',
  entrada: 'Extrato de Receitas',
  saida: 'Extrato de Gastos',
};

interface Props {
  type: ExtratoType | null;
  onClose: () => void;
}

export function ExtratoDialog({ type, onClose }: Props) {
  const { effectiveSocietyId: societyId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    if (!type) return;
    const fetchTx = async () => {
      setLoading(true);
      let q = supabase
        .from('transactions')
        .select('id, date, description, amount, type')
        .order('date', { ascending: false });
      if (type !== 'all') q = q.eq('type', type);
      if (societyId) q = q.eq('society_id', societyId);
      const { data } = await q;
      setTxs((data || []) as Tx[]);
      setLoading(false);
    };
    fetchTx();
  }, [type, societyId]);

  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>();
    for (const t of txs) {
      const [y, m] = t.date.split('-');
      const key = `${y}-${m}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const [y, m] = key.split('-');
      const entradas = items.filter(i => i.type === 'entrada').reduce((s, i) => s + Number(i.amount), 0);
      const saidas = items.filter(i => i.type === 'saida').reduce((s, i) => s + Number(i.amount), 0);
      return {
        key,
        label: `${MONTHS[parseInt(m, 10) - 1]} / ${y}`,
        items,
        entradas,
        saidas,
        saldo: entradas - saidas,
      };
    });
  }, [txs]);

  const totalEntradas = txs.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.amount), 0);
  const totalSaidas = txs.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <Dialog open={!!type} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type ? TITLES[type] : ''}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : txs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada</p>
        ) : (
          <div className="space-y-4">
            {/* Totais gerais */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-success/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="text-sm font-bold text-success">{brl(totalEntradas)}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Gastos</p>
                <p className="text-sm font-bold text-destructive">{brl(totalSaidas)}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-sm font-bold ${totalEntradas - totalSaidas >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {brl(totalEntradas - totalSaidas)}
                </p>
              </div>
            </div>

            {/* Por mês (extrato) */}
            {groups.map(g => (
              <div key={g.key} className="rounded-lg border">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-t-lg">
                  <span className="text-sm font-semibold">{g.label}</span>
                  <span className={`text-sm font-bold ${g.saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {brl(g.saldo)}
                  </span>
                </div>
                <div className="divide-y">
                  {g.items.map(t => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {t.type === 'entrada'
                          ? <TrendingUp className="h-4 w-4 text-success shrink-0" />
                          : <TrendingDown className="h-4 w-4 text-destructive shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm truncate">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium shrink-0 ${t.type === 'entrada' ? 'text-success' : 'text-destructive'}`}>
                        {t.type === 'entrada' ? '+' : '-'}{brl(Number(t.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
