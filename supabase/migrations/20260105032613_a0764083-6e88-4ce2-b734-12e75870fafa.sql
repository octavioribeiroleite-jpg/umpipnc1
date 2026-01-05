-- Criar enums para status e origem de eventos
CREATE TYPE event_status AS ENUM ('confirmado', 'pendente', 'cancelado');
CREATE TYPE event_origin AS ENUM ('reuniao', 'manual');

-- Adicionar colunas à tabela events
ALTER TABLE public.events 
  ADD COLUMN status event_status NOT NULL DEFAULT 'confirmado',
  ADD COLUMN origem event_origin NOT NULL DEFAULT 'manual',
  ADD COLUMN reuniao_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Criar índice para buscar eventos por reunião
CREATE INDEX idx_events_reuniao_id ON public.events(reuniao_id);

-- Criar índice para buscar eventos por status
CREATE INDEX idx_events_status ON public.events(status);