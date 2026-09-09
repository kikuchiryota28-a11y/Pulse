begin;

create or replace function public.claim_waiting_relay()
returns public.relays
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_relay public.relays;
begin
  select * into v_relay
  from public.relays
  where status='waiting'
    and (active_until is null or active_until > now())
  order by created_at asc
  limit 1
  for update skip locked;
  return v_relay;
end;
$$;

commit;
