import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DoorOpen, KeyRound, Lock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface EbdClass {
  id: string;
  name: string;
  order_index: number;
}

interface ConfiguracoesEbdTabProps {
  classes: EbdClass[];
  adminPin: string;
}

export default function ConfiguracoesEbdTab({ classes, adminPin }: ConfiguracoesEbdTabProps) {
  const [withPassword, setWithPassword] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dialogClass, setDialogClass] = useState<EbdClass | null>(null);
  const [clearingClass, setClearingClass] = useState<EbdClass | null>(null);
  const [saving, setSaving] = useState(false);
  const [pin, setPin] = useState('');

  const fetchPasswords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ebd_class_passwords')
      .select('class_id')
      .eq('active', true);
    if (error) {
      toast.error('Erro ao carregar senhas das salas');
    } else {
      setWithPassword(new Set((data || []).map((r: { class_id: string }) => r.class_id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPasswords(); }, [fetchPasswords]);

  // Extracts a detailed, user-friendly message from a function invocation.
  // When the edge function returns a non-2xx status, supabase-js puts the
  // Response in `error.context`, so the JSON body must be read from there.
  const resolveErrorMessage = async (
    error: unknown,
    data: unknown,
    fallback: string,
  ): Promise<string> => {
    let status: number | undefined;
    let serverMessage: string | undefined = (data as any)?.error;

    const ctx = (error as any)?.context;
    if (ctx) {
      status = ctx.status;
      try {
        const body = await ctx.clone().json();
        if (body?.error) serverMessage = body.error;
      } catch {
        // body was not JSON; keep whatever we have
      }
    }

    switch (status) {
      case 401:
        return 'Sessão expirada (401). Saia e entre novamente na Secretaria.';
      case 403:
        return serverMessage
          ? `Sem permissão (403): ${serverMessage}`
          : 'Sem permissão (403). PIN administrativo inválido para esta ação.';
      case 409:
        return serverMessage
          ? `Conflito de dados (409): ${serverMessage}`
          : 'Conflito de dados (409). Esta senha já está em uso por outra sala.';
      case 400:
        return serverMessage ? `Dados inválidos (400): ${serverMessage}` : 'Dados inválidos (400).';
      default:
        return serverMessage || (error as any)?.message || fallback;
    }
  };

  const openSet = (c: EbdClass) => {
    setDialogClass(c);
    setPin('');
  };

  const handleSave = async () => {
    if (!dialogClass) return;
    if (!/^[0-9]{6}$/.test(pin)) { toast.error('A senha deve ter 6 dígitos'); return; }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('manage-ebd-class-password', {
      body: { action: 'set', class_id: dialogClass.id, pin, admin_pin: adminPin },
    });
    setSaving(false);
    if (error || (data && (data as any).error)) {
      toast.error(await resolveErrorMessage(error, data, 'Erro ao salvar a senha'));
      return;
    }
    toast.success('Senha definida');
    setDialogClass(null);
    fetchPasswords();
  };

  const handleClear = async () => {
    if (!clearingClass) return;
    const { data, error } = await supabase.functions.invoke('manage-ebd-class-password', {
      body: { action: 'clear', class_id: clearingClass.id, admin_pin: adminPin },
    });
    if (error || (data && (data as any).error)) {
      toast.error(await resolveErrorMessage(error, data, 'Erro ao remover a senha'));
      return;
    }
    toast.success('Senha removida');
    setClearingClass(null);
    fetchPasswords();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Defina uma senha de 6 dígitos para cada sala. Os professores entram com a senha da sala.
      </p>

      {classes.length === 0 && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground text-center">
            Crie ao menos uma turma antes de definir senhas.
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {classes.map(c => {
            const has = withPassword.has(c.id);
            return (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <DoorOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    <Badge variant={has ? 'default' : 'secondary'} className="text-[10px] mt-0.5">
                      {has ? 'Com senha' : 'Sem senha'}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => openSet(c)}>
                    <KeyRound className="h-3.5 w-3.5 mr-1" /> {has ? 'Trocar' : 'Definir'}
                  </Button>
                  {has && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setClearingClass(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!dialogClass} onOpenChange={v => !v && setDialogClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Senha da sala
            </DialogTitle>
            <DialogDescription>{dialogClass?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="class-pin">Senha de 6 dígitos</Label>
            <Input
              id="class-pin"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="••••••"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogClass(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!clearingClass} onOpenChange={v => !v && setClearingClass(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover senha?</AlertDialogTitle>
            <AlertDialogDescription>
              A sala {clearingClass?.name} ficará sem senha e ninguém poderá entrar nela até definir uma nova.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}