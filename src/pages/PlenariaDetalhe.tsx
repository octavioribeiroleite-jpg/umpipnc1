import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
}

interface AttendanceRecord {
  id: string;
  member_id: string;
  present: boolean;
  member_name: string;
}

export default function PlenariaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [plenary, setPlenary] = useState<Plenary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const canManage = isAdmin; // simplified; management role checked by RLS

  const fetchData = async () => {
    setLoading(true);

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

    // Fetch attendance with member names
    const { data: aData } = await supabase
      .from('plenary_attendance')
      .select('id, member_id, present, members(name)')
      .eq('plenary_id', id!);

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

  const handleStartAttendance = async () => {
    setStarting(true);
    // Get all active members
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

    // Insert attendance records (ignore conflicts)
    const rows = members.map((m) => ({
      plenary_id: id!,
      member_id: m.id,
      present: false,
      marked_by: user!.id,
    }));

    const { error: insertErr } = await supabase
      .from('plenary_attendance')
      .upsert(rows, { onConflict: 'plenary_id,member_id' });

    if (insertErr) {
      toast({ title: 'Erro ao iniciar chamada', variant: 'destructive' });
    } else {
      toast({ title: 'Chamada iniciada!' });
      fetchData();
    }
    setStarting(false);
  };

  const handleToggle = async (record: AttendanceRecord) => {
    if (!canManage) return;
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
    let y = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Chamada - ${plenary.title}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Date
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Data: ${format(new Date(plenary.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 12;

    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Presentes: ${presentCount}/${totalMembers} (${percentage}%)`, 20, y);
    y += 7;
    doc.text(`Quórum: ${quorumReached ? 'Atingido ✓' : 'Não atingido ✗'}`, 20, y);
    y += 12;

    // Present list
    const presentes = attendance.filter((a) => a.present).sort((a, b) => a.member_name.localeCompare(b.member_name));
    const ausentes = attendance.filter((a) => !a.present).sort((a, b) => a.member_name.localeCompare(b.member_name));

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Presentes', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    presentes.forEach((p, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}. ${p.member_name}`, 25, y);
      y += 6;
    });
    if (presentes.length === 0) {
      doc.text('Nenhum presente registrado.', 25, y);
      y += 6;
    }

    y += 6;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    if (y > 260) { doc.addPage(); y = 20; }
    doc.text('Ausentes', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    ausentes.forEach((a, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}. ${a.member_name}`, 25, y);
      y += 6;
    });
    if (ausentes.length === 0) {
      doc.text('Nenhum ausente registrado.', 25, y);
    }

    doc.save(`chamada-${plenary.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/plenarias')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{plenary.title}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(plenary.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Quorum Card */}
      {totalMembers > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-lg">
                  {presentCount}/{totalMembers}
                </span>
                <span className="text-muted-foreground">presentes</span>
              </div>
              <Badge variant={quorumReached ? 'default' : 'destructive'}>
                {quorumReached ? (
                  <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Quórum atingido</>
                ) : (
                  <><XCircle className="h-3.5 w-3.5 mr-1" /> Sem quórum</>
                )}
              </Badge>
            </div>
            <Progress value={percentage} className="h-3" />
            <p className="text-center text-sm font-medium">{percentage}%</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {attendance.length === 0 && canManage && (
          <Button onClick={handleStartAttendance} disabled={starting}>
            {starting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            Iniciar Chamada
          </Button>
        )}
        {attendance.length > 0 && (
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" /> Baixar PDF
          </Button>
        )}
      </div>

      {/* Search */}
      {attendance.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar membro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Member grid */}
      {attendance.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filteredAttendance.map((record) => (
            <button
              key={record.id}
              disabled={!canManage || toggling === record.id}
              onClick={() => handleToggle(record)}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all',
                'hover:shadow-md disabled:opacity-60',
                record.present
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-muted/40 border-border text-muted-foreground'
              )}
            >
              {toggling === record.id ? (
                <Loader2 className="h-5 w-5 animate-spin mb-1" />
              ) : record.present ? (
                <CheckCircle2 className="h-5 w-5 mb-1" />
              ) : (
                <XCircle className="h-5 w-5 mb-1" />
              )}
              <span className="text-xs font-medium leading-tight truncate w-full">
                {record.member_name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Chamada não iniciada</h3>
            <p className="text-muted-foreground text-sm">
              Clique em "Iniciar Chamada" para carregar todos os membros ativos.
            </p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
