import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, Image, Download, Search, Filter } from 'lucide-react';

const mockFiles = [
  { id: '1', name: 'Comprovante-Janeiro.pdf', type: 'pdf', date: '2024-01-14', size: '245 KB' },
  { id: '2', name: 'Foto-Reuniao.jpg', type: 'image', date: '2024-01-12', size: '1.2 MB' },
  { id: '3', name: 'Ata-Reuniao-01.pdf', type: 'pdf', date: '2024-01-10', size: '156 KB' },
  { id: '4', name: 'Recibo-Material.pdf', type: 'pdf', date: '2024-01-08', size: '89 KB' },
  { id: '5', name: 'Banner-Evento.png', type: 'image', date: '2024-01-05', size: '2.4 MB' },
];

function FileCard({ file }: { file: (typeof mockFiles)[0] }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              file.type === 'pdf' ? 'bg-destructive/10' : 'bg-info/10'
            }`}
          >
            {file.type === 'pdf' ? (
              <FileText className={`h-6 w-6 ${file.type === 'pdf' ? 'text-destructive' : 'text-info'}`} />
            ) : (
              <Image className="h-6 w-6 text-info" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(file.date).toLocaleDateString('pt-BR')} • {file.size}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Arquivos() {
  return (
    <AppLayout>
      <PageHeader
        title="Arquivos"
        description="Gerencie comprovantes e anexos"
        action={
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar arquivos..." className="pl-10" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="image">Imagens</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="comprovantes">Comprovantes</SelectItem>
            <SelectItem value="atas">Atas</SelectItem>
            <SelectItem value="fotos">Fotos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockFiles.map((file) => (
          <FileCard key={file.id} file={file} />
        ))}
      </div>
    </AppLayout>
  );
}
