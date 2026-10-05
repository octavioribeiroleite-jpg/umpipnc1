import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const { loading: readLoading, hasSnapshot, error: readError, run: runRead } = useSnapshotRead(JSON.stringify([societyId, type]));
  const [transactions, setTransactions] = useState<Tx[]>([]);

  const fetchTransactions = useCallback(() => runRead(async () => {
    let query = supabase.from('transactions').select('id, date, description, amount, type').order('date', { ascending: false });
    if (type && type !== 'all') query = query.eq('type', type);
    if (societyId) query = query.eq('society_id', societyId);
    const { data, error } = await query;
    if (error) throw error;
    return () => setTransactions(data || []);
  }), [type, societyId, runRead]);

  useEffect(() => {
    if (type) void fetchTransactions();
  }, [type, fetchTransactions]);

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
      <DialogContent className="finance-dialog max-h-[92dvh] w-[calc(100%_-_1.25rem)] max-w-2xl overflow-y-auto rounded-[22px] p-4 sm:w-full sm:p-6">
        <DialogHeader className="pr-7">
          <DialogTitle className="text-lg sm:text-xl">{type ? TITLES[type] : ''}</DialogTitle>
        </DialogHeader>

        {readError && <QueryErrorState message="Não foi possível consultar o extrato." onRetry={() => void fetchTransactions()} retrying={readLoading} hasPreviousData={hasSnapshot} />}
        {!hasSnapshot ? (readLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : null) : transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="finance-inline-values">
              <div className="min-w-0 rounded-xl bg-success/10 p-2 text-center sm:p-3">
                <p className="text-xs text-muted-foreground sm:text-xs">Receitas</p>
                <p className="mt-0.5 min-w-0 whitespace-normal break-words finance-metric-number font-bold text-success">{brl(totalEntradas)}</p>
              </div>
              <div className="min-w-0 rounded-xl bg-destructive/10 p-2 text-center sm:p-3">
                <p className="text-xs text-muted-foreground sm:text-xs">Gastos</p>
                <p className="mt-0.5 min-w-0 whitespace-normal break-words finance-metric-number font-bold text-destructive">{brl(totalSaidas)}</p>
              </div>
              <div className="min-w-0 rounded-xl bg-muted p-2 text-center sm:p-3">
                <p className="text-xs text-muted-foreground sm:text-xs">Saldo</p>
                <p className={`mt-0.5 min-w-0 whitespace-normal break-words finance-metric-number font-bold ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {brl(saldo)}
                </p>
              </div>
            </div>

            {groups.map((group) => (
              <div key={group.key} className="overflow-hidden rounded-xl border">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/50 px-3 py-2">
                  <span className="min-w-0 whitespace-normal break-words text-xs font-semibold sm:text-sm">{group.label}</span>
                  <span className={`flex-shrink-0 finance-metric-number font-bold ${group.saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {brl(group.saldo)}
                  </span>
                </div>
                <div className="divide-y">
                  {group.items.map((transaction) => (
                    <div key={transaction.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {transaction.type === 'entrada'
                          ? <TrendingUp className="h-4 w-4 flex-shrink-0 text-success" />
                          : <TrendingDown className="h-4 w-4 flex-shrink-0 text-destructive" />}
                        <div className="min-w-0">
                          <p className="min-w-0 whitespace-normal break-words text-xs sm:text-sm">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground sm:text-xs">
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
