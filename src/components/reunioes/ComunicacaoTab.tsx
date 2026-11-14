import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ComunicacaoTabProps {
  meetingId: string;
  canManage: boolean;
  whatsappMessage: string | null;
  hasFinalMinutes: boolean;
  onMessageUpdated?: (message: string) => void;
}

export function ComunicacaoTab({ meetingId, canManage, whatsappMessage, hasFinalMinutes, onMessageUpdated }: ComunicacaoTabProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [localMessage, setLocalMessage] = useState(whatsappMessage);

  // Sync local state when prop changes
  useEffect(() => {
    setLocalMessage(whatsappMessage);
  }, [whatsappMessage]);

  const handleCopy = async () => {
    if (!localMessage) return;

    try {
      await navigator.clipboard.writeText(localMessage);
      setCopied(true);
      toast({
        title: 'Copiado!',
        description: 'Mensagem copiada para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar. Selecione e copie manualmente.',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-whatsapp-message', {
        body: { meetingId },
      });

      if (response.error) {
        const status = (response.error as { context?: { status?: number } }).context?.status;
        if (status === 429) {
          throw new Error('Limite de requisições excedido. Aguarde alguns minutos.');
        }
        if (status === 402) {
          throw new Error('Créditos de IA insuficientes.');
        }
        throw response.error;
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const newMessage = response.data.message;

      // Update in database
      const { error: saveError } = await supabase
        .from('meetings')
        .update({ whatsapp_message: newMessage })
        .eq('id', meetingId);
      if (saveError) throw saveError;

      // Update local state immediately (no page reload)
      setLocalMessage(newMessage);

      toast({
        title: 'Sucesso',
        description: 'Mensagem regenerada com sucesso!',
      });

      if (onMessageUpdated) onMessageUpdated(newMessage);
    } catch (err) {
      console.error('Error regenerating WhatsApp message:', err);
      toast({
        title: 'Erro',
        description: err instanceof Error && err.message ? err.message : 'Erro ao regenerar mensagem.',
        variant: 'destructive',
      });
    } finally {
      setRegenerating(false);
    }
  };

  if (!hasFinalMinutes) {
    return (
      <Alert>
        <AlertDescription>
          A ata final precisa ser gerada antes de criar a mensagem para os membros. Revele as contribuições primeiro.
        </AlertDescription>
      </Alert>
    );
  }

  if (!localMessage) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <h3 className="font-semibold mb-2">Mensagem não disponível</h3>
          <p className="text-sm text-muted-foreground mb-4">
            A mensagem de WhatsApp ainda não foi gerada ou ocorreu um erro.
          </p>
          {canManage && (
            <Button onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? 'Gerando...' : 'Gerar Mensagem'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="meeting-panel rounded-xl shadow-none">
      <CardHeader className="min-h-12 flex-row flex-wrap items-center justify-between gap-x-2 space-y-0 px-3 py-0 sm:space-y-0 md:px-4 md:py-0">
        <h2 className="text-base font-semibold">WhatsApp</h2>
        <div className="-mr-2 flex flex-wrap items-center gap-0.5">
          <Button variant="ghost" size="sm" className="px-2 text-[.8125rem] text-primary" onClick={handleCopy}>
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
          {canManage && (
            <Button variant="ghost" size="sm" className="px-2 text-[.8125rem] text-primary" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? 'Gerando…' : 'Regerar'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 md:px-4 md:pb-4">
        <p className="text-xs text-muted-foreground">Revise nomes, decisões e prazos antes de compartilhar.</p>
        <p className="whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 text-sm leading-5 sm:text-base sm:leading-6">{localMessage}</p>
      </CardContent>
    </Card>
  );
}
