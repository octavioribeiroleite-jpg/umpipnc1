-- Qualify the outer object path; inner societies/elections also have a name column.
alter policy ipnc_receipts_insert on storage.objects with check (
  bucket_id='receipts' and objects.name !~ '(^|/)[.][.](/|$)' and objects.name !~ '^/'
  and split_part(objects.name,'/',2) ~ '^[0-9]{4}$'
  and array_length(string_to_array(objects.name,'/'),1)>=4
  and (
    exists(select 1 from public.societies s where s.id::text=split_part(objects.name,'/',1) and ipnc_private.can_manage_society(s.id))
    or ipnc_private.own_member_receipt_path(objects.name)
  )
);
alter policy ipnc_election_photos_insert on storage.objects with check (
  bucket_id='election-photos' and exists(select 1 from public.elections e where e.id::text=split_part(objects.name,'/',1) and ipnc_private.can_manage_election(e.id))
);
alter policy ipnc_election_photos_update on storage.objects using (
  bucket_id='election-photos' and exists(select 1 from public.elections e where e.id::text=split_part(objects.name,'/',1) and ipnc_private.can_manage_election(e.id))
) with check (
  bucket_id='election-photos' and exists(select 1 from public.elections e where e.id::text=split_part(objects.name,'/',1) and ipnc_private.can_manage_election(e.id))
);
alter policy ipnc_election_photos_delete on storage.objects using (
  bucket_id='election-photos' and exists(select 1 from public.elections e where e.id::text=split_part(objects.name,'/',1) and ipnc_private.can_manage_election(e.id))
);
