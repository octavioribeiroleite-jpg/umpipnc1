import { Cake, Copy, Edit, ToggleLeft, ToggleRight, Trash2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Birthday } from '@/hooks/useBirthdays';

interface BirthdayCardProps {
  birthday: Birthday;
  showActions?: boolean;
  highlight?: 'today' | 'week' | 'none';
  onEdit?: (b: Birthday) => void;
  onToggleActive?: (b: Birthday) => void;
  onDelete?: (b: Birthday) => void;
}

export function BirthdayCard({ birthday, showActions, highlight = 'none', onEdit, onToggleActive, onDelete }: BirthdayCardProps) {
  const dateStr = `${String(birthday.dia).padStart(2, '0')}/${String(birthday.mes).padStart(2, '0')}`;

  const handleCopy = () => {
    const msg = `Hoje celebramos o aniversário de ${birthday.nome}. Que Deus abençoe sua vida com graça, saúde e paz.`;
    navigator.clipboard.writeText(msg);
    toast.success('Mensagem copiada!');
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      highlight === 'today' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' :
      highlight === 'week' ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800' :
      'bg-card border-border'
    }`}>
      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
        highlight === 'today' ? 'bg-emerald-100 dark:bg-emerald-900' :
        highlight === 'week' ? 'bg-sky-100 dark:bg-sky-900' :
        'bg-muted'
      }`}>
        <Cake className={`h-5 w-5 ${
          highlight === 'today' ? 'text-emerald-600 dark:text-emerald-400' :
          highlight === 'week' ? 'text-sky-600 dark:text-sky-400' :
          'text-muted-foreground'
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{birthday.nome}</span>
          {birthday.pendente_revisao && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              Revisar
            </Badge>
          )}
          {!birthday.ativo && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inativo</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{dateStr}</span>
          {birthday.departamento && (
            <span className="text-xs text-muted-foreground">• {birthday.departamento}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {highlight === 'today' && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} title="Copiar mensagem">
            <Copy className="h-4 w-4" />
          </Button>
        )}
        {showActions && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit?.(birthday)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleActive?.(birthday)}>
              {birthday.ativo ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete?.(birthday)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
