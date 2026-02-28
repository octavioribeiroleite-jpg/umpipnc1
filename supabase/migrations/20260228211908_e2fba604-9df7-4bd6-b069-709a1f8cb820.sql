
-- Update RLS policy to remove login keys from anon-visible list
DROP POLICY IF EXISTS "Anon can view public settings" ON public.settings;

CREATE POLICY "Anon can view public settings"
ON public.settings
FOR SELECT
USING (key = ANY (ARRAY['pix_key'::text, 'pix_key_type'::text, 'pix_beneficiary'::text, 'pix_instructions'::text, 'secretaria_password'::text, 'secretaria_admin_password'::text, 'secretaria_professor_password'::text]));
