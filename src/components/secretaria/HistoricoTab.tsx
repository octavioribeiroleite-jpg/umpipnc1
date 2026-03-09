import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Award, AlertTriangle, Calendar, Lock, Download, Users, ChevronDown, ChevronUp, CircleDot } from 'lucide-react';
import { format, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateEbdAttendancePDF } from '@/utils/generateEbdPDF';

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
}

interface DayRecord {
  date: string;
  isClosed: boolean;
  closureId?: string;
  closedBy?: string;
  totalStudents: number;
  presentStudents: number;
  classSummary: ClassSummaryItem[];
}

type PeriodFilter = '4weeks' | '3months' | 'all';

interface HistoricoTabProps {
  classes: EbdClass[];
  students: EbdStudent[];
}

export default function HistoricoTab({ classes, students }: HistoricoTabProps) {
  const [period, setPeriod] = useState<PeriodFilter>('4weeks');
  const [allAttendance, setAllAttendance] = useState<{ student_id: string; class_id: string; date: string; present: boolean }[]>([]);
  const [closures, setClosures] = useState<{ id: string; date: string; closed_by: string; total_students: number; present_students: number; class_summary: ClassSummaryItem[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      let attendanceQuery = supabase.from('ebd_attendance').select('student_id, class_id, date, present');
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
    fetchHistory();
  }, [period]);

  // Build unified day records from attendance + closures
  const dayRecords = useMemo<DayRecord[]>(() => {
    const closureMap = new Map(closures.map(c => [c.date, c]));
    const dates = [...new Set(allAttendance.map(a => a.date))].sort().reverse();

    return dates.map(date => {
      const closure = closureMap.get(date);
      if (closure) {
        return {
          date,
          isClosed: true,
          closureId: closure.id,
          closedBy: closure.closed_by,
          totalStudents: closure.total_students,
          presentStudents: closure.present_students,
          classSummary: closure.class_summary,
        };
      }

      // Calculate from raw attendance
      const dayRecords = allAttendance.filter(a => a.date === date);
      const presentCount = dayRecords.filter(a => a.present).length;
      const totalCount = dayRecords.length;

      const classSummary: ClassSummaryItem[] = classes.map(cls => {
        const classRecords = dayRecords.filter(a => a.class_id === cls.id);
        const classPresent = classRecords.filter(a => a.present).length;
        const classTotal = classRecords.length;
        return {
          classId: cls.id,
          className: cls.name,
          total: classTotal,
          present: classPresent,
          percentage: classTotal > 0 ? Math.round((classPresent / classTotal) * 100) : 0,
        };
      }).filter(cs => cs.total > 0);

      return {
        date,
        isClosed: false,
        totalStudents: totalCount,
        presentStudents: presentCount,
        classSummary,
      };
    });
  }, [allAttendance, closures, classes]);

  const getPercentColor = (pct: number) => {
    if (pct > 70) return 'text-green-600';
    if (pct >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getColorClass = (pct: number) => {
    if (pct > 70) return 'border-green-500/30 bg-green-500/5';
    if (pct >= 40) return 'border-yellow-500/30 bg-yellow-500/5';
    return 'border-red-500/30 bg-red-500/5';
  };

  const handleDownloadPDF = async (record: DayRecord) => {
    const { data: dayAttendance } = await supabase
      .from('ebd_attendance')
      .select('*')
      .eq('date', record.date);

    if (dayAttendance) {
      const dateObj = new Date(record.date + 'T12:00:00');
      generateEbdAttendancePDF({
        classes,
        students,
        attendance: dayAttendance,
        date: record.date,
        formattedDate: format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
  };

  const { lineData, barData, metrics, perfectStudents, absentStudents } = useMemo(() => {
    const dates = [...new Set(allAttendance.map(a => a.date))].sort();
    const byDate = new Map<string, { present: number; total: number }>();

    dates.forEach(date => {
      const dayRecs = allAttendance.filter(a => a.date === date);
      const present = dayRecs.filter(a => a.present).length;
      byDate.set(date, { present, total: dayRecs.length });
    });

    const lineData = dates.map(date => {
      const d = byDate.get(date)!;
      return {
        date: format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        fullDate: date,
        presenca: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
        presentes: d.present,
        total: d.total,
      };
    });

    const barData = classes.map(cls => {
      const classRecords = allAttendance.filter(a => a.class_id === cls.id);
      const classDates = [...new Set(classRecords.map(a => a.date))];
      let avgPct = 0;
      if (classDates.length > 0) {
        const total = classDates.reduce((sum, date) => {
          const dayRecs = classRecords.filter(a => a.date === date);
          const present = dayRecs.filter(a => a.present).length;
          return sum + (dayRecs.length > 0 ? (present / dayRecs.length) * 100 : 0);
        }, 0);
        avgPct = Math.round(total / classDates.length);
      }
      return { name: cls.name, media: avgPct };
    }).sort((a, b) => b.media - a.media);

    const last4 = lineData.slice(-4);
    const avgLast4 = last4.length > 0 ? Math.round(last4.reduce((s, d) => s + d.presenca, 0) / last4.length) : 0;
    const best = lineData.length > 0 ? lineData.reduce((a, b) => a.presenca > b.presenca ? a : b) : null;
    const worst = lineData.length > 0 ? lineData.reduce((a, b) => a.presenca < b.presenca ? a : b) : null;
    const bestClass = barData.length > 0 ? barData[0] : null;

    const studentDates = new Map<string, { present: number; total: number }>();
    allAttendance.forEach(a => {
      if (!studentDates.has(a.student_id)) studentDates.set(a.student_id, { present: 0, total: 0 });
      const s = studentDates.get(a.student_id)!;
      s.total++;
      if (a.present) s.present++;
    });

    const totalDates = dates.length;
    const perfectStudents = students.filter(s => {
      const rec = studentDates.get(s.id);
      return rec && rec.present === totalDates && totalDates > 0;
    });

    const absentStudents = students.filter(s => {
      const rec = studentDates.get(s.id);
      return !rec || rec.present === 0;
    });

    return { lineData, barData, metrics: { avgLast4, best, worst, bestClass }, perfectStudents, absentStudents };
  }, [allAttendance, classes, students]);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando histórico...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-2">
        {([
          { key: '4weeks' as PeriodFilter, label: '4 semanas' },
          { key: '3months' as PeriodFilter, label: '3 meses' },
          { key: 'all' as PeriodFilter, label: 'Todo período' },
        ]).map(p => (
          <Button
            key={p.key}
            variant={period === p.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Day record cards */}
      {dayRecords.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" /> Chamadas registradas
          </h3>
          {dayRecords.map(record => {
            const pct = record.totalStudents > 0
              ? Math.round((record.presentStudents / record.totalStudents) * 100)
              : 0;
            const isExpanded = expandedDay === record.date;
            const dateFormatted = format(new Date(record.date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR });
            const yearFormatted = format(new Date(record.date + 'T12:00:00'), 'yyyy');

            return (
              <Card key={record.date} className={`${getColorClass(pct)} transition-all`}>
                <CardContent className="pt-4 pb-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm capitalize">{dateFormatted}</p>
                        {record.isClosed ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/40 text-green-700 bg-green-500/10">
                            <Lock className="h-2.5 w-2.5 mr-0.5" /> Fechado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/40 text-blue-700 bg-blue-500/10">
                            <CircleDot className="h-2.5 w-2.5 mr-0.5" /> Em aberto
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{yearFormatted}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${getPercentColor(pct)}`}>{pct}%</p>
                      <p className="text-xs text-muted-foreground">{record.presentStudents}/{record.totalStudents}</p>
                    </div>
                  </div>

                  <Progress value={pct} className="h-1.5" />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => setExpandedDay(isExpanded ? null : record.date)}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                      {isExpanded ? 'Menos detalhes' : 'Ver turmas'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleDownloadPDF(record)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> PDF
                    </Button>
                  </div>

                  {/* Expanded: class breakdown */}
                  {isExpanded && record.classSummary.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-border/50">
                      {[...record.classSummary].sort((a, b) => b.percentage - a.percentage).map((cs, i) => (
                        <div key={cs.classId || i} className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs flex-1 truncate">{cs.className}</span>
                          <span className="text-xs text-muted-foreground">{cs.present}/{cs.total}</span>
                          <span className={`text-xs font-semibold ${getPercentColor(cs.percentage)} min-w-[32px] text-right`}>
                            {cs.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Metrics cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Média últimos 4 domingos</p>
            <p className="text-2xl font-bold text-primary">{metrics.avgLast4}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Melhor domingo</p>
            {metrics.best ? (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-lg font-bold text-green-600">{metrics.best.presenca}%</span>
                <span className="text-xs text-muted-foreground ml-1">{metrics.best.date}</span>
              </div>
            ) : <span className="text-muted-foreground">—</span>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Pior domingo</p>
            {metrics.worst ? (
              <div className="flex items-center gap-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-lg font-bold text-red-600">{metrics.worst.presenca}%</span>
                <span className="text-xs text-muted-foreground ml-1">{metrics.worst.date}</span>
              </div>
            ) : <span className="text-muted-foreground">—</span>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Melhor turma</p>
            {metrics.bestClass ? (
              <div>
                <span className="text-lg font-bold text-primary">{metrics.bestClass.media}%</span>
                <p className="text-xs text-muted-foreground truncate">{metrics.bestClass.name}</p>
              </div>
            ) : <span className="text-muted-foreground">—</span>}
          </CardContent>
        </Card>
      </div>

      {/* Line chart */}
      {lineData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Evolução da presença
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [`${value}%`, 'Presença']}
                  />
                  <Line type="monotone" dataKey="presenca" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bar chart */}
      {barData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Comparativo entre turmas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [`${value}%`, 'Média']}
                  />
                  <Bar dataKey="media" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Perfect attendance */}
      {perfectStudents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" /> 100% de presença
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {perfectStudents.map(s => (
                <Badge key={s.id} className="bg-green-500/10 text-green-700 border-green-500/20">
                  {s.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 0% attendance */}
      {absentStudents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> 0% de presença (alerta)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {absentStudents.map(s => (
                <Badge key={s.id} variant="destructive" className="bg-red-500/10 text-red-700 border-red-500/20">
                  {s.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {allAttendance.length === 0 && dayRecords.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhum registro de presença encontrado para este período.</p>
      )}
    </div>
  );
}
