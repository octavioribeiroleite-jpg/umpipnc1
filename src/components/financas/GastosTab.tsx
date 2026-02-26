import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Loader2, Upload, FileImage, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
  category_id: string | null;
  receipt_url: string | null;
}

export function GastosTab() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
  });
  
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { profile, isAdmin, isPastor, selectedSocietyId } = useAuth();
  const societyId = (!isAdmin && !isPastor) ? profile?.society_id : selectedSocietyId;

  const fetchData = async () => {
    setLoading(true);
    let txQuery = supabase.from('transactions').select('*').eq('type', 'saida').order('date', { ascending: false });
    let catQuery = supabase.from('financial_categories').select('*').eq('type', 'saida');

    if (societyId) {
      txQuery = txQuery.eq('society_id', societyId);
      catQuery = catQuery.or(`society_id.eq.${societyId},society_id.is.null`);
    }

    const [txRes, catRes] = await Promise.all([txQuery, catQuery]);
    if (!txRes.error) setTransactions(txRes.data || []);
    if (!catRes.error) setCategories(catRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [societyId]);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sem categoria';
    return categories.find((c) => c.id === categoryId)?.name || 'Sem categoria';
  };

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return '#6b7280';
    return categories.find((c) => c.id === categoryId)?.color || '#6b7280';
  };

  const openNewDialog = () => {
    setEditingTransaction(null);
    setFormData({ description: '', amount: '', category_id: '', date: new Date().toISOString().split('T')[0] });
    setReceiptFile(null);
    setReceiptPreview(null);
    setDialogOpen(true);
  };

  const openEditDialog = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormData({ description: tx.description, amount: tx.amount.toString(), category_id: tx.category_id || '', date: tx.date });
    setReceiptFile(null);
    setReceiptPreview(tx.receipt_url);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadReceipt = async (transactionId: string): Promise<string | null> => {
    if (!receiptFile) return null;
    
    const fileExt = receiptFile.name.split('.').pop();
    const fileName = `gastos/${transactionId}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, receiptFile, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido');
      return;
    }
    
    // Validar comprovante obrigatório para novos gastos
    if (!editingTransaction && !receiptFile) {
      toast.error('Comprovante é obrigatório');
      return;
    }

    setSubmitting(true);
    try {
      if (editingTransaction) {
        let receiptUrl = editingTransaction.receipt_url;
        
        // Upload novo comprovante se selecionado
        if (receiptFile) {
          receiptUrl = await uploadReceipt(editingTransaction.id);
        }
        
        const { error } = await supabase.from('transactions').update({
          description: formData.description,
          amount,
          category_id: formData.category_id || null,
          date: formData.date,
          receipt_url: receiptUrl,
        }).eq('id', editingTransaction.id);
        if (error) throw error;
        toast.success('Gasto atualizado!');
      } else {
        // Upload do comprovante ANTES do INSERT para evitar UPDATE separado (bloqueado por RLS)
        let receiptUrl: string | null = null;
        if (receiptFile) {
          const tempId = crypto.randomUUID();
          receiptUrl = await uploadReceipt(tempId);
        }

        const { error } = await supabase.from('transactions').insert({
          description: formData.description,
          amount,
          type: 'saida',
          category_id: formData.category_id || null,
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

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
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
                  <TableHead>Categoria</TableHead>
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
                          <a 
                            href={tx.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                            title="Ver comprovante"
                          >
                            <FileImage className="h-4 w-4" />
                          </a>
                        )}
                        {tx.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `${getCategoryColor(tx.category_id)}20`,
                          color: getCategoryColor(tx.category_id),
                        }}
                      >
                        {getCategoryName(tx.category_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      -R$ {tx.amount.toFixed(2).replace('.', ',')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(tx)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(tx.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Editar Gasto' : 'Novo Gasto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o gasto..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Campo de Upload do Comprovante */}
            <div>
              <Label>Comprovante {!editingTransaction && '*'}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {receiptPreview ? (
                <div className="mt-2 relative">
                  <div className="border rounded-lg p-2 bg-muted/50">
                    {receiptPreview.startsWith('data:image') || receiptPreview.includes('/receipts/') ? (
                      <img 
                        src={receiptPreview} 
                        alt="Preview" 
                        className="max-h-32 rounded mx-auto object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center py-4 text-muted-foreground">
                        <FileImage className="h-8 w-8 mr-2" />
                        <span>Arquivo selecionado</span>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removeReceipt}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Anexar Comprovante
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Aceito: imagens ou PDF (máx. 5MB)
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingTransaction ? 'Salvar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
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
