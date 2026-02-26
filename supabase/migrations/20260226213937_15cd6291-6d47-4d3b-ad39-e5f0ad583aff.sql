
CREATE OR REPLACE FUNCTION public.invalidate_pastor_cache()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.pastor_summaries SET invalidated = true WHERE invalidated = false;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
