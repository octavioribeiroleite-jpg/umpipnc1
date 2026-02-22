import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Users, Copy, CheckCircle2, XCircle } from 'lucide-react';

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function generateUsername(name: string): string {
  return removeAccents(name).replace(/\s+/g, '').toLowerCase();
}

function generatePassword(name: string): string {
  return name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + '123';
}

interface Member {
  id: string;
  name: string;
  user_id: string | null;
  society_id: string | null;
}

interface CredentialResult {
  name: string;
  username: string;
  password: string;
  success: boolean;
  error?: string;
}

interface BulkLoginDialogProps {
  members: Member[];
  onComplete: () => void;
}

export function BulkLoginDialog({ members, onComplete }: BulkLoginDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<CredentialResult[] | null>(null);
  const { toast } = useToast();

  const pendingMembers = members.filter(m => !m.user_id);

  if (pendingMembers.length === 0) return null;

  const handleProcess = async () => {
    setConfirmOpen(false);
    setProcessing(true);
    setProgress({ current: 0, total: pendingMembers.length });
    const collected: CredentialResult[] = [];

    for (const member of pendingMembers) {
      const username = generateUsername(member.name);
      const password = generatePassword(member.name);

      try {
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            full_name: member.name,
            username,
            password,
            role: 'visualizador',
            society_id: member.society_id,
            member_id: member.id,
          },
        });

        if (error || data?.error) {
          // If duplicate username, try with suffix
          const errMsg = data?.error || error?.message || '';
          if (errMsg.includes('already been registered') || errMsg.includes('already exists')) {
            const username2 = username + '2';
            const { data: data2, error: error2 } = await supabase.functions.invoke('create-user', {
              body: {
                full_name: member.name,
                username: username2,
                password,
                role: 'visualizador',
                society_id: member.society_id,
                member_id: member.id,
              },
            });
            if (error2 || data2?.error) {
              collected.push({ name: member.name, username, password, success: false, error: data2?.error || error2?.message });
            } else {
              collected.push({ name: member.name, username: username2, password, success: true });
            }
          } else {
            collected.push({ name: member.name, username, password, success: false, error: errMsg });
          }
        } else {
          collected.push({ name: member.name, username, password, success: true });
        }
      } catch (err: any) {
        collected.push({ name: member.name, username, password, success: false, error: err.message });
      }

      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    setProcessing(false);
    setResults(collected);

    const successes = collected.filter(r => r.success).length;
    const failures = collected.filter(r => !r.success).length;
    toast({
      title: `${successes} conta(s) criada(s)${failures > 0 ? `, ${failures} falha(s)` : ''}`,
      variant: failures > 0 ? 'destructive' : 'default',
    });
  };

  const copyAllCredentials = () => {
    if (!results) return;
    const successResults = results.filter(r => r.success);
    const text = successResults.map(r => `${r.name} | ${r.username} | ${r.password}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Credenciais copiadas!' });
  };

  const closeResults = () => {
    setResults(null);
    onComplete();
  };

  const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <>
      <Button variant="outline" onClick={() => setConfirmOpen(true)}>
        <Users className="h-4 w-4 mr-2" />
        Criar logins em massa
        <Badge variant="secondary" className="ml-2">{pendingMembers.length}</Badge>
      </Button>

      {/* Confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar logins em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Serão criadas contas de acesso para <strong>{pendingMembers.length}</strong> membro(s) sem login.
              Cada um receberá o papel "visualizador" com credenciais geradas automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcess}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Processing */}
      <Dialog open={processing} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Criando contas...</DialogTitle>
            <DialogDescription>
              Processando {progress.current} de {progress.total} membros
            </DialogDescription>
          </DialogHeader>
          <Progress value={progressPercent} className="w-full" />
        </DialogContent>
      </Dialog>

      {/* Results */}
      <Dialog open={!!results} onOpenChange={closeResults}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatório de Criação de Logins</DialogTitle>
            <DialogDescription>
              {results && `${results.filter(r => r.success).length} sucesso(s), ${results.filter(r => !r.success).length} falha(s)`}
            </DialogDescription>
          </DialogHeader>
          {results && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Senha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i} className={!r.success ? 'bg-destructive/10' : ''}>
                    <TableCell>
                      {r.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-sm">{r.username}</TableCell>
                    <TableCell className="font-mono text-sm">{r.success ? r.password : r.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button onClick={copyAllCredentials} className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar Credenciais
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
