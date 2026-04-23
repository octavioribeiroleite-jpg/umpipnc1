ALTER TABLE public.elections
ADD COLUMN IF NOT EXISTS seats_count integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_choices_per_ballot integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_round integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS majority_rule text NOT NULL DEFAULT 'simple';

ALTER TABLE public.election_votes
ADD COLUMN IF NOT EXISTS ballot_id uuid NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS round_number integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_blank boolean NOT NULL DEFAULT false;

ALTER TABLE public.election_votes
ALTER COLUMN candidate_id DROP NOT NULL;

UPDATE public.elections
SET
  seats_count = GREATEST(seats_count, 1),
  max_choices_per_ballot = GREATEST(max_choices_per_ballot, 1),
  current_round = GREATEST(current_round, 1),
  majority_rule = COALESCE(NULLIF(majority_rule, ''), 'simple');

UPDATE public.election_votes
SET ballot_id = gen_random_uuid()
WHERE ballot_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_election_votes_election_round ON public.election_votes (election_id, round_number);
CREATE INDEX IF NOT EXISTS idx_election_votes_ballot ON public.election_votes (ballot_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_candidate_round ON public.election_votes (candidate_id, round_number);