import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
  Calendar, Clock, MapPin, Bell, Heart, Copy, Check, Loader2,
  LogIn, ChevronRight, Home, Menu,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoIpnc from '@/assets/logo-ipnc.png';

// ---------- Types ----------

interface VisitorData {
  fullName: string;
  societyId: string | null;
  isVisitor: boolean;
  deviceId: string;
}

interface Society {
  id: string;
  name: string;
  slug: string;
  color: string;
}

type PortalTab = 'inicio' | 'programacoes' | 'avisos' | 'dizimos';

const STORAGE_KEY = 'portal_visitor';

// ---------- Helpers ----------

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem('portal_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('portal_device_id', id);
  }
  return id;
}

function getSavedVisitor(): VisitorData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ---------- Welcome Screen (first-time visitors) ----------

function WelcomeScreen({ visitor, onContinue }: { visitor: VisitorData; onContinue: () => void }) {
  const firstName = visitor.fullName.split(' ')[0];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Logo grande */}
        <div className="animate-fade-in">
          <img
            src={logoIpnc}
            alt="IPNC"
            className="h-32 w-32 mx-auto object-contain drop-shadow-xl"
          />
        </div>

        {/* Coração animado */}
        <div className="animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <Heart className="h-8 w-8 mx-auto text-primary animate-pulse" />
        </div>

        {/* Título */}
        <h1
          className="text-3xl font-bold text-foreground animate-fade-in"
          style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
        >
          Que alegria ter você aqui!
        </h1>

        {/* Mensagem acolhedora */}
        <p
          className="text-muted-foreground leading-relaxed animate-fade-in"
          style={{ animationDelay: '0.7s', animationFillMode: 'both' }}
        >
          Seja muito bem-vindo à nossa igreja! É uma honra receber você.
          Que este momento seja especial e que você se sinta em casa entre nós.
          Deus te abençoe!
        </p>

        {/* Nome em destaque */}
        <p
          className="text-lg text-foreground animate-fade-in"
          style={{ animationDelay: '0.9s', animationFillMode: 'both' }}
        >
          Obrigado pela sua visita, <span className="font-bold text-primary">{firstName}</span>!
        </p>

        {/* Botão de entrar */}
        <div className="animate-fade-in" style={{ animationDelay: '1.1s', animationFillMode: 'both' }}>
          <Button onClick={onContinue} size="lg" className="w-full max-w-xs text-base py-6">
            Entrar no Portal
          </Button>
        </div>

        <p className="text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '1.3s', animationFillMode: 'both' }}>
          Igreja Presbiteriana de Nova Carapina
        </p>
      </div>
    </div>
  );
}

// ---------- Return Visitor Confirmation ----------

function ReturnVisitorConfirm({
  visitor,
  onConfirm,
  onReset,
}: {
  visitor: VisitorData;
  onConfirm: () => void;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await supabase
        .from('portal_visitors' as any)
        .insert({
          full_name: visitor.fullName,
          society_id: visitor.societyId,
          is_visitor: visitor.isVisitor,
          device_id: visitor.deviceId,
        } as any);
    } catch (e) {
      console.warn('Erro ao registrar visita:', e);
    }
    onConfirm();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="animate-fade-in">
          <img src={logoIpnc} alt="IPNC" className="h-24 w-24 mx-auto object-contain drop-shadow-lg" />
        </div>

        <h1
          className="text-2xl font-bold text-foreground animate-fade-in"
          style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
        >
          Bem-vindo de volta!
        </h1>

        <p
          className="text-lg text-muted-foreground animate-fade-in"
          style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
        >
          Você é <span className="font-bold text-foreground">{visitor.fullName}</span>?
        </p>

        <div
          className="flex flex-col gap-3 max-w-xs mx-auto animate-fade-in"
          style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
        >
          <Button onClick={handleConfirm} size="lg" className="w-full py-5" disabled={confirming}>
            {confirming ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>
            ) : (
              'Sim, sou eu'
            )}
          </Button>
          <Button onClick={onReset} variant="outline" size="lg" className="w-full py-5" disabled={confirming}>
            Não, sou outra pessoa
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Igreja Presbiteriana de Nova Carapina
        </p>
      </div>
    </div>
  );
}

// ---------- Main Component ----------

export default function PortalIgreja() {
  const [visitor, setVisitor] = useState<VisitorData | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savedVisitor, setSavedVisitor] = useState<VisitorData | null>(null);

  useEffect(() => {
    const saved = getSavedVisitor();
    if (saved) {
      setSavedVisitor(saved);
      setShowConfirm(true);
    }
  }, []);

  // Returning visitor confirmed identity
  const handleReturnConfirm = () => {
    if (savedVisitor) {
      setVisitor(savedVisitor);
      setShowConfirm(false);
    }
  };

  // Returning visitor is someone else
  const handleReturnReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedVisitor(null);
    setShowConfirm(false);
  };

  // New identification completed
  const handleIdentificationComplete = (v: VisitorData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    if (v.isVisitor) {
      setSavedVisitor(v);
      setShowWelcome(true);
    } else {
      setVisitor(v);
    }
  };

  // Welcome screen "Entrar" clicked
  const handleWelcomeContinue = () => {
    if (savedVisitor) {
      setVisitor(savedVisitor);
      setShowWelcome(false);
    }
  };

  if (showConfirm && savedVisitor) {
    return (
      <ReturnVisitorConfirm
        visitor={savedVisitor}
        onConfirm={handleReturnConfirm}
        onReset={handleReturnReset}
      />
    );
  }

  if (showWelcome && savedVisitor) {
    return <WelcomeScreen visitor={savedVisitor} onContinue={handleWelcomeContinue} />;
  }

  if (!visitor) {
    return <IdentificationForm onComplete={handleIdentificationComplete} />;
  }

  return <Portal visitor={visitor} />;
}

// ---------- Identification Form ----------

function IdentificationForm({ onComplete }: { onComplete: (v: VisitorData) => void }) {
  const [fullName, setFullName] = useState('');
  const [societyChoice, setSocietyChoice] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('societies')
      .select('id, name, slug, color')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setSocieties(data as Society[]);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 3) {
      toast.error('Informe seu nome completo');
      return;
    }
    if (!societyChoice) {
      toast.error('Selecione uma opção');
      return;
    }

    setSubmitting(true);
    const deviceId = getOrCreateDeviceId();
    const isVisitor = societyChoice === 'visitante';
    const societyId = isVisitor ? null : societyChoice;

    const { error } = await supabase
      .from('portal_visitors' as any)
      .insert({
        full_name: trimmedName.slice(0, 100),
        society_id: societyId,
        is_visitor: isVisitor,
        device_id: deviceId,
      } as any);

    if (error) {
      console.warn('Erro ao registrar visitante:', error.message);
    }

    const visitorData: VisitorData = {
      fullName: trimmedName,
      societyId,
      isVisitor,
      deviceId,
    };

    onComplete(visitorData);
    toast.success('Bem-vindo!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block animate-logo-pulse mb-4">
            <img src={logoIpnc} alt="IPNC" className="h-28 w-28 mx-auto object-contain drop-shadow-lg" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground animate-fade-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            Bem-vindo à Igreja Presbiteriana
          </h1>
          <p className="text-muted-foreground text-sm mt-1 animate-fade-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            de Nova Carapina
          </p>
        </div>

        <Card className="border-border/50 shadow-xl animate-fade-up" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={100}
                  disabled={submitting}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-3">
                <Label>Você é integrante de qual sociedade?</Label>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-32" />)}
                  </div>
                ) : (
                  <RadioGroup value={societyChoice} onValueChange={setSocietyChoice} className="space-y-2">
                    {societies.map((s) => (
                      <div key={s.id} className="flex items-center space-x-3">
                        <RadioGroupItem value={s.id} id={`soc-${s.id}`} />
                        <Label htmlFor={`soc-${s.id}`} className="flex items-center gap-2 cursor-pointer font-normal">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </Label>
                      </div>
                    ))}
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="visitante" id="soc-visitante" />
                      <Label htmlFor="soc-visitante" className="cursor-pointer font-normal">
                        Visitante
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2025 IPNC - Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}

// ---------- Portal ----------

function Portal({ visitor }: { visitor: VisitorData }) {
  const [activeTab, setActiveTab] = useState<PortalTab>('inicio');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const tabs: { key: PortalTab; label: string; icon: typeof Calendar }[] = [
    { key: 'inicio', label: 'Início', icon: Home },
    { key: 'programacoes', label: 'Programações', icon: Calendar },
    { key: 'avisos', label: 'Avisos', icon: Bell },
    { key: 'dizimos', label: 'Dízimos', icon: Heart },
  ];

  const handleTabChange = (tab: PortalTab) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  const firstName = visitor.fullName.split(' ')[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-md border-b border-border px-4 py-4 safe-top">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-card text-foreground p-0">
                <div className="flex flex-col h-full">
                  {/* Sidebar header */}
                  <div className="flex items-center gap-2 p-4 border-b border-border">
                    <img src={logoIpnc} alt="IPNC" className="h-10 w-10 object-contain" />
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-sm text-primary">Portal da Igreja</span>
                      <span className="text-xs text-muted-foreground">IPNC</span>
                    </div>
                  </div>

                  {/* Nav items */}
                  <nav className="flex-1 py-4 overflow-y-auto">
                    <ul className="space-y-1 px-2">
                      {tabs.map((item) => {
                        const isActive = activeTab === item.key;
                        return (
                          <li key={item.key}>
                            <button
                              onClick={() => handleTabChange(item.key)}
                              className={`flex items-center w-full px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-muted ${
                                isActive
                                  ? 'bg-primary/10 text-primary shadow-sm'
                                  : 'text-foreground'
                              }`}
                            >
                              <item.icon className="h-5 w-5 mr-3" />
                              <span className="font-medium">{item.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

                  {/* Visitor + Login section */}
                  <div className="p-4 border-t border-border">
                    <div className="mb-3 px-2">
                      <p className="font-medium text-sm truncate">{visitor.fullName}</p>
                      <p className="text-xs text-muted-foreground">{visitor.isVisitor ? 'Visitante' : 'Membro'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => { setMenuOpen(false); navigate('/auth'); }}
                      className="w-full justify-start text-foreground hover:bg-muted"
                    >
                      <LogIn className="h-5 w-5 mr-3" />
                      <span>Fazer Login</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <img src={logoIpnc} alt="IPNC" className="h-12 w-12 object-contain" />
            <div>
              <p className="text-base font-semibold leading-tight">Portal da Igreja</p>
              <p className="text-sm text-muted-foreground">Olá, {firstName}!</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <HeaderActions showInstall={false} showVersion={false} />
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
              <LogIn className="h-4 w-4 mr-1.5" />
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto px-4 py-4 pt-24 pb-24 max-w-2xl mx-auto w-full">
        {activeTab === 'inicio' && <InicioTab visitor={visitor} onTabChange={setActiveTab} />}
        {activeTab === 'programacoes' && <ProgramacoesTab />}
        {activeTab === 'avisos' && <AvisosTab />}
        {activeTab === 'dizimos' && <DizimosPortalTab />}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border safe-bottom">
        <div className="flex justify-around max-w-2xl mx-auto">
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-col items-center gap-0.5 py-2.5 px-4 text-xs transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                <span className={active ? 'font-semibold' : ''}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ---------- Início Tab ----------

function InicioTab({ visitor, onTabChange }: { visitor: VisitorData; onTabChange: (tab: PortalTab) => void }) {
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [lastAnnouncement, setLastAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const firstName = visitor.fullName.split(' ')[0];

  useEffect(() => {
    Promise.all([
      supabase
        .from('events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .neq('status', 'cancelado')
        .order('start_date', { ascending: true })
        .limit(1),
      supabase
        .from('pastor_announcements')
        .select('*')
        .eq('scope', 'church')
        .order('created_at', { ascending: false })
        .limit(1),
    ]).then(([eventRes, announcementRes]) => {
      if (eventRes.data && eventRes.data.length > 0) setNextEvent(eventRes.data[0]);
      if (announcementRes.data && announcementRes.data.length > 0) setLastAnnouncement(announcementRes.data[0]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Saudação bonita */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-primary/3 p-6 text-center">
        <p className="text-2xl font-bold text-foreground">
          Olá, {firstName}! 👋
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Bem-vindo à <span className="font-semibold text-primary">Igreja Presbiteriana de Nova Carapina</span>
        </p>
      </div>

      {/* Próximo Evento */}
      {loading ? (
        <Skeleton className="h-24" />
      ) : nextEvent ? (
        <Card className="overflow-hidden">
          <div className="h-1" style={{ backgroundColor: nextEvent.color || 'hsl(var(--primary))' }} />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5 shrink-0 mt-0.5">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Próximo Evento</p>
                <h3 className="font-semibold text-sm">{nextEvent.title}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{format(new Date(nextEvent.start_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
                  {!nextEvent.all_day && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(nextEvent.start_date), 'HH:mm')}
                    </span>
                  )}
                </div>
                {nextEvent.location && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    {nextEvent.location}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => onTabChange('programacoes')}
              className="flex items-center gap-1 text-xs text-primary font-medium mt-3 ml-auto hover:underline"
            >
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </CardContent>
        </Card>
      ) : null}

      {/* Último Aviso */}
      {loading ? (
        <Skeleton className="h-24" />
      ) : lastAnnouncement ? (
        <Card className={lastAnnouncement.priority === 'urgente' ? 'border-destructive/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5 shrink-0 mt-0.5">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Último Aviso</p>
                  {lastAnnouncement.priority === 'urgente' && (
                    <Badge variant="destructive" className="text-[10px] py-0">Urgente</Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm">{lastAnnouncement.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lastAnnouncement.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {formatDistanceToNow(new Date(lastAnnouncement.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('avisos')}
              className="flex items-center gap-1 text-xs text-primary font-medium mt-3 ml-auto hover:underline"
            >
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// ---------- Dízimos Portal Tab ----------

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Chave aleatória',
};

function DizimosPortalTab() {
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('');
  const [pixBeneficiary, setPixBeneficiary] = useState('');
  const [pixInstructions, setPixInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['pix_key', 'pix_key_type', 'pix_beneficiary', 'pix_instructions'])
      .then(({ data }) => {
        if (data) {
          data.forEach((s: any) => {
            if (s.key === 'pix_key') setPixKey(s.value);
            if (s.key === 'pix_key_type') setPixKeyType(s.value);
            if (s.key === 'pix_beneficiary') setPixBeneficiary(s.value);
            if (s.key === 'pix_instructions') setPixInstructions(s.value);
          });
        }
        setLoading(false);
      });
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
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Dízimos e Ofertas</h2>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!pixKey) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Heart className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Chave PIX não configurada</p>
        <p className="text-xs mt-1">Em breve as informações estarão disponíveis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Bloco motivacional */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 overflow-hidden">
        <Heart className="absolute top-4 right-4 h-16 w-16 text-primary opacity-[0.08]" />
        <h2 className="text-xl font-bold text-foreground mb-1">Contribua com alegria</h2>
        <p className="text-sm italic text-muted-foreground leading-relaxed">
          "Cada um dê como propôs no seu coração, não com tristeza ou por necessidade; porque Deus ama ao que dá com alegria."
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">— 2 Coríntios 9:7</p>
      </div>

      {/* Card PIX */}
      <Card className="border-primary/40 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 px-5 py-3.5 flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <span className="font-bold text-primary text-lg">Dízimos e Ofertas</span>
        </div>
        <CardContent className="pt-5 pb-6 space-y-5 px-5">
          {/* Chave PIX */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Chave PIX:</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted rounded-lg border p-3">
              <code className="flex-1 text-sm font-mono break-all font-semibold">{pixKey}</code>
              <Button onClick={handleCopy} variant={copied ? 'default' : 'outline'} size="sm" className="w-full sm:w-auto shrink-0">
                {copied ? <><Check className="h-4 w-4 mr-1" />Copiado!</> : <><Copy className="h-4 w-4 mr-1" />Copiar</>}
              </Button>
            </div>
          </div>

          {/* Tipo da chave */}
          {pixKeyType && (
            <div>
              <p className="text-xs text-muted-foreground">Tipo da chave</p>
              <p className="text-sm font-medium">{PIX_TYPE_LABELS[pixKeyType] || pixKeyType}</p>
            </div>
          )}

          {/* Beneficiário */}
          {pixBeneficiary && (
            <div>
              <p className="text-xs text-muted-foreground">Beneficiário</p>
              <p className="text-sm font-medium">{pixBeneficiary}</p>
            </div>
          )}

          {/* Instruções */}
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

// ---------- Programações Tab ----------

const statusStyles: Record<string, string> = {
  confirmado: 'bg-success/10 text-success border-success/20',
  pendente: 'bg-warning/10 text-warning border-warning/20',
};
const statusLabels: Record<string, string> = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
};

function ProgramacoesTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [societies, setSocieties] = useState<Record<string, Society>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from('events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .neq('status', 'cancelado')
        .order('start_date', { ascending: true })
        .limit(30),
      supabase.from('societies').select('id, name, slug, color').eq('active', true),
    ]).then(([eventsRes, socRes]) => {
      if (eventsRes.data) setEvents(eventsRes.data);
      if (socRes.data) {
        const map: Record<string, Society> = {};
        (socRes.data as Society[]).forEach((s) => (map[s.id] = s));
        setSocieties(map);
      }
      setLoading(false);
    });
  }, []);

  const groupedByMonth: Record<string, any[]> = {};
  events.forEach((event) => {
    const key = format(new Date(event.start_date), "MMMM 'de' yyyy", { locale: ptBR });
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(event);
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Próximas Programações</h2>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Próximas Programações</h2>
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhuma programação próxima.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByMonth).map(([month, monthEvents]) => (
          <div key={month} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">{month}</h3>
            {monthEvents.map((event: any) => {
              const startDate = new Date(event.start_date);
              const endDate = event.end_date ? new Date(event.end_date) : null;
              const soc = event.society_id ? societies[event.society_id] : null;

              return (
                <Card key={event.id} className="overflow-hidden">
                  <div className="h-1" style={{ backgroundColor: event.color || 'hsl(var(--primary))' }} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-sm">{event.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {soc && (
                          <Badge variant="outline" className="text-[10px]" style={{ borderColor: soc.color, color: soc.color }}>
                            {soc.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] ${statusStyles[event.status] || ''}`}>
                          {statusLabels[event.status] || event.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(startDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      {!event.all_day && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(startDate, 'HH:mm', { locale: ptBR })}
                          {endDate && ` – ${format(endDate, 'HH:mm', { locale: ptBR })}`}
                        </span>
                      )}
                      {event.all_day && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Dia inteiro</span>}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    )}
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

// ---------- Avisos Tab ----------

function AvisosTab() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('pastor_announcements')
      .select('*')
      .eq('scope', 'church')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setAnnouncements(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Avisos</h2>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Bell className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Nenhum aviso</p>
        <p className="text-xs mt-1">Quando houver novidades, elas aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Avisos</h2>
      {announcements.map((a: any) => (
        <Card key={a.id} className={a.priority === 'urgente' ? 'border-destructive/50' : ''}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{a.title}</h3>
              {a.priority === 'urgente' && <Badge variant="destructive" className="text-[10px]">Urgente</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{a.message}</p>
            <p className="text-[10px] text-muted-foreground mt-2">
              {format(new Date(a.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
