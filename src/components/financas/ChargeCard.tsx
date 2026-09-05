import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, MoreHorizontal, Calendar, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type ChargeCardVariant = 'pendente' | 'pago' | 'parcial' | 'isento';

interface ChargeCardProps {
  memberName: string;
  mensalidade?: {
    amount: number;
    status: string;
    due_date: string;
    paid_amount?: number | null;
  } | null;
  percapita?: {
    amount: number;
    status: string;
    due_date?: string;
    paid_amount?: number | null;
  } | null;
  hasPendingCharges: boolean;
  variant?: ChargeCardVariant;
  onPayment: () => void;
  onViewMensalidade?: () => void;
  onViewPercapita?: () => void;
  onEditMensalidade?: () => void;
  onEditPercapita?: () => void;
}

const statusLabels: Record<string, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  isento: 'Isento',
  cancelado: 'Cancelado',
};

function getStatusBadge(status: string, amount: number, paidAmount?: number | null) {
  const isPartial = status === 'pago' && paidAmount !== null && paidAmount !== undefined && paidAmount < amount;
  
  if (isPartial) {
    return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400 border-0">Parcial</Badge>;
  }
  
  const badgeClasses: Record<string, string> = {
    pago: 'text-[10px] px-1.5 py-0 h-5 bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 border-0',
    pendente: 'text-[10px] px-1.5 py-0 h-5 bg-destructive/10 text-destructive border-0',
    isento: 'text-[10px] px-1.5 py-0 h-5 bg-muted text-muted-foreground border-0',
    cancelado: 'text-[10px] px-1.5 py-0 h-5',
  };
  
  return <Badge variant="secondary" className={badgeClasses[status] || badgeClasses.cancelado}>{statusLabels[status]}</Badge>;
}

const variantStyles: Record<ChargeCardVariant, string> = {
  pendente: 'border-l-4 border-l-destructive bg-destructive/5',
  pago: 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20',
  parcial: 'border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
  isento: 'border-l-4 border-l-muted bg-muted/30 opacity-75',
};

export function ChargeCard({
  memberName,
  mensalidade,
  percapita,
  hasPendingCharges,
  variant,
  onPayment,
  onViewMensalidade,
  onViewPercapita,
}: ChargeCardProps) {
  const dueDate = mensalidade?.due_date || percapita?.due_date;

  // Calculate total value
  const totalValue = (mensalidade?.amount || 0) + (percapita?.amount || 0);

  return (
    <Card className={cn('mb-1.5', variant && variantStyles[variant])}>
      <CardContent className="px-3 py-2">
        <div className="flex items-center justify-between gap-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold min-w-0 whitespace-normal break-words">{memberName}</h4>
              <span className="text-xs font-bold text-foreground whitespace-nowrap">
                R$ {totalValue.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              {mensalidade && (
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px] text-muted-foreground">M</span>
                  {getStatusBadge(mensalidade.status, mensalidade.amount, mensalidade.paid_amount)}
                </div>
              )}
              {percapita && (
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px] text-muted-foreground">PC</span>
                  {getStatusBadge(percapita.status, percapita.amount, percapita.paid_amount)}
                </div>
              )}
              {dueDate && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                  <Calendar className="h-2.5 w-2.5" />
                  {new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {hasPendingCharges && (
              <Button size="sm" onClick={onPayment} className="h-7 px-2 text-[11px]">
                <Check className="h-3 w-3" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {mensalidade?.status === 'pago' && onViewMensalidade && (
                  <DropdownMenuItem onClick={onViewMensalidade}>
                    Ver Mensalidade
                  </DropdownMenuItem>
                )}
                {percapita?.status === 'pago' && onViewPercapita && (
                  <DropdownMenuItem onClick={onViewPercapita}>
                    Ver Per Capita
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
