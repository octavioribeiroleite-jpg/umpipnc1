import { FileText, Image, Download, Trash2, MoreVertical, File } from 'lucide-react';
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

function getFileIcon(type: string | null) {
  if (!type) return <File className="h-6 w-6 text-muted-foreground" />;
  
  if (type.includes('pdf')) {
    return <FileText className="h-6 w-6 text-destructive" />;
  }
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('webp')) {
    return <Image className="h-6 w-6 text-info" />;
  }
  return <File className="h-6 w-6 text-muted-foreground" />;
}

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
        <div className="aspect-video bg-muted overflow-hidden">
          <img 
            src={file.url} 
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      
      <CardContent className={isImage ? 'p-3' : 'p-4'}>
        <div className="flex items-start gap-3">
          {!isImage && (
            <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-muted shrink-0">
              {getFileIcon(file.type)}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm min-w-0 whitespace-normal break-words">{file.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant="secondary" 
                className={`text-xs ${categoryColors[category] || categoryColors.geral}`}
              >
                {categoryLabels[category] || category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(file.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
      </CardContent>
    </Card>
  );
}
