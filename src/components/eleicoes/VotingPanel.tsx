import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { Play, RotateCcw, CheckCircle, Loader2, Vote, Link as LinkIcon, Copy } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VotingPanelProps {
  electionId: string;
  status: string;
  totalPresent: number;
  onRefresh: () => void;
}

export function VotingPanel({ electionId, status, totalPresent, onRefresh }: VotingPanelProps) {
  const [voteCount, setVoteCount] = useState(0);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'finish' | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const voteUrl = `${window.location.origin}/vote/${electionId}`;
  const diff = voteCount - totalPresent;

  const fetchVoteCount = async () => {
    const { count } = await supabase
      .from('election_votes' as any)
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId);
    setVoteCount(count || 0);
  };

  useEffect(() => {
    fetchVoteCount();

    // Realtime subscription
    const channel = supabase
      .channel(`election-votes-${electionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'election_votes',
        filter: `election_id=eq.${electionId}`,
      }, () => {
        fetchVoteCount();
      })
      .subscribe();

    // Fallback polling every 3 seconds
    const interval = setInterval(() => {
      fetchVoteCount();
    }, 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [electionId]);

  const handleStartVoting = async () => {
    setLoading(true);
    await supabase.from('elections' as any).update({ status: 'open' } as any).eq('id', electionId);
    toast({ title: 'Votação iniciada!' });
    setLoading(false);
    onRefresh();
  };

  const handleReset = async () => {
    setLoading(true);
    await supabase.from('election_votes' as any).delete().eq('election_id', electionId);
    toast({ title: 'Votação reiniciada — votos apagados' });
    setLoading(false);
    setConfirmAction(null);
    fetchVoteCount();
  };

  const handleFinish = async () => {
    setLoading(true);
    await supabase.from('elections' as any).update({ status: 'finished' } as any).eq('id', electionId);
    toast({ title: 'Votação concluída!' });
    setLoading(false);
    setConfirmAction(null);
    onRefresh();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(voteUrl);
    toast({ title: 'Link copiado!' });
  };

  if (status === 'draft') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" /> Votação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure a chamada e os candidatos antes de iniciar a votação.
          </p>
          <Button onClick={handleStartVoting} disabled={loading || totalPresent === 0}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Iniciar Votação
          </Button>
          {totalPresent === 0 && (
            <p className="text-xs text-destructive">Confirme a presença antes de iniciar.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (status === 'finished') return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" /> Painel de Votação
            <Badge variant="default">Em Votação</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Counters */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{totalPresent}</p>
              <p className="text-xs text-muted-foreground">Presentes</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{voteCount}</p>
              <p className="text-xs text-muted-foreground">Votos</p>
            </div>
            <div className={`p-4 rounded-lg ${diff === 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <p className={`text-2xl font-bold ${diff === 0 ? 'text-success' : 'text-destructive'}`}>
                {diff > 0 ? `+${diff}` : diff}
              </p>
              <p className="text-xs text-muted-foreground">Diferença</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {diff !== 0 ? (
              <Button variant="destructive" onClick={() => setConfirmAction('reset')}>
                <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar Votação
              </Button>
            ) : (
              <Button onClick={() => setConfirmAction('finish')} className="bg-success hover:bg-success/90">
                <CheckCircle className="h-4 w-4 mr-2" /> Concluir Votação
              </Button>
            )}
          </div>

          {/* QR Code & Link */}
          <div className="flex flex-col md:flex-row items-center gap-4 p-4 border rounded-lg">
            <QRCodeSVG value={voteUrl} size={160} />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <LinkIcon className="h-4 w-4" /> Link da Urna
              </p>
              <code className="text-xs bg-muted p-2 rounded block break-all">{voteUrl}</code>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="h-3 w-3 mr-1" /> Copiar Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'reset' ? 'Reiniciar votação?' : 'Concluir votação?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'reset'
                ? 'Todos os votos serão apagados. Presença e candidatos serão mantidos.'
                : 'A votação será encerrada e o resultado será exibido.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction === 'reset' ? handleReset : handleFinish}>
              {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
