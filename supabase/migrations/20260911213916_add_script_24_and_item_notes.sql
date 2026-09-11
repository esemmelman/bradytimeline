-- Preserve existing rows and progress while inserting the new script row.
do $$
declare previous_order integer; following_item record;
begin
  if not exists (select 1 from public.brady_status_items_v1 where item_key = 'script-24') then
    select sort_order into strict previous_order from public.brady_status_items_v1 where item_key = 'script-23';
    for following_item in select item_key from public.brady_status_items_v1 where sort_order > previous_order order by sort_order desc loop
      update public.brady_status_items_v1 set sort_order = sort_order + 1 where item_key = following_item.item_key;
    end loop;
    insert into public.brady_status_items_v1 (item_key, label, sort_order)
      values ('script-24', 'Script - 24', previous_order + 1);
  end if;
end $$;

create table public.brady_status_notes_v1 (
  item_key text primary key references public.brady_status_items_v1(item_key) on delete cascade,
  body text not null default ''
);
alter table public.brady_status_notes_v1 enable row level security;
revoke all on public.brady_status_notes_v1 from public, anon, authenticated;
grant select, insert, update on public.brady_status_notes_v1 to authenticated;

do $$
declare owner_id uuid;
begin
  select id into strict owner_id from auth.users where email = 'esemmoc@gmail.com';
  execute format('create policy "Owner read" on public.brady_status_notes_v1 for select to authenticated using ((select auth.uid()) = %L::uuid)', owner_id);
  execute format('create policy "Owner insert" on public.brady_status_notes_v1 for insert to authenticated with check ((select auth.uid()) = %L::uuid)', owner_id);
  execute format('create policy "Owner update" on public.brady_status_notes_v1 for update to authenticated using ((select auth.uid()) = %L::uuid) with check ((select auth.uid()) = %L::uuid)', owner_id, owner_id);
end $$;
