import { useWorkspaceTheme } from '@/hooks/useWorkspaceTheme';
import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
  Calendar, Clock, MapPin, Bell, Heart, Copy, Check, Loader2,
  LogIn, ChevronRight, Home, Menu,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoIpnc from '@/assets/logo-ipnc.png';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderActions } from '@/components/layout/HeaderActions';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { NavigationSidebar, NavigationRail } from '@/components/layout/WorkspaceNavigation';
import { DashboardWelcome } from '@/components/layout/DashboardWelcome';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

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
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-center space-y-5 sm:p-8">
        {/* Logo grande */}
        <div className="">
          <img
            src={logoIpnc}
            alt="Marca IPNC"
            className="h-24 w-24 mx-auto rounded-2xl bg-white p-1 object-contain"
          />
        </div>

        {/* Coração animado */}
        <div className="">
          <Heart className="h-8 w-8 mx-auto text-primary animate-pulse" />
        </div>

        {/* Título */}
        <h1
          className="text-2xl sm:text-3xl font-bold text-foreground"

        >
          Que alegria ter você aqui!
        </h1>

        {/* Mensagem acolhedora */}
        <p
          className="text-muted-foreground leading-relaxed"

        >
          Seja muito bem-vindo à nossa igreja! É uma honra receber você.
          Que este momento seja especial e que você se sinta em casa entre nós.
          Deus te abençoe!
        </p>

        {/* Nome em destaque */}
        <p
          className="text-lg text-foreground"

        >
          Obrigado pela sua visita, <span className="font-bold text-primary">{firstName}</span>!
        </p>

        {/* Botão de entrar */}
        <div className="">
          <Button onClick={onContinue} size="lg" className="w-full max-w-xs text-base py-6">
            Entrar no Portal
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
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
      const { error } = await supabase.rpc('register_portal_visit' as any, {
        p_name: visitor.fullName, p_society: visitor.societyId,
        p_visitor: visitor.isVisitor, p_device: visitor.deviceId,
      });
      if (error) throw error;
      onConfirm();
    } catch {
      toast.error('Não foi possível registrar sua visita. Tente novamente.');
    } finally { setConfirming(false); }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-center space-y-5 sm:p-8">
        <div className="">
          <img src={logoIpnc} alt="Marca IPNC" className="h-24 w-24 mx-auto rounded-2xl bg-white p-1 object-contain" />
        </div>

        <h1
          className="text-2xl font-bold text-foreground"

        >
          Bem-vindo de volta!
        </h1>

        <p
          className="text-lg text-muted-foreground"

        >
          Você é <span className="font-bold text-foreground">{visitor.fullName}</span>?
        </p>

        <div
          className="flex flex-col gap-3 max-w-xs mx-auto"

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
  useWorkspaceTheme();
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
  const { loading: readLoading, hasSnapshot, error: readError, run: runRead } = useSnapshotRead('portal-IdentificationForm');
  const loading = readLoading && !hasSnapshot;
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(() => runRead(async () => {
    const { data, error } = await supabase.from('societies').select('id, name, slug, color').eq('active', true).order('name');
    if (error) throw error;
    return () => setSocieties(data || []);
  }), [runRead]);
  useEffect(() => { void fetchData(); }, [fetchData]);
  const readFailure = readError ? <QueryErrorState message="Não foi possível consultar sociedades de identificação." onRetry={() => void fetchData()} retrying={readLoading} hasPreviousData={hasSnapshot} /> : null;


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
    try {
      const deviceId = getOrCreateDeviceId();
      const isVisitor = societyChoice === 'visitante';
      const societyId = isVisitor ? null : societyChoice;
      const { error } = await supabase.rpc('register_portal_visit' as any, {
        p_name: trimmedName.slice(0, 100), p_society: societyId,
        p_visitor: isVisitor, p_device: deviceId,
      });
      if (error) throw error;
      onComplete({ fullName: trimmedName, societyId, isVisitor, deviceId });
      toast.success('Bem-vindo!');
    } catch {
      toast.error('Não foi possível registrar sua visita. Seus dados foram mantidos para tentar novamente.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block animate-logo-pulse mb-4">
            <img src={logoIpnc} alt="Marca IPNC" className="h-20 w-20 mx-auto rounded-2xl bg-white p-1 object-contain" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Bem-vindo à Igreja Presbiteriana
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            de Nova Carapina
          </p>
        </div>

        <Card className="border-border shadow-none">
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
                {readFailure}
                {!hasSnapshot ? (loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-32" />)}
                  </div>
                ) : null) : (
                  <RadioGroup aria-label="Sociedade ou visitante" value={societyChoice} onValueChange={setSocietyChoice} className="space-y-2">
                    {societies.map((s) => (
                      <div key={s.id} className="flex min-h-[48px] items-center space-x-3 rounded-lg border border-border p-3">
                        <RadioGroupItem value={s.id} id={`soc-${s.id}`} />
                        <Label htmlFor={`soc-${s.id}`} className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer font-normal leading-relaxed">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </Label>
                      </div>
                    ))}
                    <div className="flex min-h-[48px] items-center space-x-3 rounded-lg border border-border p-3">
                      <RadioGroupItem value="visitante" id="soc-visitante" />
                      <Label htmlFor="soc-visitante" className="min-w-0 flex-1 cursor-pointer font-normal leading-relaxed">
                        Visitante
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !hasSnapshot}>
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
  const shellRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const tabs: { key: PortalTab; label: string; icon: typeof Calendar }[] = [
    { key: 'inicio', label: 'Início', icon: Home },
    { key: 'programacoes', label: 'Programações', icon: Calendar },
    { key: 'avisos', label: 'Avisos', icon: Bell },
    { key: 'dizimos', label: 'Dízimos', icon: Heart },
  ];
  useEffect(() => {
    const nav = mobileNavRef.current;
    const shell = shellRef.current;
    if (!nav || !shell) return;
    const measure = () => shell.style.setProperty('--portal-nav-height', `${nav.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);
  const handleTabChange = (tab: PortalTab) => { setActiveTab(tab); setMenuOpen(false); };
  const renderMenu = (rail = false) => <nav aria-label="Seções do portal" className="min-h-0 flex-1 overflow-y-auto space-y-2">
    {tabs.map(item => <button key={item.key} type="button" onClick={() => handleTabChange(item.key)} aria-current={activeTab === item.key ? 'page' : undefined} aria-label={item.label} title={item.label}
      className={`flex min-h-[48px] w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left ${rail ? (activeTab === item.key ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent') : (activeTab === item.key ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}`}>
      <item.icon className="h-[20px] w-[20px] shrink-0" />
      <span className={`min-w-0 [overflow-wrap:anywhere] text-base ${rail ? 'hidden min-[1100px]:block' : ''}`}>{item.label}</span>
    </button>)}
  </nav>;

  const navigation = {
    items: tabs.map(item => ({ ...item, active: activeTab === item.key, onClick: () => handleTabChange(item.key) })),
    onHome: () => handleTabChange('inicio'),
    homeLabel: 'Início do portal da igreja',
    navigationLabel: 'Seções do portal',
    onExit: () => navigate('/auth'),
    exitLabel: 'Acesso responsável',
  };

  return <div ref={shellRef} className="ipnc-portal ipnc-navigation-layout ipnc-dashboard-shell ipnc-safe-managed min-h-[var(--app-viewport-height)] min-w-0 bg-background min-[700px]:flex">
    <div className="hidden min-[1100px]:flex"><NavigationSidebar {...navigation} profile={{ name: visitor.fullName, description: 'Portal da igreja' }} /></div>
    <div className="hidden min-[700px]:flex min-[1100px]:hidden"><NavigationRail {...navigation} /></div>
    <div className="flex min-w-0 flex-1 flex-col">
      <a href="#portal-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-card focus:p-3">Ir para o conteúdo</a>
      <div className="ipnc-safe-page-x mx-auto w-full max-w-[1120px] min-w-0 pt-[max(16px,var(--safe-top))]">
        <WorkspaceHeader mobileTitle="Portal da igreja" accountName={visitor.fullName} accountRole={visitor.isVisitor ? 'Visitante · IPNC' : 'Membro · IPNC'} actions={<>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="shrink-0 min-[700px]:hidden" aria-label="Abrir navegação da igreja"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="flex w-[280px] max-w-[85vw] flex-col gap-5 bg-card p-[16px]">
              <SheetTitle>Portal da igreja</SheetTitle>{renderMenu()}
              <div className="border-t border-border pt-4"><p className="[overflow-wrap:anywhere] text-base font-medium">{visitor.fullName}</p><p className="text-sm text-muted-foreground">{visitor.isVisitor ? 'Visitante' : 'Membro'}</p></div>
              <Button variant="outline" onClick={() => { setMenuOpen(false); navigate('/auth'); }}><LogIn className="mr-2 h-4 w-4" />Acesso responsável</Button>
            </SheetContent>
          </Sheet>
          <HeaderActions showInstall={false} showVersion={false} />
        </>} menu={<>
          <DropdownMenuItem onSelect={() => handleTabChange('inicio')}><Home className="mr-2 h-4 w-4" />Início do portal</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/auth')}><LogIn className="mr-2 h-4 w-4" />Acesso responsável</DropdownMenuItem>
        </>} />
      </div>
      <main id="portal-content" tabIndex={-1} className="ipnc-dashboard ipnc-safe-page-x mx-auto w-full max-w-[1120px] min-w-0 flex-1 pt-0 pb-[calc(var(--portal-nav-height,64px)+20px)] min-[700px]:pb-[calc(24px+var(--safe-bottom))]">
        {activeTab !== 'inicio' && <PageHeader title={tabs.find(tab => tab.key === activeTab)?.label || 'Portal da igreja'} description="Igreja Presbiteriana de Nova Carapina" />}
        {activeTab === 'inicio' && <InicioTab visitor={visitor} onTabChange={handleTabChange} />}
        {activeTab === 'programacoes' && <ProgramacoesTab />}
        {activeTab === 'avisos' && <AvisosTab />}
        {activeTab === 'dizimos' && <DizimosPortalTab />}
      </main>
      <nav ref={mobileNavRef} aria-label="Navegação principal do portal" className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card safe-bottom min-[700px]:hidden">
        <div className="ipnc-safe-page-x mx-auto grid max-w-[760px] grid-cols-4">
          {tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => handleTabChange(key)} aria-current={activeTab === key ? 'page' : undefined}
            className={`flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-xs ${activeTab === key ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
            <Icon className="h-[20px] w-[20px] shrink-0" /><span className="w-full [overflow-wrap:anywhere] text-center">{label}</span>
          </button>)}
        </div>
      </nav>
    </div>
  </div>;
}

// ---------- Início Tab ----------

function InicioTab({ visitor, onTabChange }: { visitor: VisitorData; onTabChange: (tab: PortalTab) => void }) {
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [lastAnnouncement, setLastAnnouncement] = useState<any>(null);
  const { loading: readLoading, hasSnapshot, error: readError, run: runRead } = useSnapshotRead('portal-InicioTab');
  const loading = readLoading && !hasSnapshot;

  const firstName = visitor.fullName.split(' ')[0];

  const fetchData = useCallback(() => runRead(async () => {
    const [eventsResult, announcementsResult] = await Promise.all([
      supabase.from('events').select('*').gte('start_date', new Date().toISOString()).neq('status', 'cancelado').order('start_date', { ascending: true }).limit(1),
      supabase.from('pastor_announcements').select('*').eq('scope', 'church').order('created_at', { ascending: false }).limit(1),
    ]);
    if (eventsResult.error) throw eventsResult.error;
    if (announcementsResult.error) throw announcementsResult.error;
    return () => {
      setNextEvent(eventsResult.data?.[0] || null);
      setLastAnnouncement(announcementsResult.data?.[0] || null);
    };
  }), [runRead]);
  useEffect(() => { void fetchData(); }, [fetchData]);
  const readFailure = readError ? <QueryErrorState message="Não foi possível consultar programações e avisos do início." onRetry={() => void fetchData()} retrying={readLoading} hasPreviousData={hasSnapshot} /> : null;


  return (
    <div className="space-y-4">
      <DashboardWelcome id="portal-welcome-title" date="Igreja Presbiteriana de Nova Carapina" title={<>Bem-vindo, <span>{firstName}!</span></>} description="Programações e avisos da igreja em um só lugar." />
      <Button variant="outline" className="min-h-[48px]" onClick={() => onTabChange('programacoes')}>Ver programações <ChevronRight className="ml-2 h-4 w-4" /></Button>
      {readFailure}

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
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Próximo Evento</p>
                <h3 className="[overflow-wrap:anywhere] font-semibold text-base">{nextEvent.title}</h3>
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
              className="flex min-h-[48px] items-center gap-1 text-sm text-primary font-medium mt-3 ml-auto hover:underline"
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Último Aviso</p>
                  {lastAnnouncement.priority === 'urgente' && (
                    <Badge variant="destructive" className="text-xs py-0">Urgente</Badge>
                  )}
                </div>
                <h3 className="[overflow-wrap:anywhere] font-semibold text-base">{lastAnnouncement.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground mt-1 whitespace-pre-line [overflow-wrap:anywhere]">{lastAnnouncement.message}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {formatDistanceToNow(new Date(lastAnnouncement.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
            <button
              onClick={() => onTabChange('avisos')}
              className="flex min-h-[48px] items-center gap-1 text-sm text-primary font-medium mt-3 ml-auto hover:underline"
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
  const { loading: readLoading, hasSnapshot, error: readError, run: runRead } = useSnapshotRead('portal-DizimosPortalTab');
  const loading = readLoading && !hasSnapshot;
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(() => runRead(async () => {
    const { data, error } = await supabase.from('settings').select('key, value').in('key', ['pix_key', 'pix_key_type', 'pix_beneficiary', 'pix_instructions']);
    if (error) throw error;
    const values = new Map((data || []).map(setting => [setting.key, setting.value]));
    return () => {
      setPixKey(values.get('pix_key') || '');
      setPixKeyType(values.get('pix_key_type') || '');
      setPixBeneficiary(values.get('pix_beneficiary') || '');
      setPixInstructions(values.get('pix_instructions') || '');
    };
  }), [runRead]);
  useEffect(() => { void fetchData(); }, [fetchData]);
  const readFailure = readError ? <QueryErrorState message="Não foi possível consultar informações de dízimos e ofertas." onRetry={() => void fetchData()} retrying={readLoading} hasPreviousData={hasSnapshot} /> : null;


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

  if (!hasSnapshot && readError) return readFailure;

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
        {readFailure}
        <Heart className="h-12 w-12 mb-3 opacity-40" />
        <p className="[overflow-wrap:anywhere] text-base font-medium">Chave PIX não configurada</p>
        <p className="text-xs mt-1">Em breve as informações estarão disponíveis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {readFailure}
      {/* Bloco motivacional */}
      <div className="relative rounded-2xl bg-background p-6 overflow-hidden">
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
              <code className="flex-1 text-base font-mono break-all font-semibold">{pixKey}</code>
              <Button onClick={handleCopy} variant={copied ? 'default' : 'outline'} size="sm" className="w-full sm:w-auto shrink-0">
                {copied ? <><Check className="h-4 w-4 mr-1" />Copiado!</> : <><Copy className="h-4 w-4 mr-1" />Copiar</>}
              </Button>
            </div>
          </div>

          {/* Tipo da chave */}
          {pixKeyType && (
            <div>
              <p className="text-xs text-muted-foreground">Tipo da chave</p>
              <p className="[overflow-wrap:anywhere] text-base font-medium">{PIX_TYPE_LABELS[pixKeyType] || pixKeyType}</p>
            </div>
          )}

          {/* Beneficiário */}
          {pixBeneficiary && (
            <div>
              <p className="text-xs text-muted-foreground">Beneficiário</p>
              <p className="[overflow-wrap:anywhere] text-base font-medium">{pixBeneficiary}</p>
            </div>
          )}

          {/* Instruções */}
          {pixInstructions && (
            <div className="rounded-lg bg-primary/5 p-4 border-l-4 border-primary">
              <p className="text-base leading-relaxed [overflow-wrap:anywhere] text-foreground">{pixInstructions}</p>
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
  const { loading: readLoading, hasSnapshot, error: readError, run: runRead } = useSnapshotRead('portal-ProgramacoesTab');
  const loading = readLoading && !hasSnapshot;

  const fetchData = useCallback(() => runRead(async () => {
    const [eventsResult, societiesResult] = await Promise.all([
      supabase.from('events').select('*').gte('start_date', new Date().toISOString()).neq('status', 'cancelado').order('start_date', { ascending: true }).limit(30),
      supabase.from('societies').select('id, name, slug, color').eq('active', true),
    ]);
    if (eventsResult.error) throw eventsResult.error;
    if (societiesResult.error) throw societiesResult.error;
    const societyMap: Record<string, Society> = {};
    (societiesResult.data || []).forEach(society => { societyMap[society.id] = society; });
    return () => { setEvents(eventsResult.data || []); setSocieties(societyMap); };
  }), [runRead]);
  useEffect(() => { void fetchData(); }, [fetchData]);
  const readFailure = readError ? <QueryErrorState message="Não foi possível consultar programações." onRetry={() => void fetchData()} retrying={readLoading} hasPreviousData={hasSnapshot} /> : null;


  const groupedByMonth: Record<string, any[]> = {};
  events.forEach((event) => {
    const key = format(new Date(event.start_date), "MMMM 'de' yyyy", { locale: ptBR });
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(event);
  });

  if (!hasSnapshot && readError) return readFailure;

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
      {readFailure}
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
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <h3 className="min-w-0 [overflow-wrap:anywhere] font-semibold text-base">{event.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {soc && (
                          <Badge variant="outline" className="text-xs" style={{ borderColor: soc.color, color: soc.color }}>
                            {soc.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-xs ${statusStyles[event.status] || ''}`}>
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
                      {event.all_day && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Dia inteiro</span>}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    )}
                    {event.description && (
                      <p className="text-base leading-relaxed text-muted-foreground mt-2 whitespace-pre-line [overflow-wrap:anywhere]">{event.description}</p>
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
  const { loading: readLoading, hasSnapshot, error: readError, run: runRead } = useSnapshotRead('portal-AvisosTab');
  const loading = readLoading && !hasSnapshot;

  const fetchData = useCallback(() => runRead(async () => {
    const { data, error } = await supabase.from('pastor_announcements').select('*').eq('scope', 'church').order('created_at', { ascending: false }).limit(30);
    if (error) throw error;
    return () => setAnnouncements(data || []);
  }), [runRead]);
  useEffect(() => { void fetchData(); }, [fetchData]);
  const readFailure = readError ? <QueryErrorState message="Não foi possível consultar avisos." onRetry={() => void fetchData()} retrying={readLoading} hasPreviousData={hasSnapshot} /> : null;


  if (!hasSnapshot && readError) return readFailure;

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
        {readFailure}
        <Bell className="h-12 w-12 mb-3 opacity-40" />
        <p className="[overflow-wrap:anywhere] text-base font-medium">Nenhum aviso</p>
        <p className="text-xs mt-1">Quando houver novidades, elas aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {readFailure}
      <h2 className="text-lg font-semibold">Avisos</h2>
      {announcements.map((a: any) => (
        <Card key={a.id} className={a.priority === 'urgente' ? 'border-destructive/50' : ''}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="[overflow-wrap:anywhere] text-base font-semibold">{a.title}</h3>
              {a.priority === 'urgente' && <Badge variant="destructive" className="text-xs">Urgente</Badge>}
            </div>
            <p className="[overflow-wrap:anywhere] text-base leading-relaxed text-muted-foreground mt-2 whitespace-pre-line">{a.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(a.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
