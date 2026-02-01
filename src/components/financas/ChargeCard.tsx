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
    return <Badge variant="secondary" className="text-[10px] bg-warning/20 text-warning-foreground border-warning">Parcial</Badge>;
  }
  
  const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pago: 'default',
    pendente: 'destructive',
    isento: 'secondary',
    cancelado: 'outline',
  };
  
  return <Badge variant={statusVariants[status]} className="text-[10px]">{statusLabels[status]}</Badge>;
}

export function ChargeCard({
  memberName,
  mensalidade,
  percapita,
  hasPendingCharges,
  onPayment,
  onViewMensalidade,
  onViewPercapita,
}: ChargeCardProps) {
  const dueDate = mensalidade?.due_date || percapita?.due_date;

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm truncate">{memberName}</h4>
            </div>

            <div className="space-y-2">
              {mensalidade && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Mensalidade</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      R$ {mensalidade.amount.toFixed(2).replace('.', ',')}
                    </span>
                    {getStatusBadge(mensalidade.status, mensalidade.amount, mensalidade.paid_amount)}
                  </div>
                </div>
              )}

              {percapita && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Per Capita</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      R$ {percapita.amount.toFixed(2).replace('.', ',')}
                    </span>
                    {getStatusBadge(percapita.status, percapita.amount, percapita.paid_amount)}
                  </div>
                </div>
              )}

              {dueDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                  <Calendar className="h-3 w-3" />
                  Venc: {new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {hasPendingCharges && (
              <Button size="sm" onClick={onPayment} className="h-8">
                <Check className="h-3 w-3 mr-1" />
                Baixa
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
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
