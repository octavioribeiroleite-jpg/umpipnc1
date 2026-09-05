import { useState } from 'react';
import { Cake, Copy, Sparkles, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Birthday } from '@/hooks/useBirthdays';

interface Props {
  birthdays: (Birthday & { daysUntil: number })[];
  aiToken?: string;
  aiExpiresAt?: string;
  onAiSessionExpired: () => void;
}

export function WeekAnnouncementCard({ birthdays, aiToken, aiExpiresAt, onAiSessionExpired }: Props) {
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (birthdays.length === 0) return null;

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
    <Card className="border-pink-200 dark:border-pink-800/40 bg-gradient-to-br from-pink-50/80 to-orange-50/50 dark:from-pink-950/20 dark:to-orange-950/10">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Cake className="h-5 w-5 text-pink-500" />
          <h2 className="font-semibold text-sm">Aniversariantes da Semana</h2>
          <span className="ml-auto text-xs text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full">
            {birthdays.length} pessoa{birthdays.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-1">
          {birthdays.map(b => (
            <div key={b.id} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground font-mono text-xs w-12">
                {String(b.dia).padStart(2, '0')}/{String(b.mes).padStart(2, '0')}
              </span>
              <span className="font-medium">{b.nome}</span>
              {b.daysUntil === 0 && (
                <span className="text-[10px] bg-pink-500 text-white px-1.5 py-0.5 rounded-full">HOJE</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="text-xs flex-1" onClick={handleCopyList}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copiar lista
          </Button>
          <Button
            size="sm"
            className="text-xs flex-1 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white border-0"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1" />
            )}
            {loading ? 'Gerando...' : 'Gerar com IA'}
          </Button>
        </div>

        {aiMessage && (
          <div className="space-y-2 pt-1">
            <div className="bg-background/80 rounded-lg p-3 text-sm whitespace-pre-wrap border border-border/50 max-h-64 overflow-y-auto">
              {aiMessage}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
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
