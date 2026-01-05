-- Adicionar categoria para organizar arquivos
ALTER TABLE files ADD COLUMN IF NOT EXISTS category text DEFAULT 'geral';

-- Criar índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);

-- Criar índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);