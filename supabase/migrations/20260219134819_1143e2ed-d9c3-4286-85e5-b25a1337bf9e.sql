
-- 1. Add society_id column to events
ALTER TABLE public.events ADD COLUMN society_id uuid REFERENCES public.societies(id);

-- 2. Backfill existing events based on color mapping
UPDATE public.events SET society_id = 'a8432474-7803-466f-9ceb-d49227fa555b' WHERE color = '#3b82f6'; -- UMP
UPDATE public.events SET society_id = 'aebcf3b2-e770-4e17-b2db-fd2eae59d0d5' WHERE color = '#ec4899'; -- SAF
UPDATE public.events SET society_id = '290efdc8-b1d8-4d69-85d1-8296e6f7e7ce' WHERE color = '#10b981'; -- UPH
UPDATE public.events SET society_id = '801d599e-422d-405b-a854-fdf93fb7bc11' WHERE color = '#f97316'; -- UPA
UPDATE public.events SET society_id = '72d1a5fa-cbbd-4950-9068-6a19c3270274' WHERE color = '#8b5cf6'; -- UCP
-- Events with #6b7280 (IPNC/geral) remain NULL

-- 3. Create helper function to check if user belongs to same society as event
CREATE OR REPLACE FUNCTION public.is_event_society_member(_user_id uuid, _event_society_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.user_id = _user_id
      AND ur.role = 'diretoria'
      AND p.society_id = _event_society_id
  )
$$;

-- 4. Drop existing management-only policy
DROP POLICY IF EXISTS "Management can manage events" ON public.events;

-- 5. Create granular RLS policies (PERMISSIVE)

-- Admin can do everything
CREATE POLICY "Admins can manage all events"
ON public.events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Diretoria can INSERT events for their own society
CREATE POLICY "Diretoria can insert own society events"
ON public.events
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'diretoria'::app_role)
  AND (
    society_id IS NULL
    OR is_event_society_member(auth.uid(), society_id)
  )
);

-- Diretoria can UPDATE events of their own society
CREATE POLICY "Diretoria can update own society events"
ON public.events
FOR UPDATE
USING (
  has_role(auth.uid(), 'diretoria'::app_role)
  AND is_event_society_member(auth.uid(), society_id)
)
WITH CHECK (
  has_role(auth.uid(), 'diretoria'::app_role)
  AND is_event_society_member(auth.uid(), society_id)
);

-- Diretoria can DELETE events of their own society
CREATE POLICY "Diretoria can delete own society events"
ON public.events
FOR DELETE
USING (
  has_role(auth.uid(), 'diretoria'::app_role)
  AND is_event_society_member(auth.uid(), society_id)
);
