begin;

-- Anonymous readers must not invoke the private role helper, whose EXECUTE
-- grant is deliberately restricted to authenticated sessions in production.
-- Keep confirmed public reads separate from administrator/manager visibility.
alter policy treasury_entries_visible on public.treasury_entries to authenticated;
create policy treasury_entries_public_confirmed on public.treasury_entries
  for select to anon using (status = 'confirmed');

notify pgrst, 'reload schema';
commit;
