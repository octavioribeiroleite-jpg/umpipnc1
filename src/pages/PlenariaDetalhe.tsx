import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePersistedTextDraft } from '@/components/reunioes/usePersistedTextDraft';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ResponsiveSectionNavigation } from '@/components/layout/ResponsiveSectionNavigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Loader2,
  Search,
  Download,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Users,
  FileText,
  Save,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Edit3,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

interface Plenary {
  id: string;
  title: string;
  date: string;
  quorum_required: number;
  notes: string | null;
}

interface AttendanceRecord {
  id: string;
  member_id: string;
  present: boolean;
  member_name: string;
}

export default function PlenariaDetalhe() {
  const { id } = useParams<{ id: string }>();
  return <PlenaryWorkspace key={id} id={id} />;
}

function PlenaryWorkspace({ id }: { id?: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isManagement } = useAuth();

  const [plenary, setPlenary] = useState<Plenary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('chamada');
  const [attendanceError, setAttendanceError] = useState(false);
  const [attendanceCollapsed, setAttendanceCollapsed] = useState(false);
  const [finalMinutes, setFinalMinutes] = useState('');
  const [draftFinalMinutes, setDraftFinalMinutes] = useState('');
  const [finalError, setFinalError] = useState('');
  const [organizingAI, setOrganizingAI] = useState(false);
  const [editingFinal, setEditingFinal] = useState(false);
  const [savingFinal, setSavingFinal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const canManage = isManagement;
  const { value: notes, setValue: handleNotesChange, saving: savingNotes, dirty: notesDirty,
    savedValue: savedNotes, error: notesError, save: saveNotes } = usePersistedTextDraft({
    initialValue: plenary?.notes || '', enabled: canManage,
    persist: async (content) => {
      const { error } = await supabase.from('plenaries').update({ notes: content }).eq('id', id!);
      if (error) throw error;
    },
    onSaved: content => setPlenary(previous => previous ? { ...previous, notes: content } : previous),
  });

  const fetchData = async () => {
    if (!plenary) setLoading(true);

    const { data: pData, error: pErr } = await supabase
      .from('plenaries')
      .select('*')
      .eq('id', id!)
      .maybeSingle();

    if (pErr || !pData) {
      toast({ title: 'Plenária não encontrada', variant: 'destructive' });
      navigate('/plenarias');
      return;
    }
    setPlenary(pData as Plenary);
    setFinalMinutes((pData as any).final_minutes || '');

    const { data: aData, error: aError } = await supabase
      .from('plenary_attendance')
      .select('id, member_id, present, members(name)')
      .eq('plenary_id', id!);

    setAttendanceError(Boolean(aError));
    if (aError) { setLoading(false); return; }
    const records: AttendanceRecord[] = (aData || []).map((a: any) => ({
      id: a.id,
      member_id: a.member_id,
      present: a.present,
      member_name: a.members?.name || 'Sem nome',
    }));

    records.sort((a, b) => a.member_name.localeCompare(b.member_name));
    setAttendance(records);
    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleManualSave = async () => {
    if (await saveNotes()) toast({ title: 'Anotações salvas!' });
  };

  const handleOrganizeAI = async () => {
    if (!canManage || editingFinal || organizingAI || !(await saveNotes())) return;
    setOrganizingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('organize-plenary', {
        body: { plenaryId: id },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: data.error, variant: 'destructive' });
      } else {
        setFinalMinutes(data.final_minutes);
        setEditingFinal(false);
        setActiveSection('ata');
        toast({ title: 'Ata organizada com sucesso!' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao organizar com IA', description: err.message, variant: 'destructive' });
    }
    setOrganizingAI(false);
  };

  const handleSaveFinalMinutes = async () => {
    if (!canManage || savingFinal || !draftFinalMinutes.trim()) return;
    setSavingFinal(true);
    setFinalError('');
    try {
      const { error } = await supabase.from('plenaries').update({ final_minutes: draftFinalMinutes } as any).eq('id', id!);
      if (error) throw error;
      setFinalMinutes(draftFinalMinutes);
      setEditingFinal(false);
      toast({ title: 'Ata salva!' });
    } catch {
      setFinalError('Não foi possível salvar a ata. Seu texto foi preservado.');
      toast({ title: 'Erro ao salvar ata', variant: 'destructive' });
    } finally { setSavingFinal(false); }
  };

  const handleStartAttendance = async () => {
    setStarting(true);
    const { data: members, error } = await supabase
      .from('members')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (error || !members?.length) {
      toast({ title: 'Nenhum membro ativo encontrado', variant: 'destructive' });
      setStarting(false);
      return;
    }

    const rows = members.map((m) => ({
      plenary_id: id!,
      member_id: m.id,
      present: false,
      marked_by: user!.id,
    }));

    const { error: insertErr } = await supabase
      .from('plenary_attendance')
      .upsert(rows, { onConflict: 'plenary_id,member_id', ignoreDuplicates: true });

    if (insertErr) {
      console.error('Erro ao iniciar chamada:', insertErr);
      toast({ title: 'Erro ao iniciar chamada', description: insertErr.message, variant: 'destructive' });
    } else {
      toast({ title: 'Chamada iniciada!' });
      await fetchData();
    }
    setStarting(false);
  };

  const handleSyncMembers = async () => {
    setSyncing(true);
    const { data: members, error } = await supabase
      .from('members')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (error || !members?.length) {
      toast({ title: 'Nenhum membro ativo encontrado', variant: 'destructive' });
      setSyncing(false);
      return;
    }

    const existingIds = new Set(attendance.map((a) => a.member_id));
    const newMembers = members.filter((m) => !existingIds.has(m.id));

    if (newMembers.length === 0) {
      toast({ title: 'Todos os membros já estão na chamada' });
      setSyncing(false);
      return;
    }

    const rows = newMembers.map((m) => ({
      plenary_id: id!,
      member_id: m.id,
      present: false,
      marked_by: user!.id,
    }));

    const { error: insertErr } = await supabase
      .from('plenary_attendance')
      .upsert(rows, { onConflict: 'plenary_id,member_id', ignoreDuplicates: true });

    if (insertErr) {
      toast({ title: 'Erro ao adicionar membros', variant: 'destructive' });
    } else {
      toast({ title: `${newMembers.length} membro(s) adicionado(s)!` });
      await fetchData();
    }
    setSyncing(false);
  };

  const handleRemoveMember = async (record: AttendanceRecord) => {
    if (!canManage || !window.confirm(`Remover ${record.member_name} desta chamada? O cadastro do membro será preservado.`)) return;
    setRemoving(record.id);
    const { error } = await supabase
      .from('plenary_attendance')
      .delete()
      .eq('id', record.id);

    if (error) {
      toast({ title: 'Erro ao remover membro', variant: 'destructive' });
    } else {
      setAttendance((prev) => prev.filter((a) => a.id !== record.id));
      toast({ title: `${record.member_name} removido da chamada` });
    }
    setRemoving(null);
  };

  const handleToggle = async (record: AttendanceRecord) => {
    if (!canManage || toggling) return;
    setToggling(record.id);
    const newPresent = !record.present;

    const { error } = await supabase
      .from('plenary_attendance')
      .update({
        present: newPresent,
        marked_at: new Date().toISOString(),
        marked_by: user!.id,
      })
      .eq('id', record.id);

    if (error) {
      toast({ title: 'Erro ao atualizar presença', variant: 'destructive' });
    } else {
      setAttendance((prev) =>
        prev.map((a) => (a.id === record.id ? { ...a, present: newPresent } : a))
      );
    }
    setToggling(null);
  };

  const filteredAttendance = useMemo(() => {
    if (!search.trim()) return attendance;
    const q = search.toLowerCase();
    return attendance.filter((a) => a.member_name.toLowerCase().includes(q));
  }, [attendance, search]);

  const totalMembers = attendance.length;
  const presentCount = attendance.filter((a) => a.present).length;
  const percentage = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0;
  const quorumNeeded = plenary ? Math.floor(totalMembers / 2) + 1 : 0;
  const quorumReached = presentCount >= quorumNeeded && totalMembers > 0;

  const handleDownloadPDF = () => {
    if (!plenary) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;
    let pageNum = 1;

    const presentes = attendance.filter((a) => a.present).sort((a, b) => a.member_name.localeCompare(b.member_name));
    const ausentes = attendance.filter((a) => !a.present).sort((a, b) => a.member_name.localeCompare(b.member_name));
    const absentCount = totalMembers - presentCount;

    const addFooter = () => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        margin,
        pageHeight - 10
      );
      doc.text(
        `Página ${pageNum}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      );
    };

    const checkPage = (needed: number) => {
      if (y + needed > pageHeight - 20) {
        addFooter();
        doc.addPage();
        pageNum++;
        y = 20;
      }
    };

    // === HEADER ===
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório da Plenária', pageWidth / 2, 16, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(plenary.title, pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(
      format(new Date(plenary.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      pageWidth / 2,
      33,
      { align: 'center' }
    );

    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(1);
    doc.line(margin, 43, pageWidth - margin, 43);
    y = 50;

    // === SUMMARY BOX ===
    doc.setFillColor(240, 245, 250);
    doc.roundedRect(margin, y, contentWidth, 36, 3, 3, 'F');
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 36, 3, 3, 'S');

    doc.setTextColor(30, 58, 95);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const col1 = margin + 10;
    const col2 = margin + contentWidth * 0.3;
    const col3 = margin + contentWidth * 0.55;
    const statsY = y + 12;

    doc.text('Presentes', col1, statsY);
    doc.text('Ausentes', col2, statsY);
    doc.text('Total', col3, statsY);

    doc.setFontSize(16);
    doc.setTextColor(39, 174, 96);
    doc.text(`${presentCount}`, col1, statsY + 10);
    doc.setTextColor(231, 76, 60);
    doc.text(`${absentCount}`, col2, statsY + 10);
    doc.setTextColor(30, 58, 95);
    doc.text(`${totalMembers}`, col3, statsY + 10);

    const barX = margin + contentWidth * 0.72;
    const barW = contentWidth * 0.22;
    const barY = statsY + 1;
    const barH = 6;
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(barX, barY, barW, barH, 2, 2, 'F');
    const fillW = (barW * percentage) / 100;
    if (fillW > 0) {
      doc.setFillColor(quorumReached ? 39 : 231, quorumReached ? 174 : 76, quorumReached ? 96 : 60);
      doc.roundedRect(barX, barY, Math.max(fillW, 4), barH, 2, 2, 'F');
    }
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`${percentage}%`, barX + barW / 2, barY + barH + 8, { align: 'center' });

    if (quorumReached) {
      doc.setFillColor(39, 174, 96);
    } else {
      doc.setFillColor(231, 76, 60);
    }
    const badgeText = quorumReached ? 'Quórum Atingido' : 'Sem Quórum';
    const badgeW = doc.getTextWidth(badgeText) + 10;
    doc.roundedRect(barX + (barW - badgeW) / 2, barY + barH + 12, badgeW, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(badgeText, barX + barW / 2, barY + barH + 17, { align: 'center' });

    y += 44;

    // === NOTES/ATA SECTION (use finalMinutes if available, otherwise raw notes) ===
    const ataContent = finalMinutes.trim() || savedNotes.trim();
    if (ataContent) {
      checkPage(30);
      doc.setFillColor(30, 58, 95);
      doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(finalMinutes.trim() ? 'Ata da Plenária' : 'Anotações / Ata', margin + 5, y + 6.5);
      y += 14;

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const lines = doc.splitTextToSize(ataContent, contentWidth - 10);
      for (const line of lines) {
        checkPage(6);
        doc.text(line, margin + 5, y);
        y += 5;
      }
      y += 6;
    }

    // === HELPER: render member list ===
    const renderList = (
      title: string,
      list: AttendanceRecord[],
      headerColor: [number, number, number],
      dotColor: [number, number, number],
      emptyMsg: string
    ) => {
      checkPage(20);
      doc.setFillColor(...headerColor);
      doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${title} (${list.length})`, margin + 5, y + 6.5);
      y += 14;

      if (list.length === 0) {
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(emptyMsg, margin + 5, y);
        y += 8;
        return;
      }

      list.forEach((item, i) => {
        checkPage(8);
        if (i % 2 === 0) {
          doc.setFillColor(245, 247, 250);
          doc.rect(margin, y - 4.5, contentWidth, 7, 'F');
        }
        doc.setFillColor(...dotColor);
        doc.circle(margin + 6, y - 1.5, 1.5, 'F');
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const num = `${(i + 1).toString().padStart(2, '0')}.`;
        doc.text(num, margin + 11, y);
        doc.text(item.member_name, margin + 22, y);
        y += 7;
      });
      y += 4;
    };

    renderList('Presentes', presentes, [39, 174, 96], [39, 174, 96], 'Nenhum presente registrado.');
    renderList('Ausentes', ausentes, [231, 76, 60], [231, 76, 60], 'Nenhum ausente registrado.');

    addFooter();

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(255, 255, 255);
      doc.rect(pageWidth - margin - 40, pageHeight - 14, 40, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    doc.save(`plenaria-${plenary.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!plenary) return null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1120px] space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5 rounded-2xl border border-border bg-card p-4">
        <Button variant="ghost" size="icon" aria-label="Voltar às plenárias" onClick={() => navigate('/plenarias')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold min-w-0 whitespace-normal break-words">{plenary.title}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(plenary.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        {attendance.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={notesDirty || savingNotes || editingFinal || savingFinal}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
        )}
      </div>

      {(notesDirty || editingFinal) && <p role="status" className="text-sm text-muted-foreground">Salve as alterações de texto antes de baixar o PDF.</p>}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-6">
        <ResponsiveSectionNavigation label="Seção da plenária" value={activeSection} onChange={setActiveSection}
          options={[{ value: 'chamada', label: 'Chamada' }, { value: 'notas', label: 'Anotações' }, { value: 'ata', label: 'Ata' }]} />
      <TabsContent forceMount value="chamada" className="max-w-[760px] data-[state=inactive]:hidden">
      {/* ===== SEÇÃO 1: CHAMADA ===== */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Chamada de Presença
            </CardTitle>
            {attendance.length > 0 && (
              <div className="flex items-center gap-1">
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSyncMembers}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-1" />
                    )}
                    Adicionar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAttendanceCollapsed(!attendanceCollapsed)}
                >
                  {attendanceCollapsed ? (
                    <><ChevronDown className="h-4 w-4 mr-1" /> Expandir</>
                  ) : (
                    <><ChevronUp className="h-4 w-4 mr-1" /> Recolher</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {attendanceError && <QueryErrorState message="Não foi possível carregar a chamada." onRetry={fetchData} retrying={loading} hasPreviousData={attendance.length > 0} />}
          {/* Quorum summary - always visible */}
          {totalMembers > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">
                    {presentCount}/{totalMembers}
                  </span>
                  <span className="text-muted-foreground text-sm">presentes</span>
                </div>
                <Badge variant={quorumReached ? 'default' : 'destructive'}>
                  {quorumReached ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Quórum atingido</>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5 mr-1" /> Sem quórum</>
                  )}
                </Badge>
              </div>
              <Progress value={percentage} className="h-2.5" />
              <p className="text-sm text-muted-foreground">{percentage}% presentes. Critério atual: maioria dos {totalMembers} membros da chamada, com pelo menos {quorumNeeded} presentes.</p>
            </div>
          )}

          {/* Start button */}
          {!attendanceError && attendance.length === 0 && canManage && (
            <Button onClick={handleStartAttendance} disabled={starting} className="w-full">
              {starting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Iniciar Chamada
            </Button>
          )}

          {!attendanceError && attendance.length === 0 && !canManage && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              Chamada não iniciada
            </div>
          )}

          {/* Member grid - collapsible */}
          {attendance.length > 0 && !attendanceCollapsed && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label="Buscar membro na chamada" placeholder="Buscar membro..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {filteredAttendance.length === 0 && <p className="py-4 text-muted-foreground">Nenhum membro encontrado para esta busca.</p>}
              <div className="space-y-3">
                {filteredAttendance.map((record) => (
                  <div key={record.id} className="flex items-stretch gap-2">
                    <button
                      aria-pressed={record.present}
                      disabled={!canManage || Boolean(toggling)}
                      onClick={() => handleToggle(record)}
                      className={cn(
                        'min-w-0 min-h-16 flex-1 flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        'hover:shadow-md disabled:opacity-60',
                        record.present
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : 'bg-muted/40 border-border text-muted-foreground'
                      )}
                    >
                      {toggling === record.id ? (
                        <Loader2 className="h-6 w-6 shrink-0 animate-spin" />
                      ) : record.present ? (
                        <CheckCircle2 className="h-6 w-6 shrink-0" />
                      ) : (
                        <XCircle className="h-6 w-6 shrink-0" />
                      )}
                      <span className="flex-1 text-base font-medium leading-6 min-w-0 whitespace-normal break-words">
                        {record.member_name}
                        <span className="block text-sm font-normal">{record.present ? 'Presente' : 'Ausente'}</span>
                      </span>
                    </button>
                    {canManage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMember(record);
                        }}
                        disabled={removing === record.id}
                        aria-label={`Remover ${record.member_name} da chamada`} className="h-12 w-12 shrink-0 rounded-xl border border-border text-destructive flex items-center justify-center hover:bg-destructive/10"
                        title="Remover da chamada"
                      >
                        {removing === record.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      </TabsContent>
      <TabsContent forceMount value="notas" className="max-w-[760px] data-[state=inactive]:hidden">
      {/* ===== SEÇÃO 2: ANOTAÇÕES / ATA ===== */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Anotações da plenária
            </CardTitle>
            <div className="flex items-center gap-2">
              {savingNotes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleManualSave} disabled={!canManage || !notesDirty || savingNotes}>
                <Save className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p role="status" aria-live="polite" className="mb-3 text-sm text-muted-foreground">{savingNotes ? 'Salvando anotações…' : notesDirty ? 'Alterações não salvas' : 'Anotações salvas'}</p>
          {notesError && <p role="alert" className="mb-3 text-destructive">{notesError}</p>}
          <Textarea aria-label="Registro da plenária"
            placeholder="Registre aqui as pautas, decisões, informes e tudo que for discutido durante a plenária. Essas anotações serão incluídas no relatório final em PDF."
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="min-h-[300px] text-base leading-6 resize-y"
            readOnly={!canManage || organizingAI}
          />
          <p className="text-xs text-muted-foreground mt-2">
            As anotações são salvas automaticamente. Elas serão combinadas com a chamada no relatório final.
          </p>
          {canManage && notes.trim() && (
            <Button
              onClick={handleOrganizeAI}
              disabled={organizingAI || savingNotes || editingFinal}
              className="mt-3 w-full"
              variant="outline"
            >
              {organizingAI ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {organizingAI ? 'Organizando com IA...' : 'Organizar Ata com IA'}
            </Button>
          )}
        </CardContent>
      </Card>

      </TabsContent>
      <TabsContent forceMount value="ata" className="max-w-[760px] data-[state=inactive]:hidden">
      {!finalMinutes && <div className="rounded-xl border border-dashed p-6 space-y-3"><p>A ata organizada ainda não foi gerada. Escreva as anotações e revise o texto preparado pela IA.</p><Button variant="outline" onClick={() => setActiveSection('notas')}>Ir às anotações</Button></div>}
      {/* ===== SEÇÃO 3: ATA ORGANIZADA ===== */}
      {finalMinutes && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5" />
                Ata Organizada
              </CardTitle>
              <div className="flex items-center gap-2">
                {canManage && !editingFinal && (
                  <Button variant="ghost" size="sm" onClick={() => { setDraftFinalMinutes(finalMinutes); setFinalError(''); setEditingFinal(true); }}>
                    <Edit3 className="h-4 w-4 mr-1" /> Editar
                  </Button>
                )}
                {editingFinal && (
                  <>
                    <Button variant="ghost" size="sm" disabled={savingFinal} onClick={() => { setEditingFinal(false); setDraftFinalMinutes(''); setFinalError(''); }}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveFinalMinutes} disabled={savingFinal || !draftFinalMinutes.trim()}>
                      {savingFinal ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Salvar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {finalError && <p role="alert" className="mb-3 text-destructive">{finalError}</p>}
            {editingFinal ? (
              <Textarea aria-label="Ata organizada da plenária"
                disabled={savingFinal}
                value={draftFinalMinutes}
                onChange={(e) => setDraftFinalMinutes(e.target.value)}
                className="min-h-[300px] text-base leading-6 resize-y"
              />
            ) : (
              <div className="break-words whitespace-pre-wrap text-base leading-6 text-foreground bg-muted/30 rounded-xl p-4 border">
                {finalMinutes}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Revise o conteúdo organizado pela IA. A versão salva será usada no relatório PDF.
            </p>
          </CardContent>
        </Card>
      )}
      </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}
