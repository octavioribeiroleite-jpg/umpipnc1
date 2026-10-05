import { useState } from 'react';
import { Cake, Copy, Sparkles, Check, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Birthday } from '@/hooks/useBirthdays';

interface Props {
  variant?: 'default' | 'secretaria';
  onViewAll?: () => void;
  isLoading?: boolean;
  birthdays: (Birthday & { daysUntil: number })[];
  aiToken?: string;
  aiExpiresAt?: string;
  onAiSessionExpired: () => void;
}

export function WeekAnnouncementCard({ birthdays, aiToken, aiExpiresAt, onAiSessionExpired, variant = 'default', onViewAll, isLoading = false }: Props) {
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSecretaria = variant === 'secretaria';
  if (birthdays.length === 0 && !isSecretaria) return null;

  const simpleList = birthdays
    .map(b => `${String(b.dia).padStart(2, '0')}/${String(b.mes).padStart(2, '0')} - ${b.nome}`)
    .join('\n');

  const handleCopyList = async () => {
    await navigator.clipboard.writeText(`🎂 Aniversariantes da Semana:\n\n${simpleList}`);
    toast.success('Lista copiada!');
  };

  const handleGenerate = async () => {
    if (!aiToken || !aiExpiresAt || !Number.isFinite(Date.parse(aiExpiresAt)) || Date.parse(aiExpiresAt) <= Date.now()) {
      onAiSessionExpired();
      return;
    }
    setLoading(true);
    setAiMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-birthday-announcement', {
        body: {
          ebd_ai_token: aiToken,
          birthdays: birthdays.map(b => ({ nome: b.nome, dia: b.dia, mes: b.mes })),
        },
      });

      if (error) {
        let details: { error?: string; code?: string } | null = null;
        try { details = await error.context?.clone().json(); } catch { /* sanitized fallback */ }
        if (details?.code === 'ebd_ai_session_expired_or_invalid') {
          onAiSessionExpired();
          return;
        }
        throw new Error(details?.error || 'Não foi possível gerar a mensagem agora.');
      }
      if (data?.error) throw new Error(data.error);

      setAiMessage(data.message);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!aiMessage) return;
    await navigator.clipboard.writeText(aiMessage);
    setCopied(true);
    toast.success('Mensagem copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={isSecretaria ? "ebd-birthdays ebd-surface" : "border-border bg-card"}>
      <CardContent className={isSecretaria ? "ebd-birthdays-content" : "pt-4 pb-4 space-y-3"}>
        {isSecretaria ? (
          <div className="ebd-birthdays-heading">
            <div><h2>Aniversariantes da semana</h2><p>{isLoading ? "Carregando aniversariantes…" : `${birthdays.length} aniversariante${birthdays.length === 1 ? "" : "s"}`}</p></div>
            {onViewAll && <button type="button" className="ebd-view-all" onClick={onViewAll}>Ver todos<ChevronRight aria-hidden="true" /></button>}
          </div>
        ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Cake className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Aniversariantes da Semana</h2>
          <span className="ml-auto text-xs text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full">
            {birthdays.length} pessoa{birthdays.length > 1 ? 's' : ''}
          </span>
        </div>

        )}

        {isSecretaria && !isLoading && birthdays.length === 0 && <p className="ebd-empty">Nenhum aniversariante nesta semana.</p>}
        <div className={isSecretaria ? "ebd-birthday-list" : "space-y-1"}>
          {(isSecretaria && onViewAll ? birthdays.slice(0, 3) : birthdays).map(b => (
            <div key={b.id} className={isSecretaria ? "ebd-birthday-row" : "flex flex-wrap items-center gap-2 text-sm"}>
              <span className={isSecretaria ? "ebd-birthday-date" : "shrink-0 text-muted-foreground tabular-nums text-sm w-12"}>
                {String(b.dia).padStart(2, '0')}/{String(b.mes).padStart(2, '0')}
              </span>
              <span className={isSecretaria ? "ebd-birthday-name" : "min-w-0 flex-1 break-words font-medium"}>{b.nome}</span>
              {b.daysUntil === 0 && (
                <span className={isSecretaria ? "ebd-birthday-today" : "text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"}>HOJE</span>
              )}
            </div>
          ))}
        </div>

        {birthdays.length > 0 && <div className={isSecretaria ? "ebd-birthday-actions" : "flex flex-col gap-2 pt-1 sm:flex-row"}>
          <Button variant="outline" size="sm" className={isSecretaria ? "ebd-secondary-button" : "min-h-11 text-sm flex-1"} onClick={handleCopyList}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copiar lista
          </Button>
          <Button
            size="sm"
            variant={isSecretaria ? "outline" : "default"}
            className={isSecretaria ? "ebd-secondary-button" : "min-h-11 text-sm flex-1"}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1" />
            )}
            {loading ? 'Gerando...' : isSecretaria ? 'Gerar mensagem' : 'Gerar com IA'}
          </Button>
        </div>}

        {aiMessage && (
          <div className="space-y-2 pt-1">
            <div className="bg-background/80 rounded-lg p-3 text-sm whitespace-pre-wrap border border-border/50 max-h-64 overflow-y-auto">
              {aiMessage}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full min-h-11 text-sm"
              onClick={handleCopyMessage}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              {copied ? 'Copiado!' : 'Copiar mensagem'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
