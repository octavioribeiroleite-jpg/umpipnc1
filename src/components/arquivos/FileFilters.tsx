import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileFilters as FileFiltersType } from '@/hooks/useFiles';

interface FileFiltersProps {
  filters: FileFiltersType;
  onFiltersChange: (filters: FileFiltersType) => void;
}

export function FileFilters({ filters, onFiltersChange }: FileFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar arquivos..." 
          className="pl-10"
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        />
      </div>
      
      <Select 
        value={filters.type || 'all'} 
        onValueChange={(value) => onFiltersChange({ ...filters, type: value as FileFiltersType['type'] })}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pdf">PDF</SelectItem>
          <SelectItem value="image">Imagens</SelectItem>
        </SelectContent>
      </Select>
      
      <Select 
        value={filters.category || 'all'} 
        onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="comprovantes">Comprovantes</SelectItem>
          <SelectItem value="atas">Atas</SelectItem>
          <SelectItem value="fotos">Fotos</SelectItem>
          <SelectItem value="documentos">Documentos</SelectItem>
          <SelectItem value="geral">Geral</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.sortBy || 'newest'} 
        onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value as FileFiltersType['sortBy'] })}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Mais recentes</SelectItem>
          <SelectItem value="oldest">Mais antigos</SelectItem>
          <SelectItem value="name">Nome</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
