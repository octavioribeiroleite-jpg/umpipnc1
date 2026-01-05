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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    await uploadMutation.mutateAsync({ file, category });
    setFile(null);
    setCategory('geral');
    onOpenChange(false);
  };

  const handleClose = () => {
    setFile(null);
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
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${file ? 'bg-muted/50' : ''}
        `}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileIcon className="h-8 w-8 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium truncate max-w-[200px]">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
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
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <Button variant="outline" asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                Selecionar arquivo
              </label>
            </Button>
          </>
        )}
      </div>

      {/* Category Select */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoria</Label>
        <Select value={category} onValueChange={setCategory}>
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

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleClose}>
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

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Enviar arquivo</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar arquivo</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
