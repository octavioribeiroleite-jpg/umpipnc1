import { useState, useCallback } from 'react';
import { Upload, X, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import { useUploadFile } from '@/hooks/useFiles';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { value: 'comprovantes', label: 'Comprovantes' },
  { value: 'atas', label: 'Atas' },
  { value: 'fotos', label: 'Fotos' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'geral', label: 'Geral' },
];

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('geral');
  const [isDragging, setIsDragging] = useState(false);
  const uploadMutation = useUploadFile();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploadMutation.isPending) return;
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setError(''); setFile(droppedFile);
    }
  }, [uploadMutation.isPending]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadMutation.isPending) return;
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setError(''); setFile(selectedFile);
    }
  }, [uploadMutation.isPending]);

  const handleUpload = async () => {
    if (!file || uploadMutation.isPending) return;
    setError('');
    try {
      await uploadMutation.mutateAsync({ file, category });
      setFile(null); setCategory('geral'); onOpenChange(false);
    } catch { setError('O envio não foi confirmado. O arquivo continua selecionado para você conferir e tentar novamente.'); }
  };

  const handleClose = () => {
    if (uploadMutation.isPending) return;
    setError(''); setFile(null);
    setCategory('geral');
    onOpenChange(false);
  };

  const content = (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${file ? 'bg-muted/50' : ''}
        `}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileIcon className="h-8 w-8 text-muted-foreground" />
            <div className="min-w-0 flex-1 text-left">
              <p className="font-medium [overflow-wrap:anywhere]">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon" aria-label="Remover arquivo selecionado"
              disabled={uploadMutation.isPending}
              onClick={() => setFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Arraste um arquivo ou clique para selecionar
            </p>
            <input
              type="file"
              id="file-upload"
              className="peer sr-only"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <Button variant="outline" asChild>
              <label htmlFor="file-upload" className="cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                Selecionar arquivo
              </label>
            </Button>
          </>
        )}
      </div>

      {/* Category Select */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoria</Label>
        <Select value={category} onValueChange={setCategory} disabled={uploadMutation.isPending}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p role={error ? "alert" : undefined} className="min-h-6 text-base text-destructive">{error}</p>
      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" disabled={uploadMutation.isPending} onClick={handleClose}>
          Cancelar
        </Button>
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={value => { if (!uploadMutation.isPending) { if (!value) handleClose(); else onOpenChange(value); } }}>
      <DialogContent size="form">
        <DialogHeader>
          <DialogTitle>Enviar arquivo</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
