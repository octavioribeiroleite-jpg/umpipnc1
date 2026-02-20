
-- 1. elections table
CREATE TABLE public.elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'finished')),
  total_present integer NOT NULL DEFAULT 0,
  society_id uuid REFERENCES public.societies(id),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elections viewable by authenticated" ON public.elections FOR SELECT USING (true);
CREATE POLICY "Elections viewable by anon" ON public.elections FOR SELECT TO anon USING (true);
CREATE POLICY "Management can manage elections" ON public.elections FOR ALL USING (has_management_role(auth.uid()));

-- 2. election_attendance table
CREATE TABLE public.election_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  name text NOT NULL,
  present boolean NOT NULL DEFAULT false
);

ALTER TABLE public.election_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendance viewable by authenticated" ON public.election_attendance FOR SELECT USING (true);
CREATE POLICY "Management can manage attendance" ON public.election_attendance FOR ALL USING (has_management_role(auth.uid()));

-- 3. election_candidates table
CREATE TABLE public.election_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  name text NOT NULL,
  photo_url text,
  display_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.election_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates viewable by authenticated" ON public.election_candidates FOR SELECT USING (true);
CREATE POLICY "Candidates viewable by anon" ON public.election_candidates FOR SELECT TO anon USING (true);
CREATE POLICY "Management can manage candidates" ON public.election_candidates FOR ALL USING (has_management_role(auth.uid()));

-- 4. election_votes table (anonymous, no voter identification)
CREATE TABLE public.election_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.election_candidates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.election_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes viewable by authenticated" ON public.election_votes FOR SELECT USING (true);
CREATE POLICY "Votes viewable by anon" ON public.election_votes FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert votes" ON public.election_votes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Management can manage votes" ON public.election_votes FOR ALL USING (has_management_role(auth.uid()));

-- Enable realtime for vote counting
ALTER PUBLICATION supabase_realtime ADD TABLE public.election_votes;
