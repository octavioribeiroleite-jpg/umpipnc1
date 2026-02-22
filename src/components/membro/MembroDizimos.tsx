import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Heart, Copy, Check, Loader2 } from 'lucide-react';

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Chave aleatória',
};

export function MembroDizimos() {
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('');
  const [pixBeneficiary, setPixBeneficiary] = useState('');
  const [pixInstructions, setPixInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['pix_key', 'pix_key_type', 'pix_beneficiary', 'pix_instructions']);

      if (data) {
        data.forEach((s) => {
          if (s.key === 'pix_key') setPixKey(s.value);
          if (s.key === 'pix_key_type') setPixKeyType(s.value);
          if (s.key === 'pix_beneficiary') setPixBeneficiary(s.value);
          if (s.key === 'pix_instructions') setPixInstructions(s.value);
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      toast.success('Chave PIX copiada!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pixKey) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Heart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            A chave PIX ainda não foi configurada pela diretoria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/40 shadow-md overflow-hidden">
        <div className="bg-primary/10 px-4 py-3 flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <span className="font-bold text-primary text-lg">Dízimos e Ofertas</span>
        </div>
        <CardContent className="pt-5 space-y-5">
          {/* PIX Key with Copy */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Chave PIX:</p>
            <div className="flex items-center gap-2 bg-muted rounded-lg border p-3">
              <code className="flex-1 text-sm font-mono break-all font-semibold">
                {pixKey}
              </code>
              <Button
                onClick={handleCopy}
                variant={copied ? 'default' : 'outline'}
                size="sm"
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Beneficiary */}
          {pixBeneficiary && (
            <div>
              <p className="text-sm text-muted-foreground">Beneficiário:</p>
              <p className="font-medium">{pixBeneficiary}</p>
            </div>
          )}

          {/* Type */}
          {pixKeyType && (
            <div>
              <p className="text-sm text-muted-foreground">Tipo da chave:</p>
              <p className="font-medium">{PIX_TYPE_LABELS[pixKeyType] || pixKeyType}</p>
            </div>
          )}

          {/* Instructions */}
          {pixInstructions && (
            <div className="rounded-lg bg-primary/5 p-4 border-l-4 border-primary">
              <p className="text-sm italic text-foreground">{pixInstructions}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
