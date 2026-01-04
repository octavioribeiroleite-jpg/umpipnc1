import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, GripVertical, Trash2, Save, Loader2 } from 'lucide-react';

interface AgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface PautaEditorProps {
  meetingId: string;
  agendaItems: AgendaItem[];
  onUpdate: () => void;
  disabled?: boolean;
  canManage?: boolean;
}

export function PautaEditor({ meetingId, agendaItems, onUpdate, disabled, canManage }: PautaEditorProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<AgendaItem[]>(agendaItems);
  const [newItem, setNewItem] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddItem = async () => {
    if (!newItem.title.trim()) {
      toast({
        title: 'Erro',
        description: 'O título do item é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('agenda_items')
        .insert({
          meeting_id: meetingId,
          title: newItem.title,
          description: newItem.description || null,
          order_index: items.length,
        })
        .select()
        .single();

      if (error) throw error;

      setItems([...items, data]);
      setNewItem({ title: '', description: '' });
      onUpdate();
      
      toast({
        title: 'Sucesso',
        description: 'Item de pauta adicionado.',
      });
    } catch (err) {
      console.error('Error adding agenda item:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar item.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (item: AgendaItem) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agenda_items')
        .update({
          title: item.title,
          description: item.description,
        })
        .eq('id', item.id);

      if (error) throw error;

      setEditingId(null);
      onUpdate();
      
      toast({
        title: 'Sucesso',
        description: 'Item atualizado.',
      });
    } catch (err) {
      console.error('Error updating agenda item:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar item.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja remover este item?')) return;

    try {
      const { error } = await supabase
        .from('agenda_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter(i => i.id !== itemId));
      onUpdate();
      
      toast({
        title: 'Sucesso',
        description: 'Item removido.',
      });
    } catch (err) {
      console.error('Error deleting agenda item:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao remover item.',
        variant: 'destructive',
      });
    }
  };

  const handleItemChange = (itemId: string, field: 'title' | 'description', value: string) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pauta da Reunião</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum item de pauta adicionado.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span className="font-medium text-sm">{index + 1}.</span>
                </div>
                <div className="flex-1 space-y-2">
                  {editingId === item.id && canManage && !disabled ? (
                    <>
                      <Input
                        value={item.title}
                        onChange={(e) => handleItemChange(item.id, 'title', e.target.value)}
                        placeholder="Título do item"
                      />
                      <Textarea
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="Descrição (opcional)"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateItem(item)} disabled={saving}>
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          <span className="ml-1">Salvar</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </>
                  )}
                </div>
                {canManage && !disabled && editingId !== item.id && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(item.id)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage && !disabled && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm">Adicionar Item</h4>
            <Input
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              placeholder="Título do item de pauta"
            />
            <Textarea
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              placeholder="Descrição (opcional)"
              rows={2}
            />
            <Button onClick={handleAddItem} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar Item
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
