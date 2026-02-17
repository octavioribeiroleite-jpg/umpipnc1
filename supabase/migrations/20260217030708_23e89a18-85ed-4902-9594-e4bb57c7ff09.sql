ALTER TABLE public.profiles ADD COLUMN society_id uuid REFERENCES public.societies(id);

CREATE INDEX idx_profiles_society_id ON public.profiles(society_id);