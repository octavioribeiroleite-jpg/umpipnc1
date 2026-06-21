GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebd_class_passwords TO authenticated;
GRANT ALL ON public.ebd_class_passwords TO service_role;

GRANT SELECT, INSERT ON public.ebd_class_logins TO authenticated;
GRANT ALL ON public.ebd_class_logins TO service_role;