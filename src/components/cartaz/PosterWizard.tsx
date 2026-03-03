import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Download, RefreshCw, Loader2, Image, Megaphone, Mail, Heart, Palette, Sparkles, PartyPopper, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const STEPS = ['Tipo', 'Estilo', 'Conteúdo', 'Gerar'];

const TYPES = [
  { value: 'evento', label: 'Evento / Culto', icon: Sparkles, desc: 'Cultos, encontros, conferências' },
  { value: 'anuncio', label: 'Anúncio Geral', icon: Megaphone, desc: 'Avisos e comunicados' },
  { value: 'convite', label: 'Convite', icon: Mail, desc: 'Convites especiais' },
  { value: 'campanha', label: 'Campanha', icon: Heart, desc: 'Arrecadações e campanhas' },
];

const STYLES = [
  { value: 'minimalista', label: 'Minimalista', icon: Palette, desc: 'Elegante e limpo' },
  { value: 'colorido', label: 'Colorido', icon: Sparkles, desc: 'Vibrante e chamativo' },
  { value: 'jovem', label: 'Jovem / Divertido', icon: PartyPopper, desc: 'Moderno e descontraído' },
  { value: 'institucional', label: 'Institucional', icon: Building2, desc: 'Sóbrio e formal' },
];

interface PosterData {
  type: string;
  style: string;
  title: string;
  date: string;
  time: string;
  location: string;
  details: string;
  colorScheme: string;
}

export function PosterWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<PosterData>({
    type: 'evento',
    style: 'minimalista',
    title: '',
    date: '',
    time: '',
    location: '',
    details: '',
    colorScheme: 'livre',
  });
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const canAdvance = () => {
    if (step === 2) return data.title.trim().length > 0;
    return true;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setImageUrl(null);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-poster', {
        body: data,
      });

      if (error) throw error;

      if (result?.error) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
        return;
      }

      if (result?.imageUrl) {
        setImageUrl(result.imageUrl);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao gerar cartaz', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `cartaz-${data.title.slice(0, 20).replace(/\s+/g, '-')}.png`;
    link.click();
  };

  const handleReset = () => {
    setStep(0);
    setImageUrl(null);
    setData({ type: 'evento', style: 'minimalista', title: '', date: '', time: '', location: '', details: '', colorScheme: 'livre' });
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          {STEPS.map((s, i) => (
            <span key={s} className={i === step ? 'text-primary font-semibold' : ''}>{s}</span>
          ))}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step 0: Type */}
      {step === 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-lg font-semibold">Qual o tipo do cartaz?</h3>
            <RadioGroup value={data.type} onValueChange={(v) => setData(d => ({ ...d, type: v }))}>
              <div className="grid grid-cols-1 gap-2">
                {TYPES.map(t => (
                  <label
                    key={t.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      data.type === t.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <RadioGroupItem value={t.value} className="sr-only" />
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <t.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Style */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-lg font-semibold">Qual o estilo visual?</h3>
            <RadioGroup value={data.style} onValueChange={(v) => setData(d => ({ ...d, style: v }))}>
              <div className="grid grid-cols-1 gap-2">
                {STYLES.map(s => (
                  <label
                    key={s.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      data.style === s.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <RadioGroupItem value={s.value} className="sr-only" />
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Content */}
      {step === 2 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-lg font-semibold">Informações do cartaz</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Culto de Ação de Graças"
                  value={data.title}
                  onChange={(e) => setData(d => ({ ...d, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    placeholder="Ex: 15 de Março"
                    value={data.date}
                    onChange={(e) => setData(d => ({ ...d, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Horário</Label>
                  <Input
                    id="time"
                    placeholder="Ex: 19h30"
                    value={data.time}
                    onChange={(e) => setData(d => ({ ...d, time: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Local</Label>
                <Input
                  id="location"
                  placeholder="Ex: Templo da IPNC"
                  value={data.location}
                  onChange={(e) => setData(d => ({ ...d, location: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="details">Detalhes adicionais</Label>
                <Textarea
                  id="details"
                  placeholder="Outras informações que devem aparecer no cartaz..."
                  rows={3}
                  value={data.details}
                  onChange={(e) => setData(d => ({ ...d, details: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Generate */}
      {step === 3 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {!imageUrl && !generating && (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Image className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Pronto para gerar!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clique no botão abaixo para criar seu cartaz com IA
                  </p>
                </div>
                <div className="text-left text-sm space-y-1 bg-muted/50 p-3 rounded-lg">
                  <p><strong>Tipo:</strong> {TYPES.find(t => t.value === data.type)?.label}</p>
                  <p><strong>Estilo:</strong> {STYLES.find(s => s.value === data.style)?.label}</p>
                  <p><strong>Título:</strong> {data.title}</p>
                  {data.date && <p><strong>Data:</strong> {data.date}</p>}
                  {data.time && <p><strong>Horário:</strong> {data.time}</p>}
                  {data.location && <p><strong>Local:</strong> {data.location}</p>}
                </div>
                <Button onClick={handleGenerate} className="w-full" size="lg">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Cartaz
                </Button>
              </div>
            )}

            {generating && (
              <div className="text-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                <div>
                  <h3 className="text-lg font-semibold">Gerando seu cartaz...</h3>
                  <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
                </div>
              </div>
            )}

            {imageUrl && (
              <div className="space-y-4">
                <img
                  src={imageUrl}
                  alt="Cartaz gerado"
                  className="w-full rounded-lg border shadow-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={handleDownload} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                  <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                    Gerar outro
                  </Button>
                </div>
                <Button variant="ghost" onClick={handleReset} className="w-full">
                  Começar do zero
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {!(step === 3 && (generating || imageUrl)) && (
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          {step < 3 && (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
            >
              Avançar
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
