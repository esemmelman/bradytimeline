begin;
lock table public.brady_status_cells_v1 in share row exclusive mode;
do $$ begin
 if exists (select 1 from public.brady_status_cells_v1 where item_key ~ '^(torah|script|haftorah)-[0-9]+$') then
  raise exception 'Numbered rows now contain progress; preserve it before replacing rows';
 end if;
end $$;
delete from public.brady_status_dates_v1 where date_key = '08-31';
delete from public.brady_status_items_v1 where item_key ~ '^(torah|script|haftorah)-[0-9]+$';
insert into public.brady_status_items_v1 (item_key,label,sort_order)
 select 'torah-' || n, 'Torah · ' || n, n + 5 from generate_series(8,23) n
 union all
 select 'script-' || n, 'Script · ' || n, n + 21 from generate_series(8,23) n
 union all
 select 'haftorah-' || n, 'Haftarah · ' || n, n + 5 from generate_series(40,42) n;
commit;
