import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Award, AlertTriangle, Calendar } from 'lucide-react';
import { format, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

type PeriodFilter = '4weeks' | '3months' | 'all';

interface HistoricoTabProps {
  classes: EbdClass[];
  students: EbdStudent[];
}

export default function HistoricoTab({ classes, students }: HistoricoTabProps) {
  const [period, setPeriod] = useState<PeriodFilter>('4weeks');
  const [allAttendance, setAllAttendance] = useState<{ student_id: string; class_id: string; date: string; present: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      let query = supabase.from('ebd_attendance').select('student_id, class_id, date, present');

      if (period === '4weeks') {
        query = query.gte('date', format(subWeeks(new Date(), 4), 'yyyy-MM-dd'));
      } else if (period === '3months') {
        query = query.gte('date', format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
      }

      const { data } = await query.order('date', { ascending: true });
      setAllAttendance(data || []);
      setLoading(false);
    };
    fetchHistory();
  }, [period]);

  const { lineData, barData, tableData, metrics, perfectStudents, absentStudents } = useMemo(() => {
    // Group by date
    const byDate = new Map<string, { present: number; total: number }>();
    const dates = [...new Set(allAttendance.map(a => a.date))].sort();

    dates.forEach(date => {
      const dayRecords = allAttendance.filter(a => a.date === date);
      const present = dayRecords.filter(a => a.present).length;
      // total students who had any record that day
      const total = dayRecords.length;
      byDate.set(date, { present, total });
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

    // Bar data: average per class
    const barData = classes.map(cls => {
      const classRecords = allAttendance.filter(a => a.class_id === cls.id);
      const classDates = [...new Set(classRecords.map(a => a.date))];
      let avgPct = 0;
      if (classDates.length > 0) {
        const total = classDates.reduce((sum, date) => {
          const dayRecords = classRecords.filter(a => a.date === date);
          const present = dayRecords.filter(a => a.present).length;
          return sum + (dayRecords.length > 0 ? (present / dayRecords.length) * 100 : 0);
        }, 0);
        avgPct = Math.round(total / classDates.length);
      }
      return { name: cls.name, media: avgPct };
    }).sort((a, b) => b.media - a.media);

    // Table data
    const tableData = dates.map(date => {
      const d = byDate.get(date)!;
      return {
        date,
        formatted: format(new Date(date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }),
        present: d.present,
        total: d.total,
        pct: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
      };
    }).reverse();

    // Metrics
    const last4 = lineData.slice(-4);
    const avgLast4 = last4.length > 0 ? Math.round(last4.reduce((s, d) => s + d.presenca, 0) / last4.length) : 0;
    const best = lineData.length > 0 ? lineData.reduce((a, b) => a.presenca > b.presenca ? a : b) : null;
    const worst = lineData.length > 0 ? lineData.reduce((a, b) => a.presenca < b.presenca ? a : b) : null;
    const bestClass = barData.length > 0 ? barData[0] : null;
    const worstClass = barData.length > 0 ? barData[barData.length - 1] : null;

    // Perfect and absent students
    const studentDates = new Map<string, { present: number; total: number }>();
    allAttendance.forEach(a => {
      const key = a.student_id;
      if (!studentDates.has(key)) studentDates.set(key, { present: 0, total: 0 });
      const s = studentDates.get(key)!;
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

    return {
      lineData,
      barData,
      tableData,
      metrics: { avgLast4, best, worst, bestClass, worstClass },
      perfectStudents,
      absentStudents,
    };
  }, [allAttendance, classes, students]);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando histórico...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-2">
        {[
          { key: '4weeks' as PeriodFilter, label: '4 semanas' },
          { key: '3months' as PeriodFilter, label: '3 meses' },
          { key: 'all' as PeriodFilter, label: 'Todo período' },
        ].map(p => (
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

      {/* Line chart - attendance evolution */}
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

      {/* Bar chart - class comparison */}
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

      {/* Summary table */}
      {tableData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resumo por domingo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-center">Presentes</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map(row => (
                  <TableRow key={row.date}>
                    <TableCell className="text-sm">{row.formatted}</TableCell>
                    <TableCell className="text-center">{row.present}</TableCell>
                    <TableCell className="text-center">{row.total}</TableCell>
                    <TableCell className="text-right font-semibold">{row.pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Highlights: perfect attendance */}
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

      {/* Alerts: 0% attendance */}
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

      {allAttendance.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhum registro de presença encontrado para este período.</p>
      )}
    </div>
  );
}
