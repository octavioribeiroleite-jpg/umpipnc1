import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PastorLayout } from '@/components/pastor/PastorLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Globe, CalendarIcon, RefreshCw, Loader2, Users, UserCheck, Eye, Church } from 'lucide-react';
import { format, isSameDay, startOfDay, subDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PortalVisitor {
  id: string;
  full_name: string;
  society_id: string | null;
  is_visitor: boolean;
  device_id: string;
  created_at: string;
  last_access: string;
}

interface SocietyInfo {
  id: string;
  name: string;
  color: string;
}

interface RecurringVisitor {
  fullName: string;
  deviceId: string;
  isVisitor: boolean;
  societyId: string | null;
  visitCount: number;
  firstVisit: string;
  lastVisit: string;
}

export default function Visitantes() {
  const { isAdmin, isPastor, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [visitors, setVisitors] = useState<PortalVisitor[]>([]);
  const [societies, setSocieties] = useState<Record<string, SocietyInfo>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const canAccess = isAdmin || isPastor;

  useEffect(() => {
    if (!authLoading && !canAccess) {
      navigate('/');
    }
  }, [authLoading, canAccess, navigate]);

  useEffect(() => {
    if (canAccess) fetchData();
  }, [canAccess]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const [visitorsRes, socRes] = await Promise.all([
        supabase.from('portal_visitors' as any).select('*').order('created_at', { ascending: false }).limit(1000),
        supabase.from('societies').select('id, name, color').eq('active', true),
      ]);
      if (visitorsRes.data) setVisitors(visitorsRes.data as any[]);
      if (socRes.data) {
        const map: Record<string, SocietyInfo> = {};
        (socRes.data as SocietyInfo[]).forEach(s => (map[s.id] = s));
        setSocieties(map);
      }
    } catch (e) {
      console.error('Error fetching visitors:', e);
    } finally {
      setDataLoading(false);
    }
  };

  // Visitors for the selected day
  const dayVisitors = useMemo(() => {
    return visitors.filter(v => isSameDay(new Date(v.created_at), selectedDate));
  }, [visitors, selectedDate]);

  // Device first-seen map (across all data)
  const deviceFirstSeen = useMemo(() => {
    const map = new Map<string, string>();
    for (let i = visitors.length - 1; i >= 0; i--) {
      const v = visitors[i];
      if (!map.has(v.device_id)) map.set(v.device_id, v.id);
    }
    return map;
  }, [visitors]);

  // Recurring visitors (global)
  const recurringVisitors = useMemo<RecurringVisitor[]>(() => {
    const groups = new Map<string, { fullName: string; deviceId: string; isVisitor: boolean; societyId: string | null; dates: string[] }>();
    visitors.forEach(v => {
      const key = `${v.full_name}|${v.device_id}`;
      if (!groups.has(key)) {
        groups.set(key, { fullName: v.full_name, deviceId: v.device_id, isVisitor: v.is_visitor, societyId: v.society_id, dates: [] });
      }
      groups.get(key)!.dates.push(v.created_at);
    });
    return Array.from(groups.values())
      .filter(g => g.dates.length >= 2)
      .map(g => ({
        fullName: g.fullName, deviceId: g.deviceId, isVisitor: g.isVisitor, societyId: g.societyId,
        visitCount: g.dates.length, firstVisit: g.dates[g.dates.length - 1], lastVisit: g.dates[0],
      }))
      .sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
  }, [visitors]);

  // Day stats
  const dayStats = useMemo(() => {
    const total = dayVisitors.length;
    const visitorsCount = dayVisitors.filter(v => v.is_visitor).length;
    return { total, members: total - visitorsCount, visitors: visitorsCount };
  }, [dayVisitors]);

  // Sunday stats (last 8 Sundays)
  const sundayStats = useMemo(() => {
    const sundays: { date: Date; total: number; members: number; visitors: number }[] = [];
    const today = new Date();
    // Find last Sunday (or today if Sunday)
    const dayOfWeek = getDay(today); // 0 = Sunday
    let lastSunday = startOfDay(subDays(today, dayOfWeek === 0 ? 0 : dayOfWeek));
    for (let i = 0; i < 8; i++) {
      const sundayDate = subDays(lastSunday, i * 7);
      const dayVis = visitors.filter(v => isSameDay(new Date(v.created_at), sundayDate));
      const visitorsCount = dayVis.filter(v => v.is_visitor).length;
      sundays.push({
        date: sundayDate,
        total: dayVis.length,
        members: dayVis.length - visitorsCount,
        visitors: visitorsCount,
      });
    }
    return sundays;
  }, [visitors]);

  if (authLoading) return null;
  if (!canAccess) return null;

  const Layout = isPastor && !isAdmin ? PastorLayout : AppLayout;

  const content = (
    <>
      <PageHeader
        title="Visitantes"
        description="Relatório de acessos ao portal público"
        action={
          <Button variant="outline" size="sm" onClick={fetchData} disabled={dataLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', dataLoading && 'animate-spin')} />
            Atualizar
          </Button>
        }
      />

      {/* Sunday summary */}
      {!dataLoading && sundayStats.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Church className="h-4 w-4 text-muted-foreground" />
              Resumo dos Domingos
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sundayStats.map((s, i) => {
                const isSelected = isSameDay(selectedDate, s.date);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(s.date)}
                    className={cn(
                      'flex-shrink-0 rounded-lg border p-3 text-center min-w-[90px] transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-muted'
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(s.date, 'dd/MM')}
                    </p>
                    <p className={cn('text-xl font-bold', isSelected ? 'text-primary' : '')}>
                      {s.total}
                    </p>
                    <p className="text-[10px] text-muted-foreground">acessos</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.members}m · {s.visitors}v
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              initialFocus
              className="p-3 pointer-events-auto"
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        {!isSameDay(selectedDate, new Date()) && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
            Hoje
          </Button>
        )}
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Day summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{dayStats.total}</p>
                <p className="text-xs text-muted-foreground">Total de acessos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{dayStats.members}</p>
                <p className="text-xs text-muted-foreground">Membros</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{dayStats.visitors}</p>
                <p className="text-xs text-muted-foreground">Visitantes</p>
              </CardContent>
            </Card>
          </div>

          {/* Day access table */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-muted-foreground" />
                Acessos do dia ({dayVisitors.length})
              </h3>
              {dayVisitors.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">
                  Nenhum acesso neste dia.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Sociedade</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayVisitors.map(v => {
                      const isFirstAccess = deviceFirstSeen.get(v.device_id) === v.id;
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.full_name}</TableCell>
                          <TableCell>
                            {v.is_visitor ? (
                              <Badge variant="outline" className="text-[10px]">Visitante</Badge>
                            ) : v.society_id && societies[v.society_id] ? (
                              <Badge variant="outline" className="text-[10px]"
                                style={{ borderColor: societies[v.society_id].color, color: societies[v.society_id].color }}>
                                {societies[v.society_id].name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {format(new Date(v.created_at), 'HH:mm')}
                          </TableCell>
                          <TableCell>
                            {isFirstAccess ? (
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Novo</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Retornou</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recurring visitors (global) */}
          {recurringVisitors.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  Visitantes recorrentes ({recurringVisitors.length})
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {recurringVisitors.slice(0, 20).map((rv, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{rv.fullName}</span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {rv.visitCount} visitas
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {rv.isVisitor ? (
                          <Badge variant="outline" className="text-[10px]">Visitante</Badge>
                        ) : rv.societyId && societies[rv.societyId] ? (
                          <Badge variant="outline" className="text-[10px]"
                            style={{ borderColor: societies[rv.societyId].color, color: societies[rv.societyId].color }}>
                            {societies[rv.societyId].name}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Primeira: {format(new Date(rv.firstVisit), 'dd/MM/yyyy')} · Última: {format(new Date(rv.lastVisit), 'dd/MM/yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );

  return <Layout>{content}</Layout>;
}
