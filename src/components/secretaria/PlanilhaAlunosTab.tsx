import { useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Upload,
  Download,
  Pencil,
  Check,
  X,
  ArrowLeftRight,
  Power,
  PowerOff,
  Users,
  AlertTriangle,
  ChevronLeft,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface EbdClass {
  id: string;
  name: string;
  order_index: number;
}

interface EbdStudent {
  id: string;
  class_id: string;
  name: string;
  active: boolean;
  origin?: string | null;
  created_at?: string;
}

interface Props {
  classes: EbdClass[];
  allStudents: EbdStudent[];
  onRefresh: () => void;
  accessLevel: 'admin' | 'professor';
  professorClassId?: string;
}

type FilterStatus = 'todos' | 'ativos' | 'inativos';
type ImportStep = 0 | 1 | 2 | 3;

interface ImportRow {
  name: string;
  status: 'novo' | 'duplicata_provavel' | 'duplicata_certa';
  similarTo?: string;
  similarId?: string;
  action: 'adicionar' | 'ignorar' | 'substituir';
}

// ---- Helpers ----
function stringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter[i - 1] !== longer[j - 1]) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  return (longer.length - costs[longer.length]) / longer.length;
}

function parseCSV(text: string): string[][] {
  return text
    .replace(/\r/g, '')
    .trim()
    .split('\n')
    .map((line) =>
      line.split(/[,;|\t]/).map((cell) => cell.replace(/^"|"$/g, '').trim()),
    )
    .filter((row) => row.some((c) => c.length > 0));
}

export default function PlanilhaAlunosTab({
  classes,
  allStudents,
  onRefresh,
  accessLevel,
  professorClassId,
}: Props) {
  const visibleClasses = useMemo(
    () =>
      accessLevel === 'professor' && professorClassId
        ? classes.filter((c) => c.id === professorClassId)
        : classes,
    [classes, accessLevel, professorClassId],
  );

  const [selectedClassId, setSelectedClassId] = useState<string>(
    accessLevel === 'professor' && professorClassId
      ? professorClassId
      : (classes[0]?.id ?? ''),
  );
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [newName, setNewName] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [transferStudent, setTransferStudent] = useState<EbdStudent | null>(
    null,
  );
  const [transferTarget, setTransferTarget] = useState('');

  // Import wizard state
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>(0);
  const [importTargetClass, setImportTargetClass] = useState('');
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [nameColIndex, setNameColIndex] = useState(0);
  const [hasHeader, setHasHeader] = useState(true);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAllClasses = selectedClassId === '__all__';
  const visibleClassIds = useMemo(
    () => new Set(visibleClasses.map((c) => c.id)),
    [visibleClasses],
  );
  const classNameById = useMemo(() => {
    const m: Record<string, string> = {};
    classes.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [classes]);
  const classStudents = useMemo(
    () =>
      isAllClasses
        ? allStudents.filter((s) => visibleClassIds.has(s.class_id))
        : allStudents.filter((s) => s.class_id === selectedClassId),
    [allStudents, selectedClassId, isAllClasses, visibleClassIds],
  );

  const filteredStudents = useMemo(() => {
    let list = classStudents;
    if (filterStatus === 'ativos') list = list.filter((s) => s.active);
    if (filterStatus === 'inativos') list = list.filter((s) => !s.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [classStudents, filterStatus, search]);

  const totalAtivos = useMemo(
    () => classStudents.filter((s) => s.active).length,
    [classStudents],
  );
  const totalInativos = useMemo(
    () => classStudents.filter((s) => !s.active).length,
    [classStudents],
  );

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredStudents.forEach((s) => next.delete(s.id));
      } else {
        filteredStudents.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- Actions ----
  const handleAddStudent = async () => {
    if (!newName.trim() || !selectedClassId) return;
    setAddingStudent(true);
    const { error } = await supabase.from('ebd_students').insert({
      name: newName.trim(),
      class_id: selectedClassId,
      active: true,
      origin: 'manual',
    } as any);
    if (error) toast.error('Erro ao adicionar aluno');
    else {
      toast.success('Aluno adicionado');
      setNewName('');
      onRefresh();
    }
    setAddingStudent(false);
  };

  const startEdit = (s: EbdStudent) => {
    setEditingId(s.id);
    setEditingName(s.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from('ebd_students')
      .update({ name: editingName.trim() })
      .eq('id', id);
    if (error) toast.error('Erro ao salvar nome');
    else {
      toast.success('Nome atualizado');
      setEditingId(null);
      onRefresh();
    }
    setSavingEdit(false);
  };

  const handleToggleActive = async (student: EbdStudent) => {
    const { error } = await supabase
      .from('ebd_students')
      .update({ active: !student.active })
      .eq('id', student.id);
    if (error) toast.error('Erro ao atualizar status');
    else {
      toast.success(student.active ? 'Aluno desativado' : 'Aluno reativado');
      onRefresh();
    }
  };

  const handleBulkToggle = async (activate: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('ebd_students')
      .update({ active: activate })
      .in('id', ids);
    if (error) toast.error('Erro na operação em massa');
    else {
      toast.success(
        `${ids.length} aluno(s) ${activate ? 'ativados' : 'desativados'}`,
      );
      setSelectedIds(new Set());
      onRefresh();
    }
  };

  const handleTransfer = async () => {
    if (!transferStudent || !transferTarget) return;
    const { error } = await supabase
      .from('ebd_students')
      .update({ class_id: transferTarget })
      .eq('id', transferStudent.id);
    if (error) toast.error('Erro ao transferir aluno');
    else {
      toast.success('Aluno transferido');
      setTransferStudent(null);
      setTransferTarget('');
      onRefresh();
    }
  };

  const handleExport = () => {
    const cls = classes.find((c) => c.id === selectedClassId);
    const header = ['Nome', 'Status', 'Origem', 'Cadastro'];
    const data = filteredStudents.map((s) => [
      s.name,
      s.active ? 'Ativo' : 'Inativo',
      s.origin === 'importado' ? 'Importado' : 'Manual',
      s.created_at
        ? new Date(s.created_at).toLocaleDateString('pt-BR')
        : '-',
    ]);
    const csv = [header, ...data]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alunos-${cls?.name ?? 'turma'}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  // ---- Import wizard ----
  const resetWizard = () => {
    setImportStep(0);
    setImportTargetClass('');
    setCsvRows([]);
    setNameColIndex(0);
    setHasHeader(true);
    setImportRows([]);
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error('Arquivo vazio ou inválido');
        return;
      }
      setCsvRows(rows);
      setNameColIndex(0);
      setHasHeader(true);
      setImportStep(1);
    };
    reader.onerror = () => toast.error('Erro ao ler arquivo');
    reader.readAsText(file, 'UTF-8');
  };

  const dataRows = useMemo(
    () => (hasHeader ? csvRows.slice(1) : csvRows),
    [csvRows, hasHeader],
  );
  const headerRow = useMemo(
    () => (hasHeader && csvRows.length > 0 ? csvRows[0] : null),
    [csvRows, hasHeader],
  );
  const columnCount = csvRows[0]?.length ?? 0;

  const handleAnalyze = () => {
    if (!importTargetClass) {
      toast.error('Escolha a turma destino');
      return;
    }
    const targetStudents = allStudents.filter(
      (s) => s.class_id === importTargetClass,
    );
    const names = dataRows
      .map((r) => (r[nameColIndex] ?? '').trim())
      .filter(Boolean);

    const allNamesInCSV = names.map((n) => n.toLowerCase().trim());
    const csvDuplicateSet = new Set(
      allNamesInCSV.filter((n, i) => allNamesInCSV.indexOf(n) !== i),
    );

    const result: ImportRow[] = names.map((name) => {
      const lower = name.toLowerCase().trim();
      // 1. Exact match in DB
      const exact = targetStudents.find(
        (s) => s.name.toLowerCase().trim() === lower,
      );
      if (exact) {
        return {
          name,
          status: 'duplicata_certa',
          similarTo: exact.name,
          similarId: exact.id,
          action: 'ignorar',
        };
      }
      // 2. Similar in DB
      const similar = targetStudents
        .map((s) => ({ s, score: stringSimilarity(name, s.name) }))
        .filter((x) => x.score >= 0.75 && x.score < 1)
        .sort((a, b) => b.score - a.score)[0];
      if (similar) {
        return {
          name,
          status: 'duplicata_provavel',
          similarTo: similar.s.name,
          similarId: similar.s.id,
          action: 'ignorar',
        };
      }
      // 3. Duplicate within CSV
      if (csvDuplicateSet.has(lower)) {
        return {
          name,
          status: 'duplicata_certa',
          similarTo: 'duplicata dentro da planilha importada',
          action: 'ignorar',
        };
      }
      // 4. New
      return { name, status: 'novo', action: 'adicionar' };
    });

    setImportRows(result);
    setImportStep(2);
  };

  const updateRowAction = (idx: number, action: ImportRow['action']) => {
    setImportRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, action } : r)),
    );
  };

  const bulkIgnoreDuplicates = () => {
    setImportRows((prev) =>
      prev.map((r) => (r.status !== 'novo' ? { ...r, action: 'ignorar' } : r)),
    );
  };

  const bulkAddAll = () => {
    setImportRows((prev) =>
      prev.map((r) => (r.status !== 'novo' ? { ...r, action: 'adicionar' } : r)),
    );
  };

  const summary = useMemo(() => {
    const adicionar = importRows.filter((r) => r.action === 'adicionar').length;
    const substituir = importRows.filter((r) => r.action === 'substituir').length;
    const ignorar = importRows.filter((r) => r.action === 'ignorar').length;
    const novos = importRows.filter((r) => r.status === 'novo').length;
    const provaveis = importRows.filter(
      (r) => r.status === 'duplicata_provavel',
    ).length;
    const certas = importRows.filter((r) => r.status === 'duplicata_certa')
      .length;
    return { adicionar, substituir, ignorar, novos, provaveis, certas };
  }, [importRows]);

  const handleImport = async () => {
    setImporting(true);
    let added = 0;
    let replaced = 0;
    let errors = 0;

    const toAdd = importRows
      .filter((r) => r.action === 'adicionar')
      .map((r) => ({
        name: r.name,
        class_id: importTargetClass,
        active: true,
        origin: 'importado' as const,
      }));

    if (toAdd.length > 0) {
      const { data, error } = await supabase
        .from('ebd_students')
        .insert(toAdd as any)
        .select('id');
      if (error) errors += toAdd.length;
      else added = data?.length ?? toAdd.length;
    }

    for (const row of importRows.filter(
      (r) => r.action === 'substituir' && r.similarId,
    )) {
      const { error } = await supabase
        .from('ebd_students')
        .update({ name: row.name })
        .eq('id', row.similarId!);
      if (error) errors++;
      else replaced++;
    }

    const skipped = importRows.filter((r) => r.action === 'ignorar').length;

    toast.success(
      `✅ ${added} adicionados · 🔄 ${replaced} substituídos · ❌ ${skipped} ignorados` +
        (errors > 0 ? ` · ⛔ ${errors} erros` : ''),
    );

    resetWizard();
    setImportOpen(false);
    onRefresh();
    setImporting(false);
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // ---- Render ----
  return (
    <div className="space-y-4">
      {/* Top controls */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {visibleClasses.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm font-medium sm:w-24">Turma</label>
              <Select
                value={selectedClassId}
                onValueChange={(v) => {
                  setSelectedClassId(v);
                  setSelectedIds(new Set());
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecionar turma" />
                </SelectTrigger>
                <SelectContent>
                  {accessLevel === 'admin' && (
                    <SelectItem value="__all__">Todas as turmas</SelectItem>
                  )}
                  {visibleClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border bg-muted/40 p-2 text-center">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-bold">{classStudents.length}</div>
            </div>
            <div className="rounded-md border bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
              <div className="text-xs text-muted-foreground">Ativos</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {totalAtivos}
              </div>
            </div>
            <div className="rounded-md border bg-muted/40 p-2 text-center">
              <div className="text-xs text-muted-foreground">Inativos</div>
              <div className="text-lg font-bold text-muted-foreground">
                {totalInativos}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as FilterStatus)}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Nome do novo aluno..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddStudent();
              }}
              className="flex-1"
            />
            <Button
              onClick={handleAddStudent}
              disabled={!newName.trim() || addingStudent || !selectedClassId}
            >
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredStudents.length === 0}
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetWizard();
                setImportOpen(true);
              }}
            >
              <Upload className="h-4 w-4" /> Importar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <Card className="animate-in fade-in border-primary/30">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {selectedIds.size} selecionado(s)
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggle(true)}
              >
                <Power className="h-4 w-4" /> Ativar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggle(false)}
              >
                <PowerOff className="h-4 w-4" /> Desativar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students list */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhum aluno encontrado.
            </p>
            {search && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSearch('')}
              >
                Limpar busca
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    {isAllClasses && <TableHead className="w-40">Turma</TableHead>}
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-28">Origem</TableHead>
                    <TableHead className="w-28 hidden md:table-cell">
                      Cadastro
                    </TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(s.id)}
                          onCheckedChange={() => toggleSelectOne(s.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {editingId === s.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(s.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="h-8"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleSaveEdit(s.id)}
                              disabled={savingEdit}
                              title="Salvar"
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setEditingId(null)}
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(s)}
                            className={`text-left hover:underline ${
                              !s.active
                                ? 'line-through text-muted-foreground'
                                : ''
                            }`}
                            title="Clique para editar"
                          >
                            {s.name}
                          </button>
                        )}
                      </TableCell>
                      {isAllClasses && (
                        <TableCell className="text-sm text-muted-foreground">
                          {classNameById[s.class_id] ?? '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={s.active ? 'default' : 'secondary'}>
                          {s.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {s.origin === 'importado' ? 'Importado' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.created_at
                          ? new Date(s.created_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setTransferStudent(s);
                              setTransferTarget('');
                            }}
                            title="Transferir de turma"
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(s)}
                            title={s.active ? 'Desativar' : 'Reativar'}
                          >
                            {s.active ? (
                              <PowerOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Power className="h-4 w-4 text-emerald-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {filteredStudents.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(s.id)}
                      onCheckedChange={() => toggleSelectOne(s.id)}
                    />
                    {editingId === s.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(s.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-8"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleSaveEdit(s.id)}
                          disabled={savingEdit}
                          title="Salvar"
                        >
                          <Check className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditingId(null)}
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(s)}
                        className={`font-semibold text-left flex-1 ${
                          !s.active
                            ? 'line-through text-muted-foreground'
                            : ''
                        }`}
                      >
                        {s.name}
                      </button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => startEdit(s)}
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={s.active ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {s.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {s.origin === 'importado' ? 'Importado' : 'Manual'}
                      </Badge>
                      {isAllClasses && (
                        <Badge variant="outline" className="text-[10px]">
                          {classNameById[s.class_id] ?? '-'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setTransferStudent(s);
                          setTransferTarget('');
                        }}
                        title="Transferir"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleToggleActive(s)}
                        title={s.active ? 'Desativar' : 'Reativar'}
                      >
                        {s.active ? (
                          <PowerOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Power className="h-4 w-4 text-emerald-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Clique no nome para editar · Enter para salvar · Esc para cancelar
          </p>
        </>
      )}

      {/* Transfer dialog */}
      <Dialog
        open={!!transferStudent}
        onOpenChange={(v) => {
          if (!v) {
            setTransferStudent(null);
            setTransferTarget('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Transferir <strong>{transferStudent?.name}</strong> de{' '}
              <strong>{selectedClass?.name}</strong> para:
            </p>
            <Select value={transferTarget} onValueChange={setTransferTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar turma destino" />
              </SelectTrigger>
              <SelectContent>
                {classes
                  .filter((c) => c.id !== transferStudent?.class_id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransferStudent(null);
                setTransferTarget('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleTransfer} disabled={!transferTarget}>
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import wizard */}
      <Dialog
        open={importOpen}
        onOpenChange={(v) => {
          setImportOpen(v);
          if (!v) resetWizard();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar alunos via CSV — Passo {importStep + 1} de 3
            </DialogTitle>
          </DialogHeader>

          {/* Step 0 — upload */}
          {importStep === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione um arquivo CSV ou TXT com nomes de alunos. Suporta
                separadores vírgula, ponto-e-vírgula, pipe ou tab.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                  e.target.value = '';
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4" /> Escolher arquivo
              </Button>
            </div>
          )}

          {/* Step 1 — preview + mapping */}
          {importStep === 1 && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Coluna do nome</label>
                  <Select
                    value={String(nameColIndex)}
                    onValueChange={(v) => setNameColIndex(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: columnCount }).map((_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {headerRow?.[i] || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Turma destino</label>
                  <Select
                    value={importTargetClass}
                    onValueChange={setImportTargetClass}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolher turma..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={hasHeader}
                  onCheckedChange={(v) => setHasHeader(!!v)}
                />
                Primeira linha é cabeçalho
              </label>

              <div className="border rounded-md overflow-x-auto">
                <table className="text-xs w-full">
                  <tbody>
                    {csvRows.slice(0, 6).map((row, ri) => (
                      <tr
                        key={ri}
                        className={
                          ri === 0 && hasHeader
                            ? 'bg-muted font-semibold'
                            : 'border-t'
                        }
                      >
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className={`px-2 py-1.5 ${
                              ci === nameColIndex
                                ? 'bg-primary/10 text-primary'
                                : ''
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvRows.length > 6 && (
                  <div className="p-2 text-xs text-muted-foreground border-t bg-muted/30">
                    +{csvRows.length - 6} linha(s) adicional(is)
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setImportStep(0)}>
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={!importTargetClass}
                >
                  Analisar duplicatas →
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 2 — review */}
          {importStep === 2 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex flex-wrap gap-3">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    ✅ {summary.novos} novos
                  </span>
                  <span className="text-amber-700 dark:text-amber-400">
                    ⚠️ {summary.provaveis} prováveis
                  </span>
                  <span className="text-red-700 dark:text-red-400">
                    🔴 {summary.certas} certas
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={bulkIgnoreDuplicates}>
                    Ignorar duplicatas
                  </Button>
                  <Button size="sm" variant="outline" onClick={bulkAddAll}>
                    Adicionar todas
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                {importRows.map((row, idx) => {
                  const baseColor =
                    row.status === 'novo'
                      ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900'
                      : row.status === 'duplicata_provavel'
                        ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900'
                        : 'border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900';
                  return (
                    <div
                      key={idx}
                      className={`border rounded-md p-2.5 ${baseColor}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{row.name}</div>
                          {row.similarTo && (
                            <div className="text-xs text-muted-foreground">
                              {row.status === 'duplicata_certa' && !row.similarId
                                ? row.similarTo
                                : `Similar a: ${row.similarTo}`}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {row.status === 'novo' ? (
                            <Badge className="bg-emerald-600">Adicionar</Badge>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant={
                                  row.action === 'ignorar'
                                    ? 'default'
                                    : 'outline'
                                }
                                onClick={() => updateRowAction(idx, 'ignorar')}
                              >
                                Ignorar
                              </Button>
                              <Button
                                size="sm"
                                variant={
                                  row.action === 'adicionar'
                                    ? 'default'
                                    : 'outline'
                                }
                                onClick={() =>
                                  updateRowAction(idx, 'adicionar')
                                }
                              >
                                Adicionar
                              </Button>
                              {row.similarId && (
                                <Button
                                  size="sm"
                                  variant={
                                    row.action === 'substituir'
                                      ? 'default'
                                      : 'outline'
                                  }
                                  onClick={() =>
                                    updateRowAction(idx, 'substituir')
                                  }
                                >
                                  Substituir
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setImportStep(1)}>
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button onClick={() => setImportStep(3)}>Continuar →</Button>
              </DialogFooter>
            </div>
          )}

          {/* Step 3 — confirmation */}
          {importStep === 3 && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-1 text-sm">
                  <div>
                    ✅ <strong>{summary.adicionar}</strong> serão adicionados
                  </div>
                  <div>
                    🔄 <strong>{summary.substituir}</strong> serão substituídos
                  </div>
                  <div>
                    ❌ <strong>{summary.ignorar}</strong> serão ignorados
                  </div>
                </CardContent>
              </Card>

              {summary.substituir > 0 && (
                <div className="border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 text-red-700 dark:text-red-300 rounded p-3 flex gap-2 text-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <strong>{summary.substituir}</strong>{' '}
                    substituição(ões) de nome serão feitas — esta ação não pode
                    ser desfeita.
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setImportStep(2)}>
                  <ChevronLeft className="h-4 w-4" /> Revisar
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? 'Importando...' : 'Confirmar importação'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}