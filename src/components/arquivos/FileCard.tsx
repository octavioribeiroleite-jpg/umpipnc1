import { Download, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileRecord } from '@/hooks/useFiles';

interface FileCardProps {
  file: FileRecord;
  onDownload: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  onView: (file: FileRecord) => void;
}

const categoryLabels: Record<string, string> = {
  comprovantes: 'Comprovante',
  atas: 'Ata',
  fotos: 'Foto',
  documentos: 'Documento',
  geral: 'Geral',
};

const categoryColors: Record<string, string> = {
  comprovantes: 'bg-success/10 text-success',
  atas: 'bg-info/10 text-info',
  fotos: 'bg-warning/10 text-warning',
  documentos: 'bg-primary/10 text-primary',
  geral: 'bg-muted text-muted-foreground',
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(type: string | null) {
  if (!type) return false;
  return type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('webp');
}

export function FileCard({ file, onDownload, onDelete, onView }: FileCardProps) {
  const isImage = isImageFile(file.type);
  const category = file.category || 'geral';

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group overflow-hidden"
      onClick={() => onView(file)}
    >
      {/* Image Preview */}
      {isImage && (
        <div className="aspect-[4/3] bg-muted overflow-hidden">
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <CardContent className="p-3 sm:p-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <Badge variant="secondary" className={`text-xs ${categoryColors[category] || categoryColors.geral}`}>
            {categoryLabels[category] || category}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon" aria-label={`Opções de ${file.name}`}
                className="shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(file); }}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); onView(file); }} className="min-h-12 w-full min-w-0 text-left text-base font-semibold [overflow-wrap:anywhere] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {file.name}
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-2 text-sm text-muted-foreground">
          {file.size != null && <><span>{formatFileSize(file.size)}</span><span aria-hidden="true">·</span></>}
          <time dateTime={file.created_at}>{new Date(file.created_at).toLocaleDateString('pt-BR')}</time>
        </div>
      </CardContent>
    </Card>
  );
}
