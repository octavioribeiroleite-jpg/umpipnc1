import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Award, AlertTriangle, Lock, Download, Users, ArrowLeft, CircleDot, ChevronRight, User } from 'lucide-react';
import { format, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateEbdAttendancePDF } from '@/utils/generateEbdPDF';
import { generateEbdPeriodPDF } from '@/utils/generateEbdPDF';
import { toast } from 'sonner';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EbdClass {
  id: string;
  name: string;
  order_index: number;
}

interface EbdStudent {
  id: string;
  class_id: string;
  name: string;
}

interface ClassSummaryItem {
  classId: string;
  className: string;
  total: number;
  present: number;
  percentage: number;
  visitor_count?: number;
  visitors?: { name: string | null }[];
}

interface DayRecord {
  date: string;
  isClosed: boolean;
  closureId?: string;
  closedBy?: string;
  totalStudents: number;
  presentStudents: number;
  classSummary: ClassSummaryItem[];
  markedByNames: string[];
  visitorCount: number;
}

interface StudentStats {
  id: string;
  name: string;
  present: number;
  total: number;
  percentage: number;
}

type PeriodFilter = '4weeks' | '3months' | 'all';

interface HistoricoTabProps {
  classes: EbdClass[];
  students: EbdStudent[];
  accessLevel: 'admin' | 'professor';
  onRefreshParent?: () => Promise<void>;
}

export default function HistoricoTab({ classes, students, accessLevel, onRefreshParent }: HistoricoTabProps) {
  const [period, setPeriod] = useState<PeriodFilter>('4weeks');
  const [allAttendance, setAllAttendance] = useState<{ student_id: string; class_id: string; date: string; present: boolean; marked_by: string | null }[]>([]);
  const [closures, setClosures] = useState<{ id: string; date: string; closed_by: string; total_students: number; present_students: number; class_summary: ClassSummaryItem[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null);
  const [closingDay, setClosingDay] = useState(false);
  const [openDialog, setOpenDialog] = useState<'perfect' | 'lowFreq' | 'absent' | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    let attendanceQuery = supabase.from('ebd_attendance').select('student_id, class_id, date, present, marked_by');
    let closureQuery = supabase.from('ebd_day_closures').select('*').order('date', { ascending: false });

    if (period === '4weeks') {
      const cutoff = format(subWeeks(new Date(), 4), 'yyyy-MM-dd');
      attendanceQuery = attendanceQuery.gte('date', cutoff);
      closureQuery = closureQuery.gte('date', cutoff);
    } else if (period === '3months') {
      const cutoff = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
      attendanceQuery = attendanceQuery.gte('date', cutoff);
      closureQuery = closureQuery.gte('date', cutoff);
    }

    const [{ data: attData }, { data: closureData }] = await Promise.all([
      attendanceQuery.order('date', { ascending: true }),
      closureQuery,
    ]);

    setAllAttendance(attData || []);
    setClosures((closureData || []).map((c: any) => ({
      ...c,
      class_summary: (c.class_summary || []) as ClassSummaryItem[],
    })));
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [period]);

  const totalMembers = students.length;

  const dayRecords = useMemo<DayRecord[]>(() => {
    const closureMap = new Map(closures.map(c => [c.date, c]));
    const dates = [...new Set(allAttendance.map(a => a.date))].sort().reverse();

    return dates
      .filter(date => {
        const d = new Date(date + 'T12:00:00');
        return d.getDay() === 0; // Only Sundays
      })
      .map(date => {
      const closure = closureMap.get(date);
      const dayAtt = allAttendance.filter(a => a.date === date);
      const markedByNames = [...new Set(dayAtt.map(a => a.marked_by).filter(Boolean))] as string[];

      if (closure) {
        return {
          date,
          isClosed: true,
          closureId: closure.id,
          closedBy: closure.closed_by,
          totalStudents: totalMembers,
          presentStudents: closure.present_students,
          classSummary: closure.class_summary,
          markedByNames: closure.closed_by ? [closure.closed_by, ...markedByNames.filter(n => n !== closure.closed_by)] : markedByNames,
          visitorCount: (closure as any).visitor_count ?? 0,
        };
      }

      const presentCount = dayAtt.filter(a => a.present).length;
      const classStudentMap = new Map<string, number>();
      students.forEach(s => classStudentMap.set(s.class_id, (classStudentMap.get(s.class_id) || 0) + 1));
      const classSummary: ClassSummaryItem[] = classes.map(cls => {
        const classTotal = classStudentMap.get(cls.id) || 0;
        const cp = dayAtt.filter(a => a.class_id === cls.id && a.present).length;
        return { classId: cls.id, className: cls.name, total: classTotal, present: cp, percentage: classTotal > 0 ? Math.round((cp / classTotal) * 100) : 0 };
      }).filter(cs => cs.total > 0);

      return { date, isClosed: false, totalStudents: totalMembers, presentStudents: presentCount, classSummary, markedByNames, visitorCount: 0 };
    });
  }, [allAttendance, closures, classes, students, totalMembers]);

  const getPercentColor = (pct: number) => {
    if (pct > 70) return 'text-green-600';
    if (pct >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDownloadPDF = async (record: DayRecord) => {
    const { data: dayAttendance } = await supabase.from('ebd_attendance').select('*').eq('date', record.date);
    if (dayAttendance) {
      const dateObj = new Date(record.date + 'T12:00:00');
      generateEbdAttendancePDF({ classes, students, attendance: dayAttendance, date: record.date, formattedDate: format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) });
    }
  };

  const periodLabel = period === '4weeks' ? 'Últimas 4 semanas' : period === '3months' ? 'Últimos 3 meses' : 'Todo o período';

  const handleDownloadPeriodPDF = () => {
    if (dayRecords.length === 0) {
      toast.error('Nenhuma chamada registrada neste período.');
      return;
    }
    try {
      const days = dayRecords.map(r => ({
        date: r.date,
        present: r.presentStudents,
        total: r.totalStudents,
        percentage: r.totalStudents > 0 ? Math.round((r.presentStudents / r.totalStudents) * 100) : 0,
        visitorCount: r.visitorCount,
      }));
      const classAgg = new Map<string, { name: string; totalPresent: number; pctSum: number; count: number }>();
      dayRecords.forEach(r => {
        r.classSummary.forEach(cs => {
          const cur = classAgg.get(cs.classId) || { name: cs.className, totalPresent: 0, pctSum: 0, count: 0 };
          cur.totalPresent += cs.present;
          cur.pctSum += cs.percentage;
          cur.count += 1;
          classAgg.set(cs.classId, cur);
        });
      });
      const classes2 = [...classAgg.values()].map(c => ({
        name: c.name,
        totalPresent: c.totalPresent,
        avgPercentage: c.count > 0 ? Math.round(c.pctSum / c.count) : 0,
      }));
      generateEbdPeriodPDF({ periodLabel, days, classes: classes2 });
    } catch (e) {
      console.error('Erro ao gerar relatório do período:', e);
      toast.error('Erro ao gerar relatório do período.');
    }
  };

  const handleCloseDay = async (record: DayRecord) => {
    setClosingDay(true);
    const { data: dayAttendance } = await supabase.from('ebd_attendance').select('*').eq('date', record.date);
    if (!dayAttendance) { setClosingDay(false); return; }

    const classSummary = classes.map(cls => {
      const cr = dayAttendance.filter(a => a.class_id === cls.id);
      const cp = cr.filter(a => a.present).length;
      return { classId: cls.id, className: cls.name, total: cr.length, present: cp, percentage: cr.length > 0 ? Math.round((cp / cr.length) * 100) : 0 };
    }).filter(cs => cs.total > 0);

    const presentStudents = dayAttendance.filter(a => a.present).length;

    const { error } = await supabase.from('ebd_day_closures').insert({
      date: record.date,
      closed_by: 'Administrador',
      total_students: dayAttendance.length,
      present_students: presentStudents,
      class_summary: classSummary,
    });

    setClosingDay(false);
    if (error) { toast.error('Erro ao fechar o dia'); return; }

    toast.success('Dia fechado com sucesso!');
    await fetchHistory();
    if (onRefreshParent) await onRefreshParent();
    // Update selected day
    setSelectedDay(prev => prev ? { ...prev, isClosed: true } : null);
  };

  const { barData, metrics, perfectStudents, absentStudents, lowFreqStudents } = useMemo(() => {
    const sundayDates = [...new Set(allAttendance.map(a => a.date))]
      .filter(date => new Date(date + 'T12:00:00').getDay() === 0)
      .sort();

    const classStudentCounts = new Map<string, number>();
    students.forEach(s => {
      classStudentCounts.set(s.class_id, (classStudentCounts.get(s.class_id) || 0) + 1);
    });

    const barData = classes.map(cls => {
      const classTotal = classStudentCounts.get(cls.id) || 0;
      const cr = allAttendance.filter(a => a.class_id === cls.id);
      const cd = [...new Set(cr.map(a => a.date))].filter(d => new Date(d + 'T12:00:00').getDay() === 0);
      let avgPct = 0;
      if (cd.length > 0 && classTotal > 0) {
        avgPct = Math.round(cd.reduce((sum, date) => {
          const present = cr.filter(a => a.date === date && a.present).length;
          return sum + (present / classTotal) * 100;
        }, 0) / cd.length);
      }
      return { classId: cls.id, name: cls.name, media: avgPct };
    }).sort((a, b) => b.media - a.media);

    const bestClass = barData.length > 0 ? barData[0] : null;

    const studentMap = new Map<string, { present: number; total: number }>();
    allAttendance.filter(a => new Date(a.date + 'T12:00:00').getDay() === 0).forEach(a => {
      if (!studentMap.has(a.student_id)) studentMap.set(a.student_id, { present: 0, total: 0 });
      const s = studentMap.get(a.student_id)!;
      s.total++;
      if (a.present) s.present++;
    });

    const totalSundays = sundayDates.length;
    const perfectStudents = students.filter(s => { const r = studentMap.get(s.id); return r && r.present === totalSundays && totalSundays > 0; });
    const absentStudents = students.filter(s => { const r = studentMap.get(s.id); return !r || r.present === 0; });
    
    // New: Low frequency students (<30% excluding never attended)
    const lowFreqStudents = students.filter(s => {
      const r = studentMap.get(s.id);
      if (!r || r.present === 0) return false; // exclude never attended
      const freq = r.total > 0 ? (r.present / r.total) : 0;
      return freq < 0.30;
    });

    const avgAll = totalSundays > 0 && totalMembers > 0 
      ? Math.round(sundayDates.reduce((sum, date) => {
          const dayPresence = allAttendance.filter(a => a.date === date && a.present).length;
          return sum + (dayPresence / totalMembers) * 100;
        }, 0) / totalSundays)
      : 0;

    const presencesPerDay = sundayDates.map(date => {
      const present = allAttendance.filter(a => a.date === date && a.present).length;
      return { date, presenca: totalMembers > 0 ? Math.round((present / totalMembers) * 100) : 0 };
    });

    const best = presencesPerDay.length > 0 
      ? presencesPerDay.reduce((a, b) => a.presenca > b.presenca ? a : b)
      : null;
    
    const worst = presencesPerDay.length > 0 
      ? presencesPerDay.reduce((a, b) => a.presenca < b.presenca ? a : b)
      : null;

    return { 
      barData, 
      metrics: { 
        best: best ? { date: format(new Date(best.date + 'T12:00:00'), 'dd/MM', { locale: ptBR }), presenca: best.presenca } : null, 
        worst: worst ? { date: format(new Date(worst.date + 'T12:00:00'), 'dd/MM', { locale: ptBR }), presenca: worst.presenca } : null, 
        bestClass, 
        totalSundays, 
        avgAll 
      }, 
      perfectStudents, 
      absentStudents,
      lowFreqStudents
    };
  }, [allAttendance, classes, students, totalMembers]);

  // Student stats for selected class
  const studentStats = useMemo<StudentStats[]>(() => {
    if (!selectedClassId) return [];
    
    const sundayDates = [...new Set(allAttendance.map(a => a.date))]
      .filter(date => new Date(date + 'T12:00:00').getDay() === 0)
      .sort();
    
    const classStudents = students.filter(s => s.class_id === selectedClassId);
    
    return classStudents.map(student => {
      const studentAttendance = allAttendance.filter(a => 
        a.student_id === student.id && 
        sundayDates.includes(a.date)
      );
      
      const present = studentAttendance.filter(a => a.present).length;
      const total = sundayDates.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return {
        id: student.id,
        name: student.name,
        present,
        total,
        percentage
      };
    }).sort((a, b) => a.percentage - b.percentage); // Sort by lowest frequency first
  }, [selectedClassId, allAttendance, students]);
  
  const selectedClass = classes.find(c => c.id === selectedClassId);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando histórico...</div>;
  }

  // ─── DETAIL VIEW (full-screen) ───
  if (selectedDay) {
    const pct = totalMembers > 0 ? Math.round((selectedDay.presentStudents / totalMembers) * 100) : 0;
    const dateFormatted = format(new Date(selectedDay.date + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    // Refresh from latest dayRecords
    const freshRecord = dayRecords.find(d => d.date === selectedDay.date) || selectedDay;

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)} className="text-xs -ml-2">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar ao histórico
        </Button>

        {/* Date header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold capitalize">{dateFormatted}</h2>
          </div>
          <div className="flex items-center gap-2">
            {freshRecord.isClosed ? (
              <Badge variant="outline" className="text-xs border-green-500/40 text-green-700 bg-green-500/10">
                <Lock className="h-3 w-3 mr-1" /> Fechado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-700 bg-blue-500/10">
                <CircleDot className="h-3 w-3 mr-1" /> Em aberto
              </Badge>
            )}
          </div>
        </div>

        {/* Stats card */}
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Presença geral</p>
                <p className="text-3xl font-bold">
                  {freshRecord.presentStudents}
                  <span className="text-lg font-normal text-muted-foreground">/{freshRecord.totalStudents}</span>
                </p>
              </div>
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className={`text-xl font-bold ${getPercentColor(pct)}`}>{pct}%</span>
              </div>
            </div>
            <Progress value={pct} className="h-2" />
            {freshRecord.visitorCount > 0 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Visitantes
                </span>
                <span className="text-sm font-medium">{freshRecord.visitorCount}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Who made the attendance */}
        {freshRecord.markedByNames.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Responsável(is) pela chamada
              </p>
              <div className="flex flex-wrap gap-2">
                {freshRecord.markedByNames.map((name, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Class breakdown */}
        {freshRecord.classSummary.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Presença por turma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...freshRecord.classSummary].sort((a, b) => b.percentage - a.percentage).map((cs, i) => (
                <div key={cs.classId || i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cs.className}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{cs.present}/{cs.total}</span>
                      <span className={`text-sm font-bold ${getPercentColor(cs.percentage)}`}>{cs.percentage}%</span>
                    </div>
                  </div>
                  <Progress value={cs.percentage} className="h-1.5" />
                  {(cs.visitor_count ?? 0) > 0 && (
                    <div className="pt-0.5 space-y-0.5">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> {cs.visitor_count} visitante{(cs.visitor_count ?? 0) > 1 ? 's' : ''}
                      </p>
                      {cs.visitors && cs.visitors.length > 0 && (
                        <p className="text-[11px] text-muted-foreground pl-4">
                          {cs.visitors.map((v, idx) => v.name || 'sem nome').join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => handleDownloadPDF(freshRecord)}>
            <Download className="h-4 w-4 mr-2" /> Baixar PDF
          </Button>
          {accessLevel === 'admin' && !freshRecord.isClosed && (
            <Button
              className="flex-1"
              disabled={closingDay}
              onClick={() => handleCloseDay(freshRecord)}
            >
              <Lock className="h-4 w-4 mr-2" /> {closingDay ? 'Fechando...' : 'Fechar dia'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-2">
        {([
          { key: '4weeks' as PeriodFilter, label: '4 semanas' },
          { key: '3months' as PeriodFilter, label: '3 meses' },
          { key: 'all' as PeriodFilter, label: 'Todo período' },
        ]).map(p => (
          <Button key={p.key} variant={period === p.key ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p.key)}>
            {p.label}
          </Button>
        ))}
      </div>

      {/* Compact day cards */}
      {dayRecords.length > 0 && (
        <div className="space-y-2">
          {dayRecords.map(record => {
            const pct = totalMembers > 0 ? Math.round((record.presentStudents / totalMembers) * 100) : 0;
            const dateObj = new Date(record.date + 'T12:00:00');
            const dayName = format(dateObj, 'EEEE', { locale: ptBR });
            const dayNum = format(dateObj, 'dd');
            const monthName = format(dateObj, 'MMM', { locale: ptBR });

            return (
              <Card
                key={record.date}
                className="cursor-pointer hover:bg-accent/30 transition-colors active:scale-[0.99]"
                onClick={() => setSelectedDay(record)}
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  {/* Date block */}
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary leading-none">{dayNum}</span>
                    <span className="text-[10px] text-primary/70 uppercase">{monthName}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize truncate">{dayName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {record.isClosed ? (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-500/40 text-green-700 bg-green-500/10">
                          Fechado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-500/40 text-blue-700 bg-blue-500/10">
                          Em aberto
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {record.presentStudents}/{record.totalStudents}
                        {record.visitorCount > 0 && ` +${record.visitorCount}v`}
                      </span>
                    </div>
                  </div>

                  {/* Percentage */}
                  <span className={`text-lg font-bold ${getPercentColor(pct)}`}>{pct}%</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo Geral */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Resumo geral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{metrics.totalSundays}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Domingos registrados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{totalMembers}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Alunos cadastrados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{metrics.avgAll}%</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Média geral</p>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Melhor domingo</p>
              {metrics.best ? (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-sm font-bold text-green-600">{metrics.best.presenca}%</span>
                  <span className="text-[10px] text-muted-foreground">{metrics.best.date}</span>
                </div>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pior domingo</p>
              {metrics.worst ? (
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-sm font-bold text-red-500">{metrics.worst.presenca}%</span>
                  <span className="text-[10px] text-muted-foreground">{metrics.worst.date}</span>
                </div>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </div>
          </div>

          {metrics.bestClass && (
            <>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Melhor turma</p>
                  <p className="text-sm font-medium">{metrics.bestClass.name}</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-sm font-bold">{metrics.bestClass.media}%</Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Clickable student highlight cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* 100% Presença */}
        <button
          onClick={() => perfectStudents.length > 0 && setOpenDialog('perfect')}
          disabled={perfectStudents.length === 0}
          className="rounded-xl border bg-card p-3 text-left hover:bg-accent/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          <Award className="h-5 w-5 text-yellow-500 mb-1.5" />
          <p className="text-2xl font-bold text-green-600">{perfectStudents.length}</p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">100% presença</p>
        </button>

        {/* Frequência Baixa */}
        <button
          onClick={() => lowFreqStudents.length > 0 && setOpenDialog('lowFreq')}
          disabled={lowFreqStudents.length === 0}
          className="rounded-xl border bg-card p-3 text-left hover:bg-accent/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          <TrendingDown className="h-5 w-5 text-yellow-500 mb-1.5" />
          <p className="text-2xl font-bold text-yellow-600">{lowFreqStudents.length}</p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Freq. baixa &lt;30%</p>
        </button>

        {/* Nunca compareceram */}
        <button
          onClick={() => absentStudents.length > 0 && setOpenDialog('absent')}
          disabled={absentStudents.length === 0}
          className="rounded-xl border bg-card p-3 text-left hover:bg-accent/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          <AlertTriangle className="h-5 w-5 text-red-500 mb-1.5" />
          <p className="text-2xl font-bold text-red-600">{absentStudents.length}</p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Nunca vieram</p>
        </button>
      </div>

      <ResponsiveDialog open={openDialog !== null} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {openDialog === 'perfect' && 'Alunos com 100% de presença'}
              {openDialog === 'lowFreq' && 'Alunos com frequência baixa (<30%)'}
              {openDialog === 'absent' && 'Alunos que nunca compareceram'}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <ScrollArea className="max-h-[60vh] pr-1">
            <div className="space-y-2 py-2">
              {(openDialog === 'perfect' ? perfectStudents : openDialog === 'lowFreq' ? lowFreqStudents : absentStudents).length > 0 ? (
                (openDialog === 'perfect' ? perfectStudents : openDialog === 'lowFreq' ? lowFreqStudents : absentStudents).map((student) => (
                  <div key={student.id} className="rounded-lg border bg-background px-3 py-2 text-sm font-medium">
                    {student.name}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum aluno nesta categoria.</p>
              )}
            </div>
          </ScrollArea>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      
      {/* Class Students Dialog */}
      <ResponsiveDialog open={selectedClassId !== null} onOpenChange={(open) => !open && setSelectedClassId(null)}>
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alunos da turma: {selectedClass?.name}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <ScrollArea className="max-h-[60vh] pr-1">
            <div className="space-y-3 py-2">
              {studentStats.length > 0 ? (
                studentStats.map((student) => {
                  const bgColor = student.percentage >= 70 ? 'bg-green-50 border-green-200' : student.percentage >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
                  const textColor = student.percentage >= 70 ? 'text-green-600' : student.percentage >= 40 ? 'text-yellow-600' : 'text-red-600';
                  
                  return (
                    <div key={student.id} className={`rounded-lg border p-3 ${bgColor}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{student.name}</span>
                        <span className={`text-lg font-bold ${textColor}`}>{student.percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{student.present}/{student.total} domingos</span>
                        <span className={student.percentage >= 70 ? 'text-green-600' : student.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                          {student.percentage >= 70 ? 'Boa frequência' : student.percentage >= 40 ? 'Frequência regular' : 'Precisa de atenção'}
                        </span>
                      </div>
                      <Progress value={student.percentage} className="h-1.5" />
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma.</p>
              )}
            </div>
          </ScrollArea>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {barData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Comparativo entre turmas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {barData.map((cls) => {
              const bgColor = cls.media >= 70 ? 'bg-green-500/10 border-green-500/30' : cls.media >= 40 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30';
              const textColor = cls.media >= 70 ? 'text-green-600' : cls.media >= 40 ? 'text-yellow-600' : 'text-red-600';
              return (
                <button
                  key={cls.classId}
                  onClick={() => setSelectedClassId(cls.classId)}
                  className={`rounded-xl border p-4 text-left hover:bg-accent/40 transition-all active:scale-[0.97] ${bgColor}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Users className={`h-4 w-4 ${textColor}`} />
                    <span className={`text-2xl font-bold ${textColor}`}>{cls.media}%</span>
                  </div>
                  <p className="text-sm font-medium truncate">{cls.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">média de presença</p>
                </button>
              );
            })}
          </div>
        </div>
      )}




      {allAttendance.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhum registro de presença encontrado para este período.</p>
      )}
    </div>
  );
}
