import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Loader2, Copy, Check, Info } from 'lucide-react';

interface ComunicacaoTabProps {
  meetingId: string;
  canManage: boolean;
  hasFinalMinutes: boolean;
}

export function ComunicacaoTab({ meetingId, canManage, hasFinalMinutes }: ComunicacaoTabProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
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

      setMessage(response.data.message);
      toast({
        title: 'Sucesso',
        description: 'Mensagem gerada com sucesso!',
      });
    } catch (err: any) {
      console.error('Error generating WhatsApp message:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao gerar mensagem.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!message) return;

    try {
      await navigator.clipboard.writeText(message);
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

  if (!hasFinalMinutes) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          A ata final precisa ser gerada antes de criar a mensagem para os membros. Vá para a aba "Gerar Ata" primeiro.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-primary/50 bg-primary/5">
        <MessageSquare className="h-4 w-4" />
        <AlertDescription>
          Gere uma mensagem formatada para WhatsApp baseada na ata final. A mensagem será adaptada para comunicar as principais informações aos membros da igreja.
        </AlertDescription>
      </Alert>

      {!message ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Gerar Mensagem para WhatsApp</h3>
            <p className="text-sm text-muted-foreground mb-4">
              A IA irá transformar a ata em uma mensagem clara e acolhedora para enviar aos membros.
            </p>
            {canManage && (
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                {generating ? 'Gerando...' : 'Gerar Mensagem'}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
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
                    <Check className="h-4 w-4 mr-1 text-success" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
                {canManage && (
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regerar'}
                  </Button>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Clique em "Copiar" e cole no WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm whitespace-pre-wrap font-mono">{message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
