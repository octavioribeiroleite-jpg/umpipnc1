-- 1. Add type column to elections
ALTER TABLE public.elections
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'cargo';

UPDATE public.elections SET type = 'cargo' WHERE type IS NULL;

-- 2. Helper function: who can manage elections (admin, diretoria, pastor)
CREATE OR REPLACE FUNCTION public.can_manage_elections(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'diretoria', 'pastor')
  )
$$;

-- 3. Replace management policies on election tables
DROP POLICY IF EXISTS "Management can manage elections" ON public.elections;
CREATE POLICY "Management can manage elections"
ON public.elections FOR ALL
USING (public.can_manage_elections(auth.uid()))
WITH CHECK (public.can_manage_elections(auth.uid()));

DROP POLICY IF EXISTS "Management can manage attendance" ON public.election_attendance;
CREATE POLICY "Management can manage attendance"
ON public.election_attendance FOR ALL
USING (public.can_manage_elections(auth.uid()))
WITH CHECK (public.can_manage_elections(auth.uid()));

DROP POLICY IF EXISTS "Management can manage candidates" ON public.election_candidates;
CREATE POLICY "Management can manage candidates"
ON public.election_candidates FOR ALL
USING (public.can_manage_elections(auth.uid()))
WITH CHECK (public.can_manage_elections(auth.uid()));

DROP POLICY IF EXISTS "Management can manage devices" ON public.election_devices;
CREATE POLICY "Management can manage devices"
ON public.election_devices FOR ALL
USING (public.can_manage_elections(auth.uid()))
WITH CHECK (public.can_manage_elections(auth.uid()));

DROP POLICY IF EXISTS "Management can manage votes" ON public.election_votes;
CREATE POLICY "Management can manage votes"
ON public.election_votes FOR ALL
USING (public.can_manage_elections(auth.uid()))
WITH CHECK (public.can_manage_elections(auth.uid()));