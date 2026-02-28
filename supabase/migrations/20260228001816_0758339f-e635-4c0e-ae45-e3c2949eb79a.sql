
CREATE TABLE public.study_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID REFERENCES public.societies(id),
  title TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL DEFAULT '',
  ai_summary TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society isolated SELECT study_notes"
ON public.study_notes FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_pastor_role(auth.uid())
  OR (society_id = get_user_society_id(auth.uid()))
);

CREATE POLICY "Society isolated management study_notes"
ON public.study_notes FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'diretoria'::app_role) AND society_id = get_user_society_id(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'diretoria'::app_role) AND society_id = get_user_society_id(auth.uid()))
);

CREATE TRIGGER update_study_notes_updated_at
BEFORE UPDATE ON public.study_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
