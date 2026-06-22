-- Repair service accounts that already existed before society/role synchronization.
-- This preserves the current access model: each diretoria account keeps full access
-- to its own society, while pastor keeps the pastor role.

DO $$
DECLARE
  service_user RECORD;
  service_slug TEXT;
  target_society_id UUID;
  target_society_name TEXT;
  target_role public.app_role;
  target_name TEXT;
BEGIN
  FOR service_user IN
    SELECT id, email
    FROM auth.users
    WHERE email LIKE 'diretoria-%@ipnc.local'
  LOOP
    service_slug := regexp_replace(service_user.email, '^diretoria-(.+)@ipnc\.local$', '\1');
    target_society_id := NULL;
    target_society_name := NULL;

    IF service_slug = 'pastor' THEN
      target_role := 'pastor';
      target_name := 'Pastor';
    ELSE
      SELECT id, name
      INTO target_society_id, target_society_name
      FROM public.societies
      WHERE slug = service_slug
      LIMIT 1;

      IF target_society_id IS NULL THEN
        CONTINUE;
      END IF;

      target_role := 'diretoria';
      target_name := 'Diretoria ' || target_society_name;
    END IF;

    UPDATE public.profiles
    SET
      full_name = target_name,
      email = service_user.email,
      username = 'diretoria-' || service_slug,
      society_id = target_society_id,
      active = true,
      updated_at = now()
    WHERE user_id = service_user.id;

    IF NOT FOUND THEN
      INSERT INTO public.profiles (
        user_id,
        full_name,
        email,
        username,
        society_id,
        active
      ) VALUES (
        service_user.id,
        target_name,
        service_user.email,
        'diretoria-' || service_slug,
        target_society_id,
        true
      );
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (service_user.id, target_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END
$$;
