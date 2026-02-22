import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Heart, Copy, Check, Loader2 } from 'lucide-react';

const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
];

const SETTINGS_KEYS = ['pix_key', 'pix_key_type', 'pix_beneficiary', 'pix_instructions'] as const;

export function DizimosTab() {
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('');
  const [pixBeneficiary, setPixBeneficiary] = useState('');
  const [pixInstructions, setPixInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [...SETTINGS_KEYS]);

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
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = [
        { key: 'pix_key', value: pixKey.trim() },
        { key: 'pix_key_type', value: pixKeyType },
        { key: 'pix_beneficiary', value: pixBeneficiary.trim() },
        { key: 'pix_instructions', value: pixInstructions.trim() },
      ];

      for (const setting of settings) {
        if (!setting.value) continue;
        const { data: existing } = await supabase
          .from('settings')
          .select('id')
          .eq('key', setting.key)
          .maybeSingle();

        if (existing) {
          await supabase.from('settings').update({ value: setting.value }).eq('key', setting.key);
        } else {
          await supabase.from('settings').insert(setting);
        }
      }
      toast.success('Configurações de dízimo salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPreview = async () => {
    if (!pixKey) return;
    await navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeLabel = PIX_KEY_TYPES.find(t => t.value === pixKeyType)?.label || pixKeyType;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Config Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurar Chave PIX</CardTitle>
          <CardDescription>
            Configure a chave PIX que será exibida para os membros na aba de dízimos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo da Chave PIX</Label>
            <Select value={pixKeyType} onValueChange={setPixKeyType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {PIX_KEY_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chave PIX</Label>
            <Input
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              placeholder="Ex: 12.345.678/0001-90"
            />
          </div>

          <div className="space-y-2">
            <Label>Nome do Beneficiário</Label>
            <Input
              value={pixBeneficiary}
              onChange={e => setPixBeneficiary(e.target.value)}
              placeholder="Ex: Igreja Presbiteriana Nova Cidade"
            />
          </div>

          <div className="space-y-2">
            <Label>Instruções para os membros</Label>
            <Textarea
              value={pixInstructions}
              onChange={e => setPixInstructions(e.target.value)}
              placeholder="Ex: Coloque seu nome completo na descrição do PIX"
              rows={3}
            />
          </div>

          <Button onClick={handleSave} disabled={saving || !pixKey} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Preview (visão do membro)</CardTitle>
          <CardDescription>
            Assim os membros verão as informações de dízimo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pixKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Heart className="h-5 w-5" />
                <span className="font-bold text-lg">Dízimos e Ofertas</span>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Chave PIX:</p>
                <div className="flex items-center gap-2 bg-background rounded-lg border p-3">
                  <code className="flex-1 text-sm font-mono break-all">{pixKey}</code>
                  <Button variant="outline" size="sm" onClick={handleCopyPreview}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {pixBeneficiary && (
                <div>
                  <p className="text-sm text-muted-foreground">Beneficiário:</p>
                  <p className="font-medium">{pixBeneficiary}</p>
                </div>
              )}

              {typeLabel && (
                <div>
                  <p className="text-sm text-muted-foreground">Tipo:</p>
                  <p className="font-medium">{typeLabel}</p>
                </div>
              )}

              {pixInstructions && (
                <div className="rounded-lg bg-muted p-3 border-l-4 border-primary">
                  <p className="text-sm italic">{pixInstructions}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Preencha os campos ao lado para ver o preview.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
