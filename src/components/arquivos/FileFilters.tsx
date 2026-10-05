import { useId } from 'react';
import { Label } from '@/components/ui/label';
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
  const id = useId();
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 mb-6 sm:grid-cols-2 xl:grid-cols-4">
      <div className="min-w-0 space-y-2">
        <Label htmlFor={`${id}-search`}>Buscar arquivos</Label>
        <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id={`${id}-search`}
          placeholder="Buscar arquivos..." 
          className="pl-10"
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        />
        </div>
      </div>
      
      <div className="min-w-0 space-y-2">
      <Label htmlFor={`${id}-type`}>Tipo</Label>
      <Select 
        value={filters.type || 'all'} 
        onValueChange={(value) => onFiltersChange({ ...filters, type: value as FileFiltersType['type'] })}
      >
        <SelectTrigger id={`${id}-type`} className="w-full">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pdf">PDF</SelectItem>
          <SelectItem value="image">Imagens</SelectItem>
        </SelectContent>
      </Select>
      </div>
      
      <div className="min-w-0 space-y-2">
      <Label htmlFor={`${id}-category`}>Categoria</Label>
      <Select 
        value={filters.category || 'all'} 
        onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
      >
        <SelectTrigger id={`${id}-category`} className="w-full">
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
      </div>

      <div className="min-w-0 space-y-2">
      <Label htmlFor={`${id}-sortBy`}>Ordenar por</Label>
      <Select 
        value={filters.sortBy || 'newest'} 
        onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value as FileFiltersType['sortBy'] })}
      >
        <SelectTrigger id={`${id}-sortBy`} className="w-full">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Mais recentes</SelectItem>
          <SelectItem value="oldest">Mais antigos</SelectItem>
          <SelectItem value="name">Nome</SelectItem>
        </SelectContent>
      </Select>
      </div>
    </div>
  );
}
