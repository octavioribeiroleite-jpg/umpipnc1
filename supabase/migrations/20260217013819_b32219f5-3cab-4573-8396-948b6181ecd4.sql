
-- Create pastor_feedback table
CREATE TABLE public.pastor_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  message text NOT NULL,
  response text,
  read boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  read_by uuid
);

ALTER TABLE public.pastor_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pastor can insert own feedback"
  ON public.pastor_feedback FOR INSERT
  WITH CHECK (auth.uid() = created_by AND has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Pastor can read own feedback"
  ON public.pastor_feedback FOR SELECT
  USING (auth.uid() = created_by AND has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Management can read all feedback"
  ON public.pastor_feedback FOR SELECT
  USING (has_management_role(auth.uid()));

CREATE POLICY "Management can update feedback"
  ON public.pastor_feedback FOR UPDATE
  USING (has_management_role(auth.uid()));

CREATE OR REPLACE FUNCTION public.has_pastor_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'pastor'
  )
$$;
