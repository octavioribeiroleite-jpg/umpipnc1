import { QueryErrorState } from '@/components/ui/query-error-state';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, BookOpen, Sparkles, Copy, ArrowLeft, Loader2, Check, FileText, Search, ChevronRight, PenLine, MessageSquare, SlidersHorizontal, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatStudySummaryForWhatsApp, splitStudyNotes } from '../../supabase/functions/summarize-study/study-whatsapp';
import { StudyWhatsAppPreview } from '@/components/estudos/StudyWhatsAppPreview';
import { buildStudyRetrospective, studyDateLabel, studyRetrospectiveMessage, type SavedStudySummary, type StudyRetrospective } from '@/lib/study-retrospective';

interface StudyNote {
  id: string;
  society_id: string | null;
  title: string;
  date: string;
  notes: string;
  summary_guidance: string;
  ai_summary: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

type StudyDraft = Pick<StudyNote, 'notes' | 'summary_guidance'>;
type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';

function searchableText(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export default function Estudos() {
  const { profile, effectiveSocietyId, isManagement, isPastor } = useAuth();
  const [studies, setStudies] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<StudyNote | null>(null);
  const [search, setSearch] = useState('');
  const [detailTab, setDetailTab] = useState('notes');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showCopyText, setShowCopyText] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<Promise<boolean>>(Promise.resolve(true));
  const editVersion = useRef(0);
  const draftRef = useRef<StudyDraft>({ notes: '', summary_guidance: '' });
  const copyTextRef = useRef<HTMLTextAreaElement>(null);
  const summaryTabRef = useRef<HTMLButtonElement>(null);
  const whatsappSummary = formatStudySummaryForWhatsApp(selectedStudy?.ai_summary ?? '');
  const searchTerms = searchableText(search).split(' ').filter(Boolean);
  const visibleStudies = studies.flatMap(study => {
    const excerpt = splitStudyNotes(study.notes).content
      .replace(/^\s*Instrução:[^\n]*$/gimu, '')
      .replace(/\s+/g, ' ').trim();
    const searchable = searchableText(study.title + ' ' + excerpt);
    return searchTerms.every(term => searchable.includes(term)) ? [{ study, excerpt }] : [];
  });

  // Yearly report state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [report, setReport] = useState<StudyRetrospective | null>(null);
  const [reportError, setReportError] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [reportCopyText, setReportCopyText] = useState(false);
  const reportRequest = useRef(0);
  const reportSocietyId = effectiveSocietyId ?? profile?.society_id;
  const canReadReport = isManagement || isPastor;
  const reportEntries = report?.entries.filter(entry => entry.paragraphs.length) ?? [];
  const missingEntries = report?.entries.filter(entry => !entry.paragraphs.length) ?? [];

  useEffect(() => {
    reportRequest.current++;
    setReport(null);
    setReportError('');
    setReportCopied(false);
    setReportCopyText(false);
    setGeneratingReport(false);
  }, [reportSocietyId, canReadReport]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const fetchStudies = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('study_notes')
      .select('*')
      .order('date', { ascending: false });
    setLoadError(Boolean(error));
    if (error) {
      toast.error('Erro ao carregar estudos');
    } else {
      setStudies((data as unknown as StudyNote[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudies(); }, [fetchStudies]);

  useEffect(() => {
    if (!showCopyText) return;
    copyTextRef.current?.focus();
    copyTextRef.current?.select();
  }, [showCopyText]);

  const openStudy = (study: StudyNote) => {
    editVersion.current++;
    draftRef.current = { notes: study.notes, summary_guidance: study.summary_guidance ?? '' };
    setSaveStatus('saved');
    setCopied(false);
    setShowCopyText(false);
    setDetailTab('notes');
    setSelectedStudy({ ...study, ...draftRef.current });
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !profile) return;
    setCreating(true);

    // Resolver society_id com fallback para evitar estudos órfãos (invisíveis pela RLS)
    let societyId: string | null = profile.society_id ?? null;
    if (!societyId) {
      const { data: memberRow } = await supabase
        .from('members')
        .select('society_id')
        .eq('user_id', profile.user_id)
        .maybeSingle();
      societyId = (memberRow as any)?.society_id ?? null;
    }
    if (!societyId) {
      toast.error('Não foi possível identificar sua sociedade. Atualize a página e tente novamente.');
      setCreating(false);
      return;
    }

    const { data, error } = await supabase.from('study_notes').insert({
      title: newTitle.trim(),
      date: newDate,
      society_id: societyId,
      created_by: profile.user_id,
      notes: '',
    }).select().single();
    if (error || !data) {
      toast.error('Não foi possível criar o estudo.');
    } else {
      toast.success('Estudo criado!');
      setNewTitle('');
      setDialogOpen(false);
      setSearch('');
      setStudies(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      openStudy(data);
    }
    setCreating(false);
  };

  const saveNotes = useCallback((studyId: string, draft: StudyDraft, version: number) => {
    setSaveStatus('saving');
    // Finish an in-flight autosave before writing newer notes for the summary.
    const save = pendingSave.current.then(async () => {
      try {
        const { data, error } = await supabase
          .from('study_notes')
          .update(draft)
          .eq('id', studyId)
          .select('id')
          .single();
        if (!error && data) {
          setStudies(prev => prev.map(study => study.id === studyId ? { ...study, ...draft } : study));
          return true;
        }
      } catch {
        // Keep the editor open with the unsaved text so the user can retry.
      }
      toast.error('Não foi possível salvar as anotações. Tente novamente.');
      return false;
    });
    pendingSave.current = save;
    void save.then(ok => {
      if (pendingSave.current === save && editVersion.current === version) {
        setSaveStatus(ok ? 'saved' : 'error');
      }
    });
    return save;
  }, []);

  const handleDraftChange = (field: keyof StudyDraft, value: string) => {
    if (!selectedStudy) return;
    const draft = { ...draftRef.current, [field]: value };
    draftRef.current = draft;
    const version = ++editVersion.current;
    setSaveStatus('pending');
    setSelectedStudy(prev => prev ? { ...prev, ...draft } : null);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSaveTimer.current = null;
      void saveNotes(selectedStudy.id, draft, version);
    }, 3000);
  };

  const flushDraft = (studyId: string) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = null;
    return saveNotes(studyId, draftRef.current, editVersion.current);
  };

  const handleSummarize = async () => {
    if (!selectedStudy) return;
    setSummarizing(true);
    try {
      const saved = saveStatus === 'saved' ? true : await flushDraft(selectedStudy.id);
      if (!saved) return;
      const { data, error } = await supabase.functions.invoke('summarize-study', {
        body: { studyId: selectedStudy.id },
      });
      if (error || data?.error || typeof data?.summary !== 'string') {
        toast.error(data?.error || error?.message || 'Erro ao gerar resumo');
        return;
      }
      const summary = formatStudySummaryForWhatsApp(data.summary);
      if (!summary) {
        toast.error('A IA não retornou um resumo. Tente novamente.');
        return;
      }
      setSelectedStudy(prev => prev?.id === selectedStudy.id ? { ...prev, ai_summary: summary } : prev);
      setStudies(prev => prev.map(s => s.id === selectedStudy.id ? { ...s, ai_summary: summary } : s));
      setCopied(false);
      setShowCopyText(false);
      setDetailTab('summary');
      summaryTabRef.current?.focus();
      toast.success('Resumo gerado!');
    } catch {
      toast.error('Erro ao gerar resumo. Tente novamente.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleCopy = async () => {
    if (!whatsappSummary) return;
    try {
      await navigator.clipboard.writeText(whatsappSummary);
    } catch {
      setShowCopyText(true);
      return;
    }
    setCopied(true);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = async () => {
    if (selectedStudy && saveStatus !== 'saved') {
      const version = editVersion.current;
      if (!await flushDraft(selectedStudy.id) || editVersion.current !== version) return;
    }
    editVersion.current++;
    setSelectedStudy(null);
  };

  const handleGenerateReport = async () => {
    if (!canReadReport || !reportSocietyId) {
      setReportError('Selecione uma sociedade para gerar a retrospectiva.');
      return;
    }
    const request = ++reportRequest.current;
    const year = Number(reportYear);
    setGeneratingReport(true);
    setReport(null);
    setReportError('');
    setReportCopied(false);
    setReportCopyText(false);
    try {
      const rows: SavedStudySummary[] = [];
      const batch = 100;
      for (let offset = 0; ; offset += batch) {
        const { data, error } = await supabase.from('study_notes')
          .select('id,date,title,ai_summary')
          .eq('society_id', reportSocietyId)
          .gte('date', year + '-01-01')
          .lt('date', (year + 1) + '-01-01')
          .order('date', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + batch - 1);
        if (reportRequest.current !== request) return;
        if (error || !data) throw error ?? new Error('Consulta sem resultado');
        rows.push(...data);
        if (data.length < batch) break;
      }
      setReport(buildStudyRetrospective(year, rows));
    } catch {
      if (reportRequest.current === request) {
        setReportError('Não foi possível consultar os estudos. Tente novamente.');
      }
    } finally {
      if (reportRequest.current === request) setGeneratingReport(false);
    }
  };

  const handleCopyReport = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(studyRetrospectiveMessage(report));
      setReportCopied(true);
      setReportCopyText(false);
    } catch {
      setReportCopyText(true);
    }
  };

  const handleDownloadReport = async () => {
    if (!report || downloadingReport) return;
    setDownloadingReport(true);
    try {
      const { buildStudyRetrospectivePdf } = await import('@/lib/study-retrospective-pdf');
      buildStudyRetrospectivePdf(report).save('retrospectiva-estudos-' + report.year + '.pdf');
    } catch {
      toast.error('Não foi possível baixar o PDF. Tente novamente.');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Study detail view
  if (selectedStudy) {
    return (
      <AppLayout>
        <div className="mx-auto min-w-0 max-w-[760px] space-y-4">
          <Button variant="ghost" className="-ml-2 min-h-11 px-2 text-primary" aria-label="Voltar à lista de estudos" onClick={handleBack} disabled={summarizing}>
            <ArrowLeft className="h-4 w-4" /> Estudos
          </Button>
          <header className="space-y-1">
            <h1 className="break-words font-display text-page-title font-bold leading-tight tracking-tight">{selectedStudy.title}</h1>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(selectedStudy.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </header>

          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList aria-label="Visualização do estudo" className="grid w-full grid-cols-2 bg-primary/10">
              <TabsTrigger value="notes" className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary">
                <PenLine className="h-4 w-4" /> Anotações
              </TabsTrigger>
              <TabsTrigger ref={summaryTabRef} value="summary" className="gap-2 data-[state=active]:bg-card data-[state=active]:text-primary">
                <MessageSquare className="h-4 w-4" /> Resumo
              </TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="mt-4 space-y-3">
              <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-3">
                <label htmlFor="study-notes" className="font-semibold">Anotações do estudo</label>
                <span role="status" className={saveStatus === 'error' ? 'text-sm text-destructive' : 'text-sm text-primary'}>
                  {saveStatus === 'saved' && 'Salvo'}
                  {saveStatus === 'pending' && 'Aguardando salvamento'}
                  {saveStatus === 'saving' && 'Salvando…'}
                  {saveStatus === 'error' && 'Alterações não salvas'}
                </span>
              </div>
              <Textarea id="study-notes" rows={10}
                placeholder="Escreva os pontos e exemplos do estudo..."
                value={selectedStudy.notes}
                onChange={event => handleDraftChange('notes', event.target.value)}
                readOnly={summarizing}
                className="min-h-[285px] resize-y bg-card text-base leading-relaxed"
              />
              {saveStatus === 'error' && (
                <Button variant="outline" onClick={() => void flushDraft(selectedStudy.id)} disabled={summarizing}>Tentar salvar novamente</Button>
              )}
              <details className="rounded-xl border border-border bg-card">
                <summary className="min-h-11 cursor-pointer rounded-xl px-3 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                  <SlidersHorizontal className="mx-1 inline h-4 w-4 text-primary" aria-hidden="true" /> Orientações para a IA
                  <span className="ml-2 text-xs font-normal text-muted-foreground">Opcional</span>
                </summary>
                <div className="space-y-2 px-3 pb-3">
                  <label htmlFor="study-guidance" className="text-sm font-medium">O que a IA deve levar em conta?</label>
                  <Textarea id="study-guidance" rows={2}
                    value={selectedStudy.summary_guidance}
                    onChange={event => handleDraftChange('summary_guidance', event.target.value)}
                    placeholder="Ex.: dê mais destaque à aplicação para os jovens."
                    aria-describedby="study-summary-instructions"
                    readOnly={summarizing}
                    className="text-base"
                  />
                  <p id="study-summary-instructions" className="text-sm text-muted-foreground">
                    As instruções entre parênteses nas anotações também são consideradas.
                  </p>
                </div>
              </details>
              <Button onClick={handleSummarize} disabled={summarizing || !splitStudyNotes(selectedStudy.notes).content} className="min-h-11 w-full">
                {summarizing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando resumo…</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Gerar Resumo com IA</>
                )}
              </Button>
            </TabsContent>
            <TabsContent value="summary" className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Resumo para WhatsApp</h2>
                  <p className="text-sm text-muted-foreground">Prévia da mensagem</p>
                </div>
                {whatsappSummary && (
                  <Button onClick={handleCopy} className="min-h-11">
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Button>
                )}
              </div>
              {whatsappSummary ? <StudyWhatsAppPreview message={whatsappSummary} /> : (
                <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Gere um resumo para visualizar a mensagem que você vai copiar.</p>
                  <Button variant="outline" onClick={() => setDetailTab('notes')}>Abrir anotações</Button>
                </div>
              )}
              {showCopyText && (
                <div className="space-y-2">
                  <label htmlFor="study-copy-text" className="font-medium">Selecione e copie o texto para colar no WhatsApp</label>
                  <Textarea id="study-copy-text" ref={copyTextRef} readOnly value={whatsappSummary} rows={8} className="text-base" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    );
  }

  // Studies list view
  return (
    <AppLayout>
      <div className="min-w-0 space-y-4 max-w-[760px] mx-auto">
        <header className="space-y-1">
          <h1 className="font-display text-page-title font-bold leading-tight tracking-tight">Estudos</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">Anotações dos estudos bíblicos de sexta-feira</p>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="min-h-11 min-w-0 whitespace-normal px-2 sm:px-4">
                <Plus className="h-4 w-4 mr-2" /> Novo Estudo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Estudo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label htmlFor="study-title" className="text-sm font-medium mb-1 block">Tema ou passagem</label>
                  <Input
                    id="study-title" placeholder="Ex: O Sermão do Monte"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="study-date" className="text-sm font-medium mb-1 block">Data</label>
                  <Input
                    id="study-date" type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Criar Estudo
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {canReadReport && <Dialog open={reportDialogOpen} onOpenChange={open => {
            setReportDialogOpen(open);
            if (!open) {
              reportRequest.current++;
              setGeneratingReport(false);
              setReport(null);
              setReportError('');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="min-h-11 min-w-0 whitespace-normal bg-card px-2 sm:px-4">
                <FileText className="h-4 w-4 mr-2" /> Relatório do Ano
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Retrospectiva dos estudos
                </DialogTitle>
                <DialogDescription>Relembre cada encontro a partir do resumo salvo naquela aula.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="w-full min-w-0 sm:flex-1">
                    <label htmlFor="study-report-year" className="text-sm font-medium mb-1 block">Ano</label>
                    <Select value={reportYear} disabled={generatingReport} onValueChange={year => {
                      setReportYear(year);
                      setReport(null);
                      setReportError('');
                    }}>
                      <SelectTrigger id="study-report-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleGenerateReport} disabled={generatingReport}>
                    {generatingReport ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                    ) : (
                      <><FileText className="h-4 w-4 mr-2" /> Gerar retrospectiva</>
                    )}
                  </Button>
                </div>

                {reportError && <p role="alert" className="text-sm text-destructive">{reportError}</p>}
                {report && (
                  <section className="space-y-4" aria-labelledby="study-report-title">
                    <div className="space-y-2 border-b border-border pb-3">
                      <h2 id="study-report-title" className="font-semibold">O que estudamos em {report.year}</h2>
                      <p className="text-sm text-muted-foreground" role="status">
                        {report.entries.length ? reportEntries.length + ' de ' + report.entries.length + ' encontros com resumo salvo.' : 'Nenhum estudo cadastrado para este ano.'}
                      </p>
                      {!!reportEntries.length && <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handleCopyReport}>
                          {reportCopied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                          {reportCopied ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <Button onClick={handleDownloadReport} disabled={downloadingReport}>
                          {downloadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                          Baixar PDF
                        </Button>
                      </div>}
                    </div>
                    {reportCopyText && <div className="space-y-2">
                      <label htmlFor="annual-copy-text" className="text-sm font-medium">Selecione o texto para copiar</label>
                      <Textarea id="annual-copy-text" rows={8} readOnly value={studyRetrospectiveMessage(report)} />
                    </div>}
                    {reportEntries.map(entry => (
                      <section key={entry.id} className="space-y-2">
                        <p className="text-sm font-medium text-primary">{studyDateLabel(entry.date)}</p>
                        <h3 className="break-words font-semibold">{entry.title}</h3>
                        <StudyWhatsAppPreview message={entry.paragraphs.join('\n\n')} />
                      </section>
                    ))}
                    {!!missingEntries.length && (
                      <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                        <h3 className="text-sm font-semibold">Encontros sem resumo salvo</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {missingEntries.map(entry => <li key={entry.id}>{studyDateLabel(entry.date)} · {entry.title}</li>)}
                        </ul>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </DialogContent>
          </Dialog>}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Buscar estudo por tema ou passagem"
            placeholder="Buscar por tema ou passagem"
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="min-h-11 bg-card pl-9 text-base"
          />
        </div>
        {loadError && <QueryErrorState message="Não foi possível carregar os estudos." onRetry={fetchStudies} retrying={loading} hasPreviousData={studies.length > 0} />}
        {loading && studies.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : loadError && studies.length === 0 ? null : studies.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title="Nenhum estudo registrado ainda"
            description="Crie o primeiro para começar a anotar!"
          />
        ) : (
          <section className="space-y-2" aria-labelledby="recent-studies">
            <h2 id="recent-studies" className="font-semibold">{searchTerms.length ? 'Resultados da busca' : 'Estudos recentes'}</h2>
            {visibleStudies.length ? (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {visibleStudies.map(({ study, excerpt }) => (
                  <li key={study.id} className="first:rounded-t-2xl last:rounded-b-2xl">
                    <button type="button" onClick={() => openStudy(study)}
                      aria-label={study.ai_summary ? `${study.title}, resumo pronto` : study.title}
                      className="flex w-full min-w-0 items-center justify-between gap-2 rounded-[inherit] px-3 py-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
                    >
                      <span className="grid min-w-0 flex-1 gap-1">
                        <span className="break-words font-semibold">{study.title}</span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                          <span>{format(parseISO(study.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                          {study.ai_summary && (
                            <Badge variant="secondary" className="gap-1 bg-primary/10 text-xs text-primary">
                              <Check className="h-3 w-3" /> Resumo pronto
                            </Badge>
                          )}
                        </span>
                        {excerpt && <span className="line-clamp-2 break-words text-sm text-muted-foreground">{excerpt}</span>}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p role="status" className="py-3 text-sm text-muted-foreground">Nenhum estudo encontrado.</p>}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
