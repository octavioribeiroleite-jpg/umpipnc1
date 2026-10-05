import { useId, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SugestaoFormProps {
  section: string;
  sectionLabel: string;
}

export function SugestaoForm({ section, sectionLabel }: SugestaoFormProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(false);
  const fieldId = useId();

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    setSendError(false);
    try {
      const { error } = await supabase.from('pastor_feedback').insert({
        section,
        message: message.trim(),
        created_by: user.id,
      });
      if (error) throw error;
      toast.success(`Sugestão sobre ${sectionLabel} enviada!`);
      setMessage('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar sugestão');
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 space-y-2 border-t pt-4">
      <Label htmlFor={fieldId} className="text-sm font-medium">
        Deixe sua sugestão sobre {sectionLabel}
      </Label>
      <Textarea id={fieldId} className="min-h-[160px] text-base leading-6"
        placeholder={`Escreva aqui sua opinião, sugestão ou observação sobre ${sectionLabel}...`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />
      {sendError && <p role="alert" className="text-sm text-destructive">Não foi possível confirmar o envio. Sua sugestão foi mantida para tentar novamente.</p>}
      <div className="flex justify-end">
        {sent ? (
          <Button variant="ghost" disabled className="text-success">
            <CheckCircle className="h-4 w-4 mr-2" />
            Enviado!
          </Button>
        ) : (
          <Button onClick={handleSend} disabled={sending || !message.trim()} size="sm">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar Sugestão
          </Button>
        )}
      </div>
    </div>
  );
}
