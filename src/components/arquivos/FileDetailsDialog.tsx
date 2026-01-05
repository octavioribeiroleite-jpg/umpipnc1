import { Download, Trash2, ExternalLink, Copy } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { FileRecord } from '@/hooks/useFiles';
import { useState } from 'react';

interface FileDetailsDialogProps {
  file: FileRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
}

const categoryLabels: Record<string, string> = {
  comprovantes: 'Comprovante',
  atas: 'Ata',
  fotos: 'Foto',
  documentos: 'Documento',
  geral: 'Geral',
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return 'Desconhecido';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(type: string | null) {
  if (!type) return false;
  return type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('webp');
}

export function FileDetailsDialog({ file, open, onOpenChange, onDownload, onDelete }: FileDetailsDialogProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!file) return null;

  const isImage = isImageFile(file.type);
  const category = file.category || 'geral';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(file.url);
    toast({
      title: 'URL copiada',
      description: 'O link do arquivo foi copiado para a área de transferência.',
    });
  };

  const handleDelete = () => {
    onDelete(file);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const content = (
    <div className="space-y-4">
      {/* Image Preview */}
      {isImage && (
        <div className="rounded-lg overflow-hidden bg-muted">
          <img 
            src={file.url} 
            alt={file.name}
            className="w-full max-h-[300px] object-contain"
          />
        </div>
      )}

      {/* File Info */}
      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Nome</p>
          <p className="font-medium break-all">{file.name}</p>
        </div>

        <div className="flex gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Categoria</p>
            <Badge variant="secondary" className="mt-1">
              {categoryLabels[category] || category}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tamanho</p>
            <p className="font-medium">{formatFileSize(file.size)}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Data de upload</p>
          <p className="font-medium">
            {new Date(file.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {file.type && (
          <div>
            <p className="text-sm text-muted-foreground">Tipo</p>
            <p className="font-medium">{file.type}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button onClick={() => onDownload(file)} className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" onClick={() => window.open(file.url, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir
        </Button>
        <Button variant="outline" onClick={handleCopyUrl}>
          <Copy className="h-4 w-4 mr-2" />
          Copiar URL
        </Button>
        <Button 
          variant="destructive" 
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </Button>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Detalhes do arquivo</DrawerTitle>
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do arquivo</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
