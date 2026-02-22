import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Upload, CheckCircle2, Clock, XCircle, Loader2, CalendarDays, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Charge {
  id: string;
  amount: number;
  competence: string;
  type: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  paid_amount: number | null;
  payment_method: string | null;
  notes: string | null;
}

interface Submission {
  id: string;
  competence: string;
  type: string;
  status: string;
  created_at: string;
  receipt_url: string;
  notes: string | null;
  rejection_reason: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
  aprovado: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
  rejeitado: { label: 'Rejeitado', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  cartao: 'Cartão',
};

export function MembroPagamentos() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedCompetence, setSelectedCompetence] = useState('');
  const [selectedType, setSelectedType] = useState('mensalidade');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: memberData } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!memberData) {
      setLoading(false);
      return;
    }

    setMemberId(memberData.id);

    const { data: chargesData } = await supabase
      .from('charges')
      .select('id, amount, competence, type, status, due_date, paid_at, paid_amount, payment_method, notes')
      .eq('member_id', memberData.id)
      .in('status', ['pendente', 'parcial'])
      .order('due_date', { ascending: true });

    if (chargesData) setCharges(chargesData as Charge[]);

    const { data: subsData } = await supabase
      .from('member_payment_submissions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (subsData) setSubmissions(subsData as Submission[]);
    setLoading(false);
  };

  const getCompetenceOptions = () => {
    const options: string[] = [];
    const now = new Date();
    for (let i = -1; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      options.push(`${months[d.getMonth()]}/${d.getFullYear()}`);
    }
    return options;
  };

  const handleSubmit = async () => {
    if (!selectedFile || !selectedCompetence || !memberId) {
      toast({ variant: 'destructive', title: 'Preencha todos os campos', description: 'Selecione a competência e o comprovante.' });
      return;
    }

    setSubmitting(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `member-receipts/${user!.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('member_payment_submissions').insert({
        member_id: memberId,
        user_id: user!.id,
        competence: selectedCompetence,
        type: selectedType,
        receipt_url: urlData.publicUrl,
        notes: notes || null,
        society_id: profile?.society_id || null,
      });
      if (insertError) throw insertError;

      toast({ title: 'Comprovante enviado!', description: 'A diretoria será notificada para aprovação.' });
      setDialogOpen(false);
      setSelectedFile(null);
      setNotes('');
      fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Pagamentos</h2>
        {[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  if (!memberId) {
    return (
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Pagamentos</h2>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Seu perfil ainda não foi vinculado ao cadastro de membros.</p>
            <p className="text-xs mt-1">Entre em contato com a diretoria.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending charges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Cobranças Pendentes</h2>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Enviar Comprovante
          </Button>
        </div>

        {charges.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success opacity-70" />
              <p className="text-sm">Nenhuma cobrança pendente. Tudo em dia!</p>
            </CardContent>
          </Card>
        ) : (
          charges.map((charge) => {
            const remaining = charge.paid_amount ? charge.amount - charge.paid_amount : charge.amount;
            return (
              <Card key={charge.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm capitalize">{charge.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'}</p>
                      <p className="text-xs text-muted-foreground">{charge.competence}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">R$ {Number(charge.amount).toFixed(2).replace('.', ',')}</p>
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                        {charge.status === 'parcial' ? 'Parcial' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Vence: {format(new Date(charge.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                    </span>
                    {charge.status === 'parcial' && charge.paid_amount != null && (
                      <span className="flex items-center gap-1">
                        <Banknote className="h-3 w-3" />
                        Pago: R$ {Number(charge.paid_amount).toFixed(2).replace('.', ',')} • Restante: R$ {remaining.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    {charge.payment_method && (
                      <span>{paymentMethodLabels[charge.payment_method] || charge.payment_method}</span>
                    )}
                  </div>

                  {charge.notes && (
                    <p className="text-xs text-muted-foreground italic">{charge.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Submission history */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Comprovantes Enviados</h2>
          {submissions.map((sub) => {
            const config = statusConfig[sub.status] || statusConfig.pendente;
            const StatusIcon = config.icon;
            return (
              <Card key={sub.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm capitalize">{sub.type === 'mensalidade' ? 'Mensalidade' : 'Per Capita'}</p>
                    <Badge variant="outline" className={`text-[10px] ${config.className}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{sub.competence}</p>
                  {sub.rejection_reason && (
                    <p className="text-xs text-destructive mt-1">Motivo: {sub.rejection_reason}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Comprovante de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Competência</Label>
              <Select value={selectedCompetence} onValueChange={setSelectedCompetence}>
                <SelectTrigger><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
                <SelectContent>
                  {getCompetenceOptions().map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensalidade">Mensalidade</SelectItem>
                  <SelectItem value="percapita">Per Capita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comprovante (foto ou PDF)</Label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: pagamento referente a dois meses..."
                rows={2}
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
              ) : (
                'Enviar Comprovante'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
