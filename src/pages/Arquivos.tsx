import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { FAB } from '@/components/ui/fab';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, FileX } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFiles, useDeleteFile, FileFilters as FileFiltersType, FileRecord } from '@/hooks/useFiles';
import { FileCard } from '@/components/arquivos/FileCard';
import { FileFilters } from '@/components/arquivos/FileFilters';
import { UploadDialog } from '@/components/arquivos/UploadDialog';
import { FileDetailsDialog } from '@/components/arquivos/FileDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';

export default function Arquivos() {
  const isMobile = useIsMobile();
  const { isManagement } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filters, setFilters] = useState<FileFiltersType>({
    search: '',
    type: 'all',
    category: 'all',
    sortBy: 'newest',
  });

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search || '');
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const queryFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch,
  }), [filters, debouncedSearch]);

  const { data: files, isLoading } = useFiles(queryFilters);
  const deleteMutation = useDeleteFile();

  const handleDownload = (file: FileRecord) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (file: FileRecord) => {
    deleteMutation.mutate({ id: file.id, url: file.url });
  };

  const handleView = (file: FileRecord) => {
    setSelectedFile(file);
    setDetailsOpen(true);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Arquivos"
        description="Gerencie comprovantes e anexos"
        action={
          isManagement && !isMobile ? (
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <FileFilters filters={filters} onFiltersChange={setFilters} />

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!files || files.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileX className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum arquivo encontrado</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            {filters.search || filters.category !== 'all' || filters.type !== 'all'
              ? 'Tente ajustar os filtros para encontrar o que procura.'
              : 'Comece enviando seu primeiro arquivo clicando no botão acima.'}
          </p>
          {isManagement && !filters.search && filters.category === 'all' && filters.type === 'all' && (
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Enviar arquivo
            </Button>
          )}
        </div>
      )}

      {/* Files Grid */}
      {!isLoading && files && files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))}
        </div>
      )}

      {/* FAB for mobile */}
      {isManagement && isMobile && (
        <FAB onClick={() => setUploadOpen(true)} icon={<Upload className="h-5 w-5" />} />
      )}

      {/* Upload Dialog */}
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      {/* File Details Dialog */}
      <FileDetailsDialog
        file={selectedFile}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />
    </AppLayout>
  );
}
