import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Loader2, FileImage } from 'lucide-react';
import { GastoWizard } from './GastoWizard';
import { ReceiptLink } from '@/components/ReceiptLink';
import { receiptReference } from '@/lib/receipt-path';
import { signedReceiptUrl } from '@/lib/receipts';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
  receipt_url: string | null;
}

export function GastosTab() {
  const { user, effectiveSocietyId: societyId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [initialFormData, setInitialFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [initialReceiptPreview, setInitialReceiptPreview] = useState<string | null>(null);
  const receiptRequest = useRef(0);


  const fetchData = async () => {
    setLoading(true);
    let txQuery = supabase.from('transactions').select('*').eq('type', 'saida').order('date', { ascending: false });
    if (societyId) txQuery = txQuery.eq('society_id', societyId);
    const { data, error } = await txQuery;
    if (!error) setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [societyId]);

  const openNewDialog = () => {
    receiptRequest.current += 1;
    setEditingTransaction(null);
    setInitialFormData({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    setInitialReceiptPreview(null);
    setDialogOpen(true);
  };

  const openEditDialog = async (tx: Transaction) => {
    const request = ++receiptRequest.current;
    let preview: string | null = null;
    if (tx.receipt_url) {
      try { preview = await signedReceiptUrl(tx.receipt_url); }
      catch { if (request === receiptRequest.current) toast.error('Não foi possível carregar o comprovante'); }
    }
    if (request !== receiptRequest.current) return;
    setEditingTransaction(tx);
    setInitialFormData({ description: tx.description, amount: tx.amount.toString(), date: tx.date });
    setInitialReceiptPreview(preview);
    setDialogOpen(true);
  };

  const uploadReceipt = async (id: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    if (!societyId) throw new Error('Selecione a sociedade.');
    const fileName = `${societyId}/${new Date().getFullYear()}/gastos/${id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file, { upsert: true });
    if (uploadError) throw uploadError;
    return receiptReference(fileName);
  };

  const handleWizardSubmit = async (
    formData: { description: string; amount: string; date: string },
    receiptFile: File | null
  ) => {
    setSubmitting(true);
    let uploadedFilePath: string | null = null;
    try {
      const amount = parseFloat(formData.amount);

      if (editingTransaction) {
        let receiptUrl = editingTransaction.receipt_url;
        if (receiptFile) {
          receiptUrl = await uploadReceipt(editingTransaction.id, receiptFile);
        }
        const { error } = await supabase.from('transactions').update({
          description: formData.description,
          amount,
          date: formData.date,
          receipt_url: receiptUrl,
        }).eq('id', editingTransaction.id);
        if (error) throw error;
        toast.success('Gasto atualizado!');
      } else {
        let receiptUrl: string | null = null;
        if (receiptFile) {
          const tempId = crypto.randomUUID();
          const fileExt = receiptFile.name.split('.').pop();
          uploadedFilePath = `${societyId}/${new Date().getFullYear()}/gastos/${tempId}.${fileExt}`;
          receiptUrl = await uploadReceipt(tempId, receiptFile);
        }
        const { error } = await supabase.from('transactions').insert({
          description: formData.description,
          amount,
          type: 'saida',
          date: formData.date,
          created_by: user?.id,
          origin: 'manual',
          society_id: societyId || null,
          receipt_url: receiptUrl,
        });
        if (error) throw error;
        toast.success('Gasto registrado!');
      }
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      // Clean up orphan receipt if upload succeeded but insert failed
      if (uploadedFilePath) {
        await supabase.storage.from('receipts').remove([uploadedFilePath]);
      }
      toast.error('Erro: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', deletingId);
      if (error) throw error;
      toast.success('Gasto excluído!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const totalGastos = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <>
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Gastos</p>
              <p className="text-2xl font-bold text-destructive">
                R$ {totalGastos.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Gasto
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum gasto registrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {tx.receipt_url && (
                          <ReceiptLink
                            reference={tx.receipt_url}
                            className="text-primary hover:text-primary/80"
                          >
                            <FileImage className="h-4 w-4" />
                          </ReceiptLink>
                        )}
                        {tx.description}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      -R$ {tx.amount.toFixed(2).replace('.', ',')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(tx)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeletingId(tx.id); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) receiptRequest.current += 1;
        setDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Editar Gasto' : 'Novo Gasto'}</DialogTitle>
          </DialogHeader>
          <GastoWizard
            key={dialogOpen ? 'open' : 'closed'}
            editing={!!editingTransaction}
            initialData={initialFormData}
            initialReceiptPreview={initialReceiptPreview}
            submitting={submitting}
            onSubmit={handleWizardSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Gasto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
