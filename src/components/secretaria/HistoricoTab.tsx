import { captureEbdSnapshot, assertEbdSnapshotCurrent, EbdSnapshotChangedError } from '@/lib/ebd-attendance-queue';
import { useEbdNavigation } from '@/hooks/useEbdNavigation';
import HistoricalChamada from './HistoricalChamada';
import { closeEbdDay, reopenEbdDay, readEbdDay } from '@/lib/ebd-day';
import { buildDayRoster, buildDayClasses, type DayStudent, type DayClass } from '@/lib/ebd-roster';
import { reportEbdWriteError } from '@/lib/ebd-mutations';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/ebd-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Award, AlertTriangle, Lock, Download, Users, ArrowLeft, CircleDot, ChevronRight, User, Pencil, LockOpen } from 'lucide-react';
import { format, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateEbdAttendancePDF, generateEbdPeriodPDF, generateEbdQuarterlyPDF } from '@/utils/generateEbdPDF';
import { toast } from 'sonner';
import { reportClientError } from '@/utils/reportClientError';
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

// Closure summaries own historical totals; a class filter only selects that saved slice.
function filterHistoryDays(records: DayRecord[], classId: string): DayRecord[] {
  if (classId === 'all') return records;
  return records.flatMap(record => {
    const summary = record.classSummary.find(item => item.classId === classId);
    return summary ? [{ ...record, classSummary: [summary], totalStudents: summary.total,
      presentStudents: summary.present, visitorCount: summary.visitor_count ?? 0 }] : [];
  });
}

function historyStudentStats(pupils: DayStudent[], attendance: { student_id: string; class_id: string; date: string; present: boolean }[], records: DayRecord[], classId: string): StudentStats[] {
  const stats = new Map<string, StudentStats>();
  for (const day of records) {
    if (new Date(day.date + 'T12:00:00').getDay() !== 0) continue;
    const rows = attendance.filter(row => row.date === day.date);
    const roster = buildDayRoster(pupils, rows, day.date).filter(pupil => classId === 'all' || pupil.class_id === classId);
    for (const pupil of roster) {
      const item = stats.get(pupil.id) || { id: pupil.id, name: pupil.name, present: 0, total: 0, percentage: 0 };
      item.total++;
      if (rows.some(row => row.student_id === pupil.id && row.class_id === pupil.class_id && row.present)) item.present++;
      item.percentage = Math.round(item.present / item.total * 100);
      stats.set(pupil.id, item);
    }
  }
  return [...stats.values()].sort((a, b) => a.percentage - b.percentage || a.name.localeCompare(b.name, 'pt-BR'));
}

type PeriodFilter = '4weeks' | '3months' | 'all';

interface HistoricoTabProps {
  sessionScope?: string;
  classes: EbdClass[];
  students: EbdStudent[];
  accessLevel: 'admin' | 'professor';
  onRefreshParent?: () => Promise<void>;
  refreshedAt?: number;
}

export default function HistoricoTab({ sessionScope = 'historical', classes, students, accessLevel, onRefreshParent, refreshedAt }: HistoricoTabProps) {
  const navigation = useEbdNavigation();
  const [localEditingDate, setLocalEditingDate] = useState<string | null>(null);
  const editingDate = navigation ? (navigation.screen.editing ? navigation.screen.day || null : null) : localEditingDate;
  const setEditingDate = (date: string | null) => {
    if (navigation) {
      if (date) navigation.open({ view: 'historico', day: date, editing: true });
      else navigation.backTo(screen => screen.view === 'historico' && screen.day === editingDate && !screen.editing);
    } else setLocalEditingDate(date);
  };
  const [confirmAction, setConfirmAction] = useState<'close' | 'reopen' | null>(null);
  const [historyStudents, setHistoryStudents] = useState<DayStudent[]>(students);
  const [historyClasses, setHistoryClasses] = useState<DayClass[]>(classes);
  const [otherDates, setOtherDates] = useState<string[]>([]);
  const [historyVisitors, setHistoryVisitors] = useState<{ date: string; class_id: string; name: string | null }[]>([]);
  const [classFilterId, setClassFilterId] = useState('all');
  const [period, setPeriod] = useState<PeriodFilter>(navigation?.screen.day ? 'all' : '4weeks');
  const [allAttendance, setAllAttendance] = useState<{ student_id: string; class_id: string; date: string; present: boolean; marked_by: string | null }[]>([]);
  const [closures, setClosures] = useState<{ id: string; date: string; closed_by: string; total_students: number; present_students: number; class_summary: ClassSummaryItem[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSelectedDate, setLocalSelectedDate] = useState<string | null>(null);
  const selectedDate = navigation ? navigation.screen.day || null : localSelectedDate;
  const setSelectedDay = (day: DayRecord | null) => {
    if (navigation) { if (day) navigation.open({ view: 'historico', day: day.date }); else navigation.back(); }
    else setLocalSelectedDate(day?.date || null);
  };
  useEffect(() => { window.scrollTo({ top: 0 }); }, [selectedDate, editingDate]);
  const [closingDay, setClosingDay] = useState(false);
  const [openDialog, setOpenDialog] = useState<'perfect' | 'lowFreq' | 'absent' | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [generatingQuarterly, setGeneratingQuarterly] = useState(false);
  const reportScope = useRef({ sessionScope, active: true });
  reportScope.current.sessionScope = sessionScope;
  useEffect(() => {
    const scope = reportScope.current;
    scope.active = true;
    return () => { scope.active = false; };
  }, []);
  const isReportScopeCurrent = (scope: string) => reportScope.current.active && reportScope.current.sessionScope === scope;
  const requestId = useRef(0);
  const [historySnapshotVersion, setHistorySnapshotVersion] = useState<number | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [callActors, setCallActors] = useState<{date: string; changed_by: string}[]>([]);

  const fetchHistory = async () => {
    const scope = sessionScope;
    const request = ++requestId.current;
    const snapshotVersion = captureEbdSnapshot();
    try {
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

    const readPages = async <T,>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) => {
      const rows: T[] = [];
      for (let from = 0; ; from += 1000) {
        const result = await query(from, from + 999);
        if (result.error) throw result.error;
        rows.push(...(result.data || []));
        if (!result.data || result.data.length < 1000) return rows;
      }
    };
    const cutoff = period === '4weeks' ? format(subWeeks(new Date(), 4), 'yyyy-MM-dd') : period === '3months' ? format(subMonths(new Date(), 3), 'yyyy-MM-dd') : '0001-01-01';
    const [attData, closureData, pupils, groups, calls, visits] = await Promise.all([
      readPages((from, to) => attendanceQuery.order('date').order('student_id').range(from, to)),
      readPages((from, to) => closureQuery.range(from, to)),
      readPages((from, to) => supabase.from('ebd_students').select('*').order('id').range(from, to)),
      readPages((from, to) => supabase.from('ebd_classes').select('*').order('id').range(from, to)),
      readPages((from, to) => supabase.from('ebd_call_status' as never).select('date,class_id,changed_by').gte('date', cutoff).order('date').order('class_id').range(from, to)),
      readPages((from, to) => supabase.from('ebd_class_visitor_entries' as never).select('date,class_id,name').gte('date', cutoff).order('date').order('id').range(from, to)),
    ]);

    if (request !== requestId.current || !isReportScopeCurrent(scope)) return;
    setHistorySnapshotVersion(snapshotVersion);
    setHistoryStudents(pupils);
    setHistoryClasses(groups);
    setOtherDates((calls as { date: string }[]).map(row => row.date));
    setCallActors(calls as {date: string; changed_by: string}[]);
    setHistoryVisitors(visits as { date: string; class_id: string; name: string | null }[]);
    setHistoryError(false);
    setAllAttendance(attData || []);
    setClosures((closureData || []).map((c: any) => ({
      ...c,
      class_summary: (c.class_summary || []) as ClassSummaryItem[],
    })));
    } catch {
      if (request === requestId.current && isReportScopeCurrent(scope)) setHistoryError(true);
    } finally {
      if (request === requestId.current && isReportScopeCurrent(scope)) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
    return () => { requestId.current++; };
  }, [period, refreshedAt, sessionScope]);


  const dayRecords = useMemo<DayRecord[]>(() => {
    const closureMap = new Map(closures.map(c => [c.date, c]));
    const dates = [...new Set([...allAttendance.map(a => a.date), ...closures.map(c => c.date), ...otherDates, ...historyVisitors.map(v => v.date)])].sort().reverse();

    return dates.map(date => {
      const closure = closureMap.get(date);
      const dayAtt = allAttendance.filter(a => a.date === date);
      const markedByNames = [...new Set(callActors.filter(c => c.date === date).map(c => c.changed_by).filter(Boolean))];

      if (closure) {
        return {
          date,
          isClosed: true,
          closureId: closure.id,
          closedBy: closure.closed_by,
          totalStudents: closure.total_students,
          presentStudents: closure.present_students,
          classSummary: closure.class_summary,
          markedByNames: closure.closed_by ? [closure.closed_by, ...markedByNames.filter(n => n !== closure.closed_by)] : markedByNames,
          visitorCount: (closure as any).visitor_count ?? 0,
        };
      }

      const roster = buildDayRoster(historyStudents, dayAtt, date);
      const visitors = historyVisitors.filter(v => v.date === date);
      const groups = buildDayClasses(historyClasses, roster, visitors.map(v => v.class_id));
      const presentCount = dayAtt.filter(a => a.present).length;
      const classSummary = groups.map(cls => {
        const total = roster.filter(s => s.class_id === cls.id).length;
        const present = dayAtt.filter(a => a.class_id === cls.id && a.present).length;
        const entries = visitors.filter(v => v.class_id === cls.id);
        return { classId: cls.id, className: cls.name, total, present, percentage: total ? Math.round(present / total * 100) : 0, visitor_count: entries.length, visitors: entries };
      });
      return { date, isClosed: false, totalStudents: roster.length, presentStudents: presentCount, classSummary, markedByNames, visitorCount: visitors.length };
    });
  }, [callActors, allAttendance, closures, historyClasses, historyStudents, otherDates, historyVisitors]);

  const filteredDayRecords = useMemo(() => filterHistoryDays(dayRecords, classFilterId), [dayRecords, classFilterId]);
  const classOptions = useMemo(() => {
    const options = new Map(historyClasses.map(group => [group.id, group.name]));
    // Newest saved names take priority, including inactive historical classes.
    [...dayRecords].reverse().forEach(day => day.classSummary.forEach(group => options.set(group.classId, group.className)));
    return [...options].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [historyClasses, dayRecords]);
  const filterClassName = classFilterId === 'all' ? 'Todas as turmas' : classOptions.find(group => group.id === classFilterId)?.name || 'Turma selecionada';
  const selectedDay = filteredDayRecords.find(day => day.date === selectedDate) || null;
  const historyStats = useMemo(() => historyStudentStats(historyStudents, allAttendance, filteredDayRecords, classFilterId), [historyStudents, allAttendance, filteredDayRecords, classFilterId]);
  const totalMembers = historyStats.length;

  const getPercentColor = (pct: number) => {
    if (pct > 70) return 'text-green-600';
    if (pct >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDownloadPDF = async (record: DayRecord) => {
    const scope = sessionScope;
    try {
      const day = await readEbdDay(record.date);
      if (!isReportScopeCurrent(scope)) return;
      generateEbdAttendancePDF({ snapshotVersion: day.snapshotVersion, classes: day.classes.filter(group => classFilterId === 'all' || group.id === classFilterId), students: day.students.filter(pupil => classFilterId === 'all' || pupil.class_id === classFilterId), attendance: day.attendance.filter(row => classFilterId === 'all' || row.class_id === classFilterId), date: record.date, formattedDate: format(new Date(record.date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) });
    } catch (error) { if (isReportScopeCurrent(scope)) await reportEbdWriteError(error, 'Não foi possível gerar o PDF.'); }
  };

  const periodLabel = `${period === '4weeks' ? 'Últimas 4 semanas' : period === '3months' ? 'Últimos 3 meses' : 'Todo o período'} · ${filterClassName}`;

  const handleDownloadPeriodPDF = async () => {
    const scope = sessionScope;
    if (filteredDayRecords.length === 0) {
      toast.error('Nenhuma chamada registrada neste período.');
      return;
    }
    try {
      const snapshotVersion = historySnapshotVersion;
      assertEbdSnapshotCurrent(snapshotVersion);
      const days = filteredDayRecords.map(r => ({
        date: r.date,
        present: r.presentStudents,
        total: r.totalStudents,
        percentage: r.totalStudents > 0 ? Math.round((r.presentStudents / r.totalStudents) * 100) : 0,
        visitorCount: r.visitorCount,
      }));
      const classAgg = new Map<string, { name: string; totalPresent: number; pctSum: number; count: number }>();
      filteredDayRecords.forEach(r => {
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
      generateEbdPeriodPDF({ snapshotVersion, periodLabel, days, classes: classes2 });
      toast.success('Relatório gerado com sucesso!');
    } catch (e) {
      if (!isReportScopeCurrent(scope)) return;
      if (e instanceof EbdSnapshotChangedError) { await fetchHistory(); if (!isReportScopeCurrent(scope)) return; toast.error('Os dados mudaram. Confira a atualização e tente gerar o relatório novamente.'); return; }
      const errorId = await reportClientError('EBD:relatorio-periodo', e, {
        period,
        periodLabel,
        diasNoPeriodo: filteredDayRecords.length,
      });
      toast.error('Não foi possível gerar o relatório.', {
        description: `Tente novamente. Se o erro persistir, informe o código ${errorId}.`,
        duration: 8000,
      });
    }
  };

  const handleDownloadQuarterlyPDF = async () => {
    const scope = sessionScope;
    if (filteredDayRecords.length === 0) {
      toast.error('Nenhuma chamada registrada neste período.');
      return;
    }
    setGeneratingQuarterly(true);
    try {
      const snapshotVersion = historySnapshotVersion;
      assertEbdSnapshotCurrent(snapshotVersion);
      const sundayDates = filteredDayRecords.map(r => r.date);

      // Fetch visitor data for the period
      const minDate = [...sundayDates].sort()[0];
      const [entriesResult, countsResult] = await Promise.all([
        supabase.from('ebd_class_visitor_entries').select('class_id, date, name').gte('date', minDate),
        supabase.from('ebd_class_visitors').select('class_id, date, visitor_count').gte('date', minDate),
      ]);

      if (!isReportScopeCurrent(scope)) return;
      if (entriesResult.error) throw entriesResult.error;
      if (countsResult.error) throw countsResult.error;
      const visitorEntries = entriesResult.data, visitorCounts = countsResult.data;
      const entriesInPeriod = (visitorEntries || []).filter(v => sundayDates.includes(v.date));
      const countsInPeriod = (visitorCounts || []).filter(v => sundayDates.includes(v.date));

      // General per-Sunday rows
      const days = filteredDayRecords.map(r => ({
        date: r.date,
        present: r.presentStudents,
        total: r.totalStudents,
        percentage: r.totalStudents > 0 ? Math.round((r.presentStudents / r.totalStudents) * 100) : 0,
        visitorCount: r.visitorCount,
      }));

      const reportClasses = new Map<string, string>();
      filteredDayRecords.forEach(day => day.classSummary.forEach(group => reportClasses.set(group.classId, group.className)));
      const classesDetail = [...reportClasses].map(([classId, className]) => {
        const classDays = filteredDayRecords.flatMap(record => {
          const summary = record.classSummary.find(group => group.classId === classId);
          if (!summary) return [];
          const names = record.isClosed ? (summary.visitors || []).flatMap(visitor => visitor.name ? [visitor.name] : [])
            : entriesInPeriod.filter(visitor => visitor.class_id === classId && visitor.date === record.date && visitor.name).map(visitor => visitor.name as string);
          const countRow = countsInPeriod.find(visitor => visitor.class_id === classId && visitor.date === record.date);
          const visitorCount = record.isClosed ? summary.visitor_count ?? 0 : Math.max(summary.visitor_count ?? 0, countRow?.visitor_count ?? 0, names.length);
          return [{ date: record.date, present: summary.present, total: summary.total,
            percentage: summary.percentage, visitorCount, visitorNames: names }];
        });
        return {
          name: className,
          totalPresent: classDays.reduce((sum, day) => sum + day.present, 0),
          avgPercentage: classDays.length ? Math.round(classDays.reduce((sum, day) => sum + day.percentage, 0) / classDays.length) : 0,
          totalVisitors: classDays.reduce((sum, day) => sum + day.visitorCount, 0),
          days: classDays,
          students: historyStudentStats(historyStudents, allAttendance, filteredDayRecords, classId),
        };
      });

      generateEbdQuarterlyPDF({ snapshotVersion, periodLabel, days, classesDetail });
      toast.success('Relatório trimestral gerado com sucesso!');
    } catch (e) {
      if (!isReportScopeCurrent(scope)) return;
      if (e instanceof EbdSnapshotChangedError) { await fetchHistory(); if (!isReportScopeCurrent(scope)) return; toast.error('Os dados mudaram. Confira a atualização e tente gerar o relatório novamente.'); return; }
      const errorId = await reportClientError('EBD:relatorio-trimestral', e, {
        period,
        periodLabel,
        diasNoPeriodo: filteredDayRecords.length,
      });
      toast.error('Não foi possível gerar o relatório trimestral.', {
        description: `Tente novamente. Se o erro persistir, informe o código ${errorId}.`,
        duration: 8000,
      });
    } finally {
      if (reportScope.current.active) setGeneratingQuarterly(false);
    }
  };

  const handleDayAction = async (record: DayRecord) => {
    if (closingDay || accessLevel !== 'admin') return;
    setClosingDay(true);
    try {
      if (confirmAction === 'reopen' && record.closureId) {
        await reopenEbdDay(record.date, record.closureId);
        setEditingDate(record.date);
        toast.success('Dia reaberto. As presenças foram mantidas.');
      } else if (confirmAction === 'close') {
        await closeEbdDay(record.date);
        toast.success('Dia fechado com as presenças atualizadas.');
      }
      setConfirmAction(null);
      await fetchHistory();
      await onRefreshParent?.();
    } catch (error) { await reportEbdWriteError(error, 'Não foi possível atualizar o dia.'); await fetchHistory(); }
    finally { setClosingDay(false); }
  };

  const { barData, metrics, perfectStudents, absentStudents, lowFreqStudents } = useMemo(() => {
    const summaries = new Map<string, { classId: string; name: string; total: number; count: number }>();
    filteredDayRecords.forEach(day => day.classSummary.forEach(group => {
      const current = summaries.get(group.classId) || { classId: group.classId, name: group.className, total: 0, count: 0 };
      current.total += group.percentage; current.count++;
      summaries.set(group.classId, current);
    }));
    const barData = [...summaries.values()].map(group => ({ classId: group.classId, name: group.name, media: Math.round(group.total / group.count) })).sort((a, b) => b.media - a.media);
    const presencesPerDay = filteredDayRecords.map(day => ({ date: day.date, presenca: day.totalStudents ? Math.round(day.presentStudents / day.totalStudents * 100) : 0 }));
    const best = presencesPerDay.length ? presencesPerDay.reduce((a, b) => a.presenca > b.presenca ? a : b) : null;
    const worst = presencesPerDay.length ? presencesPerDay.reduce((a, b) => a.presenca < b.presenca ? a : b) : null;
    return {
      barData,
      metrics: {
        best: best ? { date: format(new Date(best.date + 'T12:00:00'), 'dd/MM', { locale: ptBR }), presenca: best.presenca } : null,
        worst: worst ? { date: format(new Date(worst.date + 'T12:00:00'), 'dd/MM', { locale: ptBR }), presenca: worst.presenca } : null,
        bestClass: barData[0] || null,
        totalSundays: filteredDayRecords.filter(day => new Date(day.date + 'T12:00:00').getDay() === 0).length,
        avgAll: presencesPerDay.length ? Math.round(presencesPerDay.reduce((sum, day) => sum + day.presenca, 0) / presencesPerDay.length) : 0,
      },
      perfectStudents: historyStats.filter(student => student.present === student.total && student.total > 0),
      absentStudents: historyStats.filter(student => student.present === 0),
      lowFreqStudents: historyStats.filter(student => student.present > 0 && student.present / student.total < 0.3),
    };
  }, [filteredDayRecords, historyStats]);

  const studentStats = useMemo(() => selectedClassId ? historyStudentStats(historyStudents, allAttendance, filteredDayRecords, selectedClassId) : [], [selectedClassId, historyStudents, allAttendance, filteredDayRecords]);
  const selectedClass = classOptions.find(group => group.id === selectedClassId);

  const filterControls = <div className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2">
    <div className="space-y-2"><Label htmlFor="history-period">Período</Label>
      <select id="history-period" value={period} disabled={Boolean(selectedDate)} onChange={event => { setLoading(true); setPeriod(event.target.value as PeriodFilter); }} className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-base">
        <option value="4weeks">Últimas 4 semanas</option><option value="3months">Últimos 3 meses</option><option value="all">Todo o período</option>
      </select>
    </div>
    <div className="space-y-2"><Label htmlFor="history-class">Turma</Label>
      <select id="history-class" value={classFilterId} disabled={Boolean(selectedDate)} onChange={event => setClassFilterId(event.target.value)} className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-base">
        <option value="all">Todas as turmas</option>{classOptions.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
      </select>
    </div>
    <p className="text-sm text-muted-foreground sm:col-span-2">{selectedDate ? 'Filtros desta consulta. Volte ao histórico para alterá-los.' : 'Os indicadores e relatórios seguem o período e a turma selecionados.'}</p>
  </div>;

  if (loading) {
    return <div className="space-y-4">{filterControls}<p role="status" className="py-12 text-center text-muted-foreground">Carregando histórico…</p></div>;
  }

  if (editingDate && accessLevel === 'admin') return <div className="space-y-4"><div className="rounded-xl border border-warning/40 bg-warning/10 p-4"><p className="font-semibold">Edição administrativa · {format(new Date(editingDate + 'T12:00:00'), 'dd/MM/yyyy')}</p><p className="text-sm">Você está corrigindo a chamada desta data. Confira o dia antes de registrar alterações.</p></div><HistoricalChamada key={`${sessionScope}:${editingDate}`} sessionScope={sessionScope} date={editingDate} onBack={() => { setEditingDate(null); void fetchHistory(); void onRefreshParent?.(); }} /></div>;

  // ─── DETAIL VIEW (full-screen) ───
  if (selectedDay) {
    const pct = selectedDay.totalStudents > 0 ? Math.round((selectedDay.presentStudents / selectedDay.totalStudents) * 100) : 0;
    const dateFormatted = format(new Date(selectedDay.date + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    // Refresh from latest dayRecords
    const freshRecord = filteredDayRecords.find(d => d.date === selectedDay.date) || selectedDay;

    return (
      <div className="mx-auto max-w-[1120px] space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
        {historyError && <div role="alert" className="rounded-xl border border-destructive/40 p-4 space-y-2"><p className="text-sm text-destructive">Não foi possível atualizar o histórico. Os dados exibidos podem estar desatualizados.</p><Button variant="outline" onClick={() => void fetchHistory()}>Tentar novamente</Button></div>}
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)} className="text-xs -ml-2 scroll-mt-24">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar ao histórico
        </Button>

        {filterControls}
        {/* Date header */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Consulta do histórico · {filterClassName}</p>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold first-letter:uppercase">{dateFormatted}</h2>
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

        <AlertDialog open={!!confirmAction} onOpenChange={open => { if (!open && !closingDay) setConfirmAction(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmAction === 'reopen' ? 'Reabrir' : 'Fechar'} dia {format(new Date(freshRecord.date + 'T12:00:00'), 'dd/MM/yyyy')}?</AlertDialogTitle>
              <AlertDialogDescription>{confirmAction === 'reopen' ? 'As presenças serão mantidas. Você poderá corrigir todas as turmas e fechar o dia novamente.' : 'O resumo será calculado com as presenças salvas. Para corrigir depois, será necessário reabrir o dia.'}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={closingDay}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={closingDay} onClick={event => { event.preventDefault(); void handleDayAction(freshRecord); }}>{closingDay ? 'Aguarde…' : confirmAction === 'reopen' ? 'Reabrir dia' : 'Fechar dia'}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Stats card */}
        <Card data-ebd-card>
          <CardContent data-ebd-content className="pt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Presença · {filterClassName}</p>
                <p className="text-2xl font-bold">
                  {freshRecord.presentStudents}
                  <span className="text-lg font-normal text-muted-foreground">/{freshRecord.totalStudents}</span>
                </p>
              </div>
              <div className="h-14 min-w-14 px-2 rounded-xl bg-primary/10 flex items-center justify-center">
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
          <Card data-ebd-card>
            <CardContent data-ebd-content className="pt-4 pb-4">
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
          <Card data-ebd-card>
            <CardHeader data-ebd-card-header className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Presença por turma
              </CardTitle>
            </CardHeader>
            <CardContent data-ebd-content className="space-y-3">
              {[...freshRecord.classSummary].sort((a, b) => b.percentage - a.percentage).map((cs, i) => (
                <div key={cs.classId || i} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium">{cs.className}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{cs.present}/{cs.total}</span>
                      <span className={`text-sm font-bold ${getPercentColor(cs.percentage)}`}>{cs.percentage}%</span>
                    </div>
                  </div>
                  <Progress value={cs.percentage} className="h-1.5" />
                  {(cs.visitor_count ?? 0) > 0 && (
                    <div className="pt-0.5 space-y-0.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> {cs.visitor_count} visitante{(cs.visitor_count ?? 0) > 1 ? 's' : ''}
                      </p>
                      {cs.visitors && cs.visitors.length > 0 && (
                        <p className="text-xs text-muted-foreground pl-4">
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

        <section className="space-y-3 rounded-xl border p-4">
          <h3 className="font-semibold">Exportar consulta</h3>
          <p className="text-sm text-muted-foreground">PDF da chamada confirmada de {format(new Date(freshRecord.date + 'T12:00:00'), 'dd/MM/yyyy')} · {filterClassName}</p>
        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={historyError} onClick={() => handleDownloadPDF(freshRecord)}>
            <Download className="h-4 w-4 mr-2" /> Baixar PDF
          </Button>
        </div>
        </section>
        {accessLevel === 'admin' && <section className="rounded-xl border p-4 space-y-3"><h3 className="font-semibold">Edição administrativa</h3><p className="text-sm text-muted-foreground">As ações abaixo se aplicam ao dia inteiro, incluindo todas as turmas.</p>
        {accessLevel === 'admin' && <Button className="w-full min-h-11" disabled={closingDay || historyError} onClick={() => freshRecord.isClosed ? setConfirmAction('reopen') : setEditingDate(freshRecord.date)}>
          {freshRecord.isClosed ? <LockOpen className="h-4 w-4 mr-2" /> : <Pencil className="h-4 w-4 mr-2" />}
          {freshRecord.isClosed ? 'Reabrir para corrigir' : 'Editar chamadas'}
        </Button>}
          {!freshRecord.isClosed && (
            <Button
              className="flex-1"
              disabled={closingDay || historyError}
              onClick={() => setConfirmAction('close')}
            >
              <Lock className="h-4 w-4 mr-2" /> {closingDay ? 'Fechando...' : 'Fechar dia'}
            </Button>
          )}
        </section>}
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="mx-auto max-w-[1120px] space-y-4">
      {selectedDate && <Button variant="outline" onClick={() => setSelectedDay(null)}><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao histórico</Button>}
      {historyError && <div role="alert" className="rounded-xl border border-destructive/40 p-4 space-y-2"><p className="text-sm text-destructive">Não foi possível atualizar o histórico. Os dados exibidos podem estar desatualizados.</p><Button variant="outline" onClick={() => void fetchHistory()}>Tentar novamente</Button></div>}
      {filterControls}
      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="text-lg font-semibold">Exportar relatórios</h2>
        <p className="text-sm text-muted-foreground">{periodLabel}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button variant="outline" onClick={handleDownloadPeriodPDF} disabled={historyError || filteredDayRecords.length === 0}><Download className="mr-2 h-4 w-4" />Resumo do período</Button>
          <Button variant="outline" onClick={handleDownloadQuarterlyPDF} disabled={historyError || filteredDayRecords.length === 0 || generatingQuarterly}><Download className="mr-2 h-4 w-4" />{generatingQuarterly ? 'Gerando…' : 'Relatório completo'}</Button>
        </div>
      </section>
      <h2 className="text-lg font-semibold">Consultar encontros</h2>
      {/* Compact day cards */}
      {filteredDayRecords.length > 0 && (
        <div className="space-y-2">
          {filteredDayRecords.map(record => {
            const pct = record.totalStudents > 0 ? Math.round((record.presentStudents / record.totalStudents) * 100) : 0;
            const dateObj = new Date(record.date + 'T12:00:00');
            const dayName = format(dateObj, 'EEEE', { locale: ptBR });
            const dayNum = format(dateObj, 'dd');
            const monthName = format(dateObj, 'MMM', { locale: ptBR });

            return (
              <Card data-ebd-card
                key={record.date}
                className="cursor-pointer hover:bg-accent/30 transition-colors active:scale-[0.99]"
                role="button"
                tabIndex={0}
                aria-label={`Ver encontro de ${format(dateObj, "dd/MM/yyyy")}`}
                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedDay(record); } }}
                onClick={() => setSelectedDay(record)}
              >
                <CardContent data-ebd-content className="min-h-16 py-3 px-4 flex items-center gap-3">
                  {/* Date block */}
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary leading-none">{dayNum}</span>
                    <span className="text-xs text-primary/70 uppercase">{monthName}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize min-w-0 whitespace-normal break-words">{dayName} · {format(dateObj, 'dd/MM/yyyy')}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {record.isClosed ? (
                        <Badge variant="outline" className="text-xs px-2 py-1 border-green-500/40 text-green-700 bg-green-500/10">
                          Fechado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs px-2 py-1 border-blue-500/40 text-blue-700 bg-blue-500/10">
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
      <Card data-ebd-card className="border-primary/20 bg-primary/5">
        <CardHeader data-ebd-card-header className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Resumo do período
          </CardTitle>
        </CardHeader>
        <CardContent data-ebd-content className="space-y-4">
          <div className="ebd-stat-grid text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{metrics.totalSundays}</p>
              <p className="text-xs text-muted-foreground leading-tight">Domingos registrados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{totalMembers}</p>
              <p className="text-xs text-muted-foreground leading-tight">Alunos no histórico</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{metrics.avgAll}%</p>
              <p className="text-xs text-muted-foreground leading-tight">Média geral</p>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Melhor domingo</p>
              {metrics.best ? (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-sm font-bold text-green-600">{metrics.best.presenca}%</span>
                  <span className="text-xs text-muted-foreground">{metrics.best.date}</span>
                </div>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pior domingo</p>
              {metrics.worst ? (
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-sm font-bold text-red-500">{metrics.worst.presenca}%</span>
                  <span className="text-xs text-muted-foreground">{metrics.worst.date}</span>
                </div>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </div>
          </div>

          {metrics.bestClass && (
            <>
              <div className="h-px bg-border" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Melhor turma</p>
                  <p className="text-sm font-medium">{metrics.bestClass.name}</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-sm font-bold">{metrics.bestClass.media}%</Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Clickable student highlight cards */}
      <div className="ebd-stat-grid">
        {/* 100% Presença */}
        <button
          onClick={() => perfectStudents.length > 0 && setOpenDialog('perfect')}
          disabled={perfectStudents.length === 0}
          className="rounded-xl border bg-card p-3 text-left hover:bg-accent/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          <Award className="h-5 w-5 text-yellow-500 mb-1.5" />
          <p className="text-2xl font-bold text-green-600">{perfectStudents.length}</p>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">100% presença</p>
        </button>

        {/* Frequência Baixa */}
        <button
          onClick={() => lowFreqStudents.length > 0 && setOpenDialog('lowFreq')}
          disabled={lowFreqStudents.length === 0}
          className="rounded-xl border bg-card p-3 text-left hover:bg-accent/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          <TrendingDown className="h-5 w-5 text-yellow-500 mb-1.5" />
          <p className="text-2xl font-bold text-yellow-600">{lowFreqStudents.length}</p>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">Freq. baixa &lt;30%</p>
        </button>

        {/* Nunca compareceram */}
        <button
          onClick={() => absentStudents.length > 0 && setOpenDialog('absent')}
          disabled={absentStudents.length === 0}
          className="rounded-xl border bg-card p-3 text-left hover:bg-accent/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          <AlertTriangle className="h-5 w-5 text-red-500 mb-1.5" />
          <p className="text-2xl font-bold text-red-600">{absentStudents.length}</p>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">Sem presença no período</p>
        </button>
      </div>

      <ResponsiveDialog open={openDialog !== null} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <ResponsiveDialogContent size="standard">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {openDialog === 'perfect' && 'Alunos com 100% de presença'}
              {openDialog === 'lowFreq' && 'Alunos com frequência baixa (<30%)'}
              {openDialog === 'absent' && 'Alunos sem presença no período'}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <ScrollArea className="h-[min(60dvh,30rem)] pr-1">
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
        <ResponsiveDialogContent size="form">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alunos da turma: {selectedClass?.name}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <ScrollArea className="h-[min(60dvh,30rem)] pr-1">
            <div className="space-y-3 py-2">
              {studentStats.length > 0 ? (
                studentStats.map((student) => {
                  const bgColor = student.percentage >= 70 ? 'bg-green-500/10 border-green-500/30' : student.percentage >= 40 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30';
                  const textColor = student.percentage >= 70 ? 'text-green-600' : student.percentage >= 40 ? 'text-yellow-600' : 'text-red-600';
                  
                  return (
                    <div key={student.id} className={`rounded-lg border p-3 ${bgColor}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-medium">{student.name}</span>
                        <span className={`text-lg font-bold ${textColor}`}>{student.percentage}%</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mb-1">
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
          <div className="ebd-stat-grid">
            {barData.map((cls) => {
              const bgColor = cls.media >= 70 ? 'bg-green-500/10 border-green-500/30' : cls.media >= 40 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30';
              const textColor = cls.media >= 70 ? 'text-green-600' : cls.media >= 40 ? 'text-yellow-600' : 'text-red-600';
              return (
                <button
                  key={cls.classId}
                  onClick={() => setSelectedClassId(cls.classId)}
                  className={`rounded-xl border p-4 text-left hover:bg-accent/40 transition-all active:scale-[0.97] ${bgColor}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <Users className={`h-4 w-4 ${textColor}`} />
                    <span className={`text-2xl font-bold ${textColor}`}>{cls.media}%</span>
                  </div>
                  <p className="text-sm font-medium min-w-0 whitespace-normal break-words">{cls.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">média de presença</p>
                </button>
              );
            })}
          </div>
        </div>
      )}




      {!historyError && filteredDayRecords.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhum registro de presença encontrado para este período.</p>
      )}
    </div>
  );
}
