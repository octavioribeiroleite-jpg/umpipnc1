import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, BookOpen, Sparkles, Copy, ArrowLeft, Loader2, Check, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StudyNote {
  id: string;
  society_id: string | null;
  title: string;
  date: string;
  notes: string;
  ai_summary: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function Estudos() {
  const { profile } = useAuth();
  const [studies, setStudies] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudy, setSelectedStudy] = useState<StudyNote | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesRef = useRef<string>('');

  // Yearly report state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [report, setReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const fetchStudies = useCallback(async () => {
    const { data, error } = await supabase
      .from('study_notes')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar estudos');
    } else {
      setStudies((data as unknown as StudyNote[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudies(); }, [fetchStudies]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !profile) return;
    setCreating(true);
    const { error } = await supabase.from('study_notes').insert({
      title: newTitle.trim(),
      date: newDate,
      society_id: profile.society_id,
      created_by: profile.user_id,
      notes: '',
    } as any);
    if (error) {
      toast.error('Erro ao criar estudo: ' + error.message);
    } else {
      toast.success('Estudo criado!');
      setNewTitle('');
      setDialogOpen(false);
      fetchStudies();
    }
    setCreating(false);
  };

  const saveNotes = useCallback(async (studyId: string, notes: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('study_notes')
      .update({ notes } as any)
      .eq('id', studyId);
    if (error) toast.error('Erro ao salvar');
    setSaving(false);
  }, []);

  const handleNotesChange = (value: string) => {
    if (!selectedStudy) return;
    notesRef.current = value;
    setSelectedStudy(prev => prev ? { ...prev, notes: value } : null);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveNotes(selectedStudy.id, value);
    }, 3000);
  };

  const handleSummarize = async () => {
    if (!selectedStudy) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await saveNotes(selectedStudy.id, selectedStudy.notes);
    setSummarizing(true);
    const { data, error } = await supabase.functions.invoke('summarize-study', {
      body: { studyId: selectedStudy.id },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Erro ao gerar resumo');
    } else {
      setSelectedStudy(prev => prev ? { ...prev, ai_summary: data.summary } : null);
      setStudies(prev => prev.map(s => s.id === selectedStudy.id ? { ...s, ai_summary: data.summary } : s));
      toast.success('Resumo gerado!');
    }
    setSummarizing(false);
  };

  const handleCopy = async () => {
    if (!selectedStudy?.ai_summary) return;
    await navigator.clipboard.writeText(selectedStudy.ai_summary);
    setCopied(true);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = async () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      await saveNotes(selectedStudy!.id, selectedStudy!.notes);
    }
    setSelectedStudy(null);
    fetchStudies();
  };

  const handleGenerateReport = async () => {
    if (!profile?.society_id) {
      toast.error('Sociedade não encontrada');
      return;
    }
    setGeneratingReport(true);
    setReport(null);
    const { data, error } = await supabase.functions.invoke('summarize-yearly-studies', {
      body: { year: parseInt(reportYear), society_id: profile.society_id },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Erro ao gerar relatório');
    } else {
      setReport(data.report);
      toast.success(`Relatório gerado com ${data.totalStudies} estudos!`);
    }
    setGeneratingReport(false);
  };

  const handleCopyReport = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setReportCopied(true);
    toast.success('Relatório copiado!');
    setTimeout(() => setReportCopied(false), 2000);
  };

  // Study detail view
  if (selectedStudy) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{selectedStudy.title}</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(selectedStudy.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            {saving && <Badge variant="secondary" className="text-xs">Salvando...</Badge>}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Anotações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Anote aqui os pontos do estudo bíblico..."
                value={selectedStudy.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="min-h-[250px] text-sm"
              />
            </CardContent>
          </Card>

          <Button onClick={handleSummarize} disabled={summarizing || !selectedStudy.notes.trim()} className="w-full">
            {summarizing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando resumo...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Gerar Resumo com IA</>
            )}
          </Button>

          {selectedStudy.ai_summary && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Resumo para WhatsApp
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                  {selectedStudy.ai_summary}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    );
  }

  // Studies list view
  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        <PageHeader
          title="Estudos"
          description="Anotações dos estudos bíblicos de sexta-feira"
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Novo Estudo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Estudo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Tema</label>
                  <Input
                    placeholder="Ex: O Sermão do Monte"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Data</label>
                  <Input
                    type="date"
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

          <Dialog open={reportDialogOpen} onOpenChange={(open) => { setReportDialogOpen(open); if (!open) { setReport(null); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <FileText className="h-4 w-4 mr-2" /> Relatório do Ano
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatório Anual dos Estudos
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Ano</label>
                    <Select value={reportYear} onValueChange={setReportYear}>
                      <SelectTrigger>
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
                      <><Sparkles className="h-4 w-4 mr-2" /> Gerar Relatório</>
                    )}
                  </Button>
                </div>

                {report && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Relatório {reportYear}
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={handleCopyReport}>
                          {reportCopied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                          {reportCopied ? 'Copiado!' : 'Copiar'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                        {report}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : studies.length === 0 ? (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum estudo registrado ainda.</p>
              <p className="text-sm text-muted-foreground">Crie o primeiro para começar a anotar!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {studies.map((study) => (
              <Card
                key={study.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedStudy(study); notesRef.current = study.notes; }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{study.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(study.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {study.ai_summary && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" /> Resumo
                        </Badge>
                      )}
                    </div>
                  </div>
                  {study.notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{study.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
