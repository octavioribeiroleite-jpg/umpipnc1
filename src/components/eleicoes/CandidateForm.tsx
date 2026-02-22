import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, UserCheck, Loader2 } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  photo_url: string | null;
  display_order: number;
}

interface CandidateFormProps {
  electionId: string;
  candidates: Candidate[];
  onRefresh: () => void;
  disabled?: boolean;
}

export function CandidateForm({ electionId, candidates, onRefresh, disabled }: CandidateFormProps) {
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!name.trim()) return;
    await supabase.from('election_candidates' as any).insert({
      election_id: electionId,
      name: name.trim(),
      display_order: candidates.length,
    } as any);
    setName('');
    onRefresh();
  };

  const handleRemove = async (id: string) => {
    await supabase.from('election_candidates' as any).delete().eq('id', id);
    onRefresh();
  };

  const handlePhotoUpload = async (candidateId: string, file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `elections/${electionId}/${candidateId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: 'Erro no upload', variant: 'destructive' });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
    await supabase.from('election_candidates' as any).update({ photo_url: urlData.publicUrl } as any).eq('id', candidateId);
    setUploading(false);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      {!disabled && (
        <div className="flex gap-2">
          <Input
            placeholder="Nome do candidato"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="h-9"
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {candidates.map((c) => (
          <div key={c.id} className="flex flex-col items-center gap-1.5 p-2 border rounded-lg">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {c.photo_url ? (
                <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                <UserCheck className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <span className="text-xs font-medium text-center leading-tight line-clamp-2">{c.name}</span>
            {!disabled && (
              <div className="flex gap-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(c.id, file);
                    }}
                  />
                  <Button variant="outline" size="icon" className="h-7 w-7" asChild disabled={uploading}>
                    <span><Upload className="h-3 w-3" /></span>
                  </Button>
                </label>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(c.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {candidates.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum candidato cadastrado.</p>
      )}
    </div>
  );
}
