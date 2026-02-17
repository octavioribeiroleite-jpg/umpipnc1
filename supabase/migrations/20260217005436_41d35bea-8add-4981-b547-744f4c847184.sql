
CREATE TABLE public.plenaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  quorum_required integer NOT NULL DEFAULT 50
);

ALTER TABLE public.plenaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plenaries viewable by authenticated"
  ON public.plenaries FOR SELECT USING (true);
CREATE POLICY "Management can manage plenaries"
  ON public.plenaries FOR ALL USING (has_management_role(auth.uid()));

CREATE TABLE public.plenary_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plenary_id uuid NOT NULL REFERENCES public.plenaries(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT false,
  marked_at timestamptz,
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plenary_id, member_id)
);

ALTER TABLE public.plenary_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendance viewable by authenticated"
  ON public.plenary_attendance FOR SELECT USING (true);
CREATE POLICY "Management can manage attendance"
  ON public.plenary_attendance FOR ALL USING (has_management_role(auth.uid()));
