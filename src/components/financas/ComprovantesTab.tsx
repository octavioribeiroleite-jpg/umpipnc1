import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Eye, Loader2, FileText } from 'lucide-react';

interface Submission {
  id: string;
  member_id: string;
  user_id: string;
  competence: string;
  type: string;
  receipt_url: string;
  notes: string | null;
  status: string;
  rejection_reason: string | null;
  society_id: string | null;
  created_at: string;
  member_name?: string;
}

export function ComprovantesTab() {
  const { user, effectiveSocietyId: societyId } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [rejectReason, setRejectReason] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();

    const channel = supabase
      .channel('comprovantes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_payment_submissions' }, fetchSubmissions)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchSubmissions = async () => {
    let query = supabase
      .from('member_payment_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (societyId) {
      query = query.eq('society_id', societyId);
    }

    const { data } = await query;

    if (data) {
      // Fetch member names
      const memberIds = [...new Set(data.map(s => s.member_id))];
      const { data: members } = await supabase
        .from('members')
        .select('id, name')
        .in('id', memberIds);

      const memberMap = new Map((members || []).map(m => [m.id, m.name]));

      setSubmissions(data.map(s => ({
        ...s,
        member_name: memberMap.get(s.member_id) || 'Membro desconhecido',
      })) as Submission[]);
    }
    setLoading(false);
  };

  const handleApprove = async (sub: Submission) => {
    setActionLoading(sub.id);
    try {
      await supabase
        .from('member_payment_submissions')
        .update({
          status: 'aprovado',
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', sub.id);

      toast({ title: 'Comprovante aprovado!', description: `Pagamento de ${sub.member_name} aprovado.` });
      fetchSubmissions();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.id) return;
    setActionLoading(rejectDialog.id);
    try {
      await supabase
        .from('member_payment_submissions')
        .update({
          status: 'rejeitado',
          rejection_reason: rejectReason || null,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', rejectDialog.id);

      toast({ title: 'Comprovante rejeitado' });
      setRejectDialog({ open: false, id: null });
      setRejectReason('');
      fetchSubmissions();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'pendente').length;

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm font-medium">
          {pendingCount} comprovante{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''} de aprovação
        </div>
      )}

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum comprovante enviado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        submissions.map((sub) => (
          <Card key={sub.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-medium text-sm">{sub.member_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'} • {sub.competence}
                  </p>
                  {sub.notes && <p className="text-xs text-muted-foreground mt-1">Obs: {sub.notes}</p>}
                </div>
                <Badge variant="outline" className={`text-[10px] ${
                  sub.status === 'pendente' ? 'bg-warning/10 text-warning border-warning/20' :
                  sub.status === 'aprovado' ? 'bg-success/10 text-success border-success/20' :
                  'bg-destructive/10 text-destructive border-destructive/20'
                }`}>
                  {sub.status === 'pendente' ? 'Pendente' : sub.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewUrl(sub.receipt_url)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ver Comprovante
                </Button>

                {sub.status === 'pendente' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(sub)}
                      disabled={actionLoading === sub.id}
                    >
                      {actionLoading === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRejectDialog({ open: true, id: sub.id })}
                      disabled={actionLoading === sub.id}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejeitar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => { if (!open) setRejectDialog({ open: false, id: null }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Comprovante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: comprovante ilegível, valor incorreto..."
                rows={3}
              />
            </div>
            <Button variant="destructive" className="w-full" onClick={handleReject} disabled={actionLoading !== null}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Rejeição
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Comprovante</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="max-h-[70vh] overflow-auto">
              <img src={previewUrl} alt="Comprovante" className="w-full rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
