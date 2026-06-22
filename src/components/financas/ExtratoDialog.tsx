import { useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

const brl = (value: number) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

const TITLES: Record<ExtratoType, string> = {
  all: 'Extrato completo',
  entrada: 'Extrato de receitas',
  saida: 'Extrato de gastos',
};

interface Props {
  type: ExtratoType | null;
  onClose: () => void;
}

export function ExtratoDialog({ type, onClose }: Props) {
  const { effectiveSocietyId: societyId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Tx[]>([]);

  useEffect(() => {
    if (!type) return;

    const fetchTransactions = async () => {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select('id, date, description, amount, type')
        .order('date', { ascending: false });

      if (type !== 'all') query = query.eq('type', type);
      if (societyId) query = query.eq('society_id', societyId);

      const { data } = await query;
      setTransactions((data || []) as Tx[]);
      setLoading(false);
    };

    void fetchTransactions();
  }, [type, societyId]);

  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>();

    for (const transaction of transactions) {
      const [year, month] = transaction.date.split('-');
      const key = `${year}-${month}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(transaction);
    }

    return Array.from(map.entries()).map(([key, items]) => {
      const [year, month] = key.split('-');
      const entradas = items
        .filter((item) => item.type === 'entrada')
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const saidas = items
        .filter((item) => item.type === 'saida')
        .reduce((sum, item) => sum + Number(item.amount), 0);

      return {
        key,
        label: `${MONTHS[parseInt(month, 10) - 1]} / ${year}`,
        items,
        saldo: entradas - saidas,
      };
    });
  }, [transactions]);

  const totalEntradas = transactions
    .filter((transaction) => transaction.type === 'entrada')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalSaidas = transactions
    .filter((transaction) => transaction.type === 'saida')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <Dialog open={Boolean(type)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%_-_1.25rem)] max-w-2xl overflow-y-auto rounded-[22px] p-4 sm:w-full sm:p-6">
        <DialogHeader className="pr-7">
          <DialogTitle className="text-lg sm:text-xl">{type ? TITLES[type] : ''}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div className="min-w-0 rounded-xl bg-success/10 p-2 text-center sm:p-3">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Receitas</p>
                <p className="mt-0.5 truncate text-xs font-bold tabular-nums text-success sm:text-sm">{brl(totalEntradas)}</p>
              </div>
              <div className="min-w-0 rounded-xl bg-destructive/10 p-2 text-center sm:p-3">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Gastos</p>
                <p className="mt-0.5 truncate text-xs font-bold tabular-nums text-destructive sm:text-sm">{brl(totalSaidas)}</p>
              </div>
              <div className="min-w-0 rounded-xl bg-muted p-2 text-center sm:p-3">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Saldo</p>
                <p className={`mt-0.5 truncate text-xs font-bold tabular-nums sm:text-sm ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {brl(saldo)}
                </p>
              </div>
            </div>

            {groups.map((group) => (
              <div key={group.key} className="overflow-hidden rounded-xl border">
                <div className="flex items-center justify-between gap-2 bg-muted/50 px-3 py-2">
                  <span className="truncate text-xs font-semibold sm:text-sm">{group.label}</span>
                  <span className={`flex-shrink-0 text-xs font-bold tabular-nums sm:text-sm ${group.saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {brl(group.saldo)}
                  </span>
                </div>
                <div className="divide-y">
                  {group.items.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        {transaction.type === 'entrada'
                          ? <TrendingUp className="h-4 w-4 flex-shrink-0 text-success" />
                          : <TrendingDown className="h-4 w-4 flex-shrink-0 text-destructive" />}
                        <div className="min-w-0">
                          <p className="truncate text-xs sm:text-sm">{transaction.description}</p>
                          <p className="text-[10px] text-muted-foreground sm:text-xs">
                            {new Date(`${transaction.date}T00:00:00`).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-semibold tabular-nums sm:text-sm ${transaction.type === 'entrada' ? 'text-success' : 'text-destructive'}`}>
                        {transaction.type === 'entrada' ? '+' : '-'}{brl(Number(transaction.amount))}
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
