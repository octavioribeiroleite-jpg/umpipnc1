-- Modificar o trigger handle_new_user para NÃO atribuir cargo automaticamente
-- Novos usuários precisarão de aprovação do admin

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email
    );
    -- NÃO atribuir cargo automaticamente
    -- O admin deve aprovar manualmente cada novo usuário
    RETURN NEW;
END;
$$;