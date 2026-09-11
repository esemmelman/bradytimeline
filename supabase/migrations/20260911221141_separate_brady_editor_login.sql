-- Provision the dedicated confirmed Auth user with the Admin API before applying.
-- Its password is managed in Auth and must never be stored in source control.
do $$
declare editor_id uuid;
begin
  select id into strict editor_id from auth.users where email = 'esemmoc+bradytimeline@gmail.com';
  execute format('alter policy "Owner insert" on public.brady_status_cells_v1 with check ((select auth.uid()) = %L::uuid)', editor_id);
  execute format('alter policy "Owner update" on public.brady_status_cells_v1 using ((select auth.uid()) = %L::uuid) with check ((select auth.uid()) = %L::uuid)', editor_id, editor_id);
  execute format('alter policy "Owner delete" on public.brady_status_cells_v1 using ((select auth.uid()) = %L::uuid)', editor_id);
  execute format('alter policy "Owner read" on public.brady_status_notes_v1 using ((select auth.uid()) = %L::uuid)', editor_id);
  execute format('alter policy "Owner insert" on public.brady_status_notes_v1 with check ((select auth.uid()) = %L::uuid)', editor_id);
  execute format('alter policy "Owner update" on public.brady_status_notes_v1 using ((select auth.uid()) = %L::uuid) with check ((select auth.uid()) = %L::uuid)', editor_id, editor_id);
end $$;
