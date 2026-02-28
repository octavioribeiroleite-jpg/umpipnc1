
-- 1. Remove plain_password column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS plain_password;

-- 2. Update handle_new_user trigger to not save plain_password
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$function$;

-- 3. Make receipts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- 4. Storage policies for receipts bucket (authenticated users only)
-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Management can delete receipts" ON storage.objects;

-- Allow authenticated users to upload receipts
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow authenticated users to view receipts
CREATE POLICY "Authenticated users can view receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts');

-- Allow management to delete receipts
CREATE POLICY "Management can delete receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts' AND has_management_role(auth.uid()));
