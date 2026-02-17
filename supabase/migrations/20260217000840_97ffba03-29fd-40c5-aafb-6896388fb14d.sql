
-- Add username and plain_password columns to profiles
ALTER TABLE public.profiles ADD COLUMN username text;
ALTER TABLE public.profiles ADD COLUMN plain_password text;

-- Set username from existing emails (extract part before @)
UPDATE public.profiles SET username = split_part(email, '@', 1) WHERE username IS NULL;

-- Make username NOT NULL and UNIQUE after populating
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX idx_profiles_username ON public.profiles (username);

-- Update handle_new_user trigger to accept username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, username, plain_password)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data ->> 'plain_password'
    );
    RETURN NEW;
END;
$function$;
