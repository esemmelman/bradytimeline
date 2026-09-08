create table public.brady_status_items_v1 (like public.mitzvah_status_items_v1 including all);
create table public.brady_status_dates_v1 (like public.mitzvah_status_dates_v1 including all);
create table public.brady_status_cells_v1 (
 item_key text not null references public.brady_status_items_v1(item_key) on delete cascade,
 date_key text not null references public.brady_status_dates_v1(date_key) on delete cascade,
 status text not null check (status in ('red','yellow','green')),
 primary key (item_key,date_key)
);
create index brady_status_cells_date_idx on public.brady_status_cells_v1(date_key);
insert into public.brady_status_items_v1 select * from public.mitzvah_status_items_v1;
insert into public.brady_status_dates_v1 select * from public.mitzvah_status_dates_v1 where date_key between '08-24' and '12-12';
insert into public.brady_status_dates_v1 values ('12-12','12/12',17);
alter table public.brady_status_items_v1 enable row level security;
alter table public.brady_status_dates_v1 enable row level security;
alter table public.brady_status_cells_v1 enable row level security;
revoke all on public.brady_status_items_v1,public.brady_status_dates_v1,public.brady_status_cells_v1 from anon,authenticated;
grant select on public.brady_status_items_v1,public.brady_status_dates_v1,public.brady_status_cells_v1 to anon,authenticated;
grant insert,update,delete on public.brady_status_cells_v1 to authenticated;
create policy "Public read" on public.brady_status_items_v1 for select to anon,authenticated using (true);
create policy "Public read" on public.brady_status_dates_v1 for select to anon,authenticated using (true);
create policy "Public read" on public.brady_status_cells_v1 for select to anon,authenticated using (true);
do $$
declare owner_id uuid;
begin
 select id into strict owner_id from auth.users where email='esemmoc@gmail.com';
 execute format('create policy "Owner insert" on public.brady_status_cells_v1 for insert to authenticated with check ((select auth.uid()) = %L::uuid)',owner_id);
 execute format('create policy "Owner update" on public.brady_status_cells_v1 for update to authenticated using ((select auth.uid()) = %L::uuid) with check ((select auth.uid()) = %L::uuid)',owner_id,owner_id);
 execute format('create policy "Owner delete" on public.brady_status_cells_v1 for delete to authenticated using ((select auth.uid()) = %L::uuid)',owner_id);
end $$;
alter publication supabase_realtime add table public.brady_status_cells_v1;
