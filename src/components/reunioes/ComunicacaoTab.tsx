import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Loader2, Copy, Check, Info, RefreshCw } from 'lucide-react';

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
        const errorData = response.error as any;
        if (errorData?.context?.status === 429) {
          throw new Error('Limite de requisições excedido. Aguarde alguns minutos.');
        }
        if (errorData?.context?.status === 402) {
          throw new Error('Créditos de IA insuficientes.');
        }
        throw response.error;
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const newMessage = response.data.message;

      // Update in database
      await supabase
        .from('meetings')
        .update({ whatsapp_message: newMessage })
        .eq('id', meetingId);

      // Update local state immediately (no page reload)
      setLocalMessage(newMessage);

      toast({
        title: 'Sucesso',
        description: 'Mensagem regenerada com sucesso!',
      });

      if (onMessageUpdated) onMessageUpdated(newMessage);
    } catch (err: any) {
      console.error('Error regenerating WhatsApp message:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao regenerar mensagem.',
        variant: 'destructive',
      });
    } finally {
      setRegenerating(false);
    }
  };

  if (!hasFinalMinutes) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
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
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Mensagem não disponível</h3>
          <p className="text-sm text-muted-foreground mb-4">
            A mensagem de WhatsApp ainda não foi gerada ou ocorreu um erro.
          </p>
          {canManage && (
            <Button onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {regenerating ? 'Gerando...' : 'Gerar Mensagem'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-primary/50 bg-primary/5">
        <MessageSquare className="h-4 w-4" />
        <AlertDescription>
          Mensagem gerada automaticamente com base na ata. Clique em "Copiar" e cole no WhatsApp.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagem para WhatsApp
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 mr-1 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
              {canManage && (
                <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
                  {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Regerar
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Pronta para copiar e enviar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm whitespace-pre-wrap font-mono">{localMessage}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
