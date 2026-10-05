import { useId, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, UserCheck, Loader2, ImagePlus, X } from 'lucide-react';
import { ImageCropDialog } from './ImageCropDialog';

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
  const nameId = useId();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const addInFlight = useRef(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<string | null>(null);
  const { toast } = useToast();
  const isCamisa = type === 'camisa';
  const label = isCamisa ? 'modelo' : 'candidato';

  const openCropper = (candidateId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropTarget(candidateId);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedFile = async (file: File): Promise<boolean> => {
    if (!cropTarget) return false;
    const saved = isCamisa ? await handleMultiPhotoUpload(cropTarget, file) : await handleSinglePhotoUpload(cropTarget, file);
    if (saved) { setCropTarget(null); setCropSrc(null); }
    return saved;
  };

  const handleAdd = async () => {
    if (disabled || addInFlight.current || !name.trim()) return;
    addInFlight.current = true;
    setAdding(true);
    try {
      const { error } = await supabase.from('election_candidates' as any).insert({ election_id: electionId, name: name.trim(), display_order: candidates.length } as any);
      if (error) throw error;
      setName('');
      onRefresh();
    } catch {
      toast({ title: `Não foi possível adicionar o ${label}`, description: 'O nome foi mantido. Tente novamente.', variant: 'destructive' });
    } finally { addInFlight.current = false; setAdding(false); }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase.from('election_candidates' as any).delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch { toast({ title: `Não foi possível remover o ${label}`, description: 'Tente novamente.', variant: 'destructive' }); }
  };

  const uploadPhoto = async (candidateId: string, file: File, multiple: boolean): Promise<boolean> => {
    setUploading(candidateId);
    try {
      const ext = file.name.split('.').pop();
      const suffix = multiple ? `_${crypto.randomUUID().slice(0, 8)}` : '';
      const path = `${electionId}/${candidateId}${suffix}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('election-photos').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('election-photos').getPublicUrl(path);
      const urls = multiple ? [...getPhotoUrls(candidates.find(candidate => candidate.id === candidateId) || { id: candidateId, name: '', photo_url: null, display_order: 0 }), urlData.publicUrl] : [urlData.publicUrl];
      const { error: updateError } = await supabase.from('election_candidates' as any).update(multiple ? { photo_urls: urls, photo_url: urls[0] } : { photo_url: urls[0] }).eq('id', candidateId);
      if (updateError) throw updateError;
      onRefresh();
      return true;
    } catch {
      toast({ title: 'Não foi possível salvar a foto', description: 'A imagem foi mantida para tentar novamente.', variant: 'destructive' });
      return false;
    } finally { setUploading(null); }
  };

  const handleSinglePhotoUpload = (candidateId: string, file: File) => uploadPhoto(candidateId, file, false);
  const handleMultiPhotoUpload = (candidateId: string, file: File) => uploadPhoto(candidateId, file, true);

  const handleRemovePhoto = async (candidateId: string, photoIndex: number) => {
    const candidate = candidates.find(candidate => candidate.id === candidateId);
    if (!candidate) return;
    const newUrls = getPhotoUrls(candidate).filter((_, index) => index !== photoIndex);
    try {
      const { error } = await supabase.from('election_candidates' as any).update({ photo_urls: newUrls, photo_url: newUrls[0] || null }).eq('id', candidateId);
      if (error) throw error;
      onRefresh();
    } catch { toast({ title: 'Não foi possível remover a foto', description: 'Tente novamente.', variant: 'destructive' }); }
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
        <div className="space-y-2">
          <Label htmlFor={nameId}>Nome do {label}</Label>
          <div className="flex gap-2">
          <Input
            id={nameId}
            disabled={adding}
            aria-label={`Nome do ${label}`} placeholder={`Nome do ${label}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="min-h-[48px] min-w-0 text-base"
          />
          <Button size="icon" className="min-h-[48px] min-w-[48px] shrink-0" aria-label={`Adicionar ${label}`} disabled={adding || !name.trim()} onClick={handleAdd}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
          </div>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-3">
        {candidates.map((c) => {
          const photos = getPhotoUrls(c);
          return (
            <div key={c.id} className="flex flex-col items-center min-w-0 gap-4 p-[16px] border border-border bg-card shadow-sm rounded-2xl">
              {/* Photo display */}
              <div className="relative w-full aspect-square max-h-[240px] rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                {photos.length > 0 ? (
                  <img src={photos[0]} alt={c.name} className="w-full h-full object-contain" />
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
                    <div key={i} className="relative h-[48px] w-[48px] rounded-lg overflow-hidden border group">
                      <img src={url} alt="" className="w-full h-full object-contain" />
                      <button
                        onClick={() => handleRemovePhoto(c.id, i)}
                        aria-label={`Remover foto ${i + 1} de ${c.name}`}
                        className="absolute inset-0 bg-black/50 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <span className="w-full [overflow-wrap:anywhere] text-[1.125rem] font-semibold text-center leading-snug">{c.name}</span>
              
              {!disabled && (
                <div className="mt-auto flex flex-wrap justify-center gap-2">
                  <label className="cursor-pointer rounded-lg" role="button" aria-label={`Enviar foto de ${c.name}`} tabIndex={uploading === c.id ? -1 : 0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.querySelector('input')?.click(); } }}>
                    <input
                      type="file"
                      disabled={uploading === c.id}
                      aria-label={`Enviar foto de ${c.name}`}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          openCropper(c.id, file);
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button variant="outline" size="icon" className="min-h-[48px] min-w-[48px]" aria-label={`Adicionar foto de ${c.name}`} asChild disabled={uploading === c.id}>
                      <span>{isCamisa ? <ImagePlus className="h-3 w-3" /> : <Upload className="h-3 w-3" />}</span>
                    </Button>
                  </label>
                  <Button variant="ghost" size="icon" className="min-h-[48px] min-w-[48px] text-destructive" aria-label={`Remover ${c.name}`} onClick={() => handleRemove(c.id)}>
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

      <ImageCropDialog
        open={!!cropSrc}
        onOpenChange={(o) => { if (!o) { setCropSrc(null); setCropTarget(null); } }}
        imageSrc={cropSrc}
        aspect={1}
        onCropped={handleCroppedFile}
      />
    </div>
  );
}
