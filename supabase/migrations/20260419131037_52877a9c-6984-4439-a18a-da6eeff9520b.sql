
ALTER TABLE public.elections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.elections;

DELETE FROM public.elections WHERE id = '7e98208f-3d8b-421d-bc52-e153f03e0b08';
