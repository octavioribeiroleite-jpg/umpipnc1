import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, UserCheck, Loader2, ImagePlus, X } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  photo_url: string | null;
  photo_urls?: string[];
  display_order: number;
}

interface CandidateFormProps {
  electionId: string;
  candidates: Candidate[];
  onRefresh: () => void;
  disabled?: boolean;
  type?: 'cargo' | 'camisa';
}

export function CandidateForm({ electionId, candidates, onRefresh, disabled, type = 'cargo' }: CandidateFormProps) {
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();
  const isCamisa = type === 'camisa';
  const label = isCamisa ? 'modelo' : 'candidato';

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

  // Single photo upload (cargo mode)
  const handleSinglePhotoUpload = async (candidateId: string, file: File) => {
    setUploading(candidateId);
    const ext = file.name.split('.').pop();
    const path = `elections/${electionId}/${candidateId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: 'Erro no upload', variant: 'destructive' });
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
    await supabase.from('election_candidates' as any).update({ photo_url: urlData.publicUrl } as any).eq('id', candidateId);
    setUploading(null);
    onRefresh();
  };

  // Multi photo upload (camisa mode)
  const handleMultiPhotoUpload = async (candidateId: string, file: File) => {
    setUploading(candidateId);
    const candidate = candidates.find(c => c.id === candidateId);
    const currentUrls: string[] = (candidate as any)?.photo_urls || [];
    const ext = file.name.split('.').pop();
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const path = `elections/${electionId}/${candidateId}_${uniqueId}.${ext}`;
    
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: 'Erro no upload', variant: 'destructive' });
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
    const newUrls = [...currentUrls, urlData.publicUrl];
    
    // Update photo_urls array and set first photo as photo_url fallback
    await supabase.from('election_candidates' as any).update({ 
      photo_urls: newUrls,
      photo_url: newUrls[0],
    } as any).eq('id', candidateId);
    
    setUploading(null);
    onRefresh();
  };

  const handleRemovePhoto = async (candidateId: string, photoIndex: number) => {
    const candidate = candidates.find(c => c.id === candidateId);
    const currentUrls: string[] = (candidate as any)?.photo_urls || [];
    const newUrls = currentUrls.filter((_, i) => i !== photoIndex);
    
    await supabase.from('election_candidates' as any).update({ 
      photo_urls: newUrls,
      photo_url: newUrls[0] || null,
    } as any).eq('id', candidateId);
    onRefresh();
  };

  const getPhotoUrls = (c: Candidate): string[] => {
    const urls = (c as any).photo_urls;
    if (Array.isArray(urls) && urls.length > 0) return urls;
    if (c.photo_url) return [c.photo_url];
    return [];
  };

  return (
    <div className="space-y-3">
      {!disabled && (
        <div className="flex gap-2">
          <Input
            placeholder={`Nome do ${label}`}
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

      <div className={`grid ${isCamisa ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-3 md:grid-cols-4'} gap-2`}>
        {candidates.map((c) => {
          const photos = getPhotoUrls(c);
          return (
            <div key={c.id} className="flex flex-col items-center gap-1.5 p-2 border rounded-lg">
              {/* Photo display */}
              <div className={`relative ${isCamisa ? 'w-full aspect-square' : 'w-16 h-16'} rounded-lg overflow-hidden bg-muted flex items-center justify-center`}>
                {photos.length > 0 ? (
                  <img src={photos[0]} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <UserCheck className={`${isCamisa ? 'h-10 w-10' : 'h-7 w-7'} text-muted-foreground`} />
                )}
                {isCamisa && photos.length > 1 && (
                  <Badge className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5">
                    {photos.length} fotos
                  </Badge>
                )}
              </div>

              {/* Photo thumbnails for camisa mode */}
              {isCamisa && !disabled && photos.length > 0 && (
                <div className="flex gap-1 flex-wrap justify-center">
                  {photos.map((url, i) => (
                    <div key={i} className="relative w-8 h-8 rounded overflow-hidden border group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemovePhoto(c.id, i)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

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
                        if (file) {
                          isCamisa 
                            ? handleMultiPhotoUpload(c.id, file)
                            : handleSinglePhotoUpload(c.id, file);
                        }
                      }}
                    />
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild disabled={uploading === c.id}>
                      <span>{isCamisa ? <ImagePlus className="h-3 w-3" /> : <Upload className="h-3 w-3" />}</span>
                    </Button>
                  </label>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {candidates.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum {label} cadastrado.</p>
      )}
    </div>
  );
}
