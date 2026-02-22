
-- Create election_devices table for fixed ballot box registration
CREATE TABLE public.election_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  election_id uuid NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  label text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  activated boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique token
CREATE UNIQUE INDEX idx_election_devices_token ON public.election_devices(token);

-- Enable RLS
ALTER TABLE public.election_devices ENABLE ROW LEVEL SECURITY;

-- SELECT: viewable by authenticated and anon (needed for public vote page token validation)
CREATE POLICY "Devices viewable by anon"
ON public.election_devices
FOR SELECT
USING (true);

CREATE POLICY "Devices viewable by authenticated"
ON public.election_devices
FOR SELECT
USING (true);

-- Management can manage devices
CREATE POLICY "Management can manage devices"
ON public.election_devices
FOR ALL
USING (has_management_role(auth.uid()));
