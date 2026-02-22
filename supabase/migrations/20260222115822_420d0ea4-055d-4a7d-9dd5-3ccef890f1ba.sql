
ALTER TABLE public.elections ADD COLUMN voting_mode text NOT NULL DEFAULT 'shared';
ALTER TABLE public.election_votes ADD COLUMN device_id text;
