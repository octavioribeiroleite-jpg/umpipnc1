-- Add meeting_notes column for free-form text input
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS meeting_notes TEXT;