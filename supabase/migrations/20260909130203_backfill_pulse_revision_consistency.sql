begin;

with counts as (
  select pulse_id, count(*)::integer as move_count
  from public.pulse_moves
  group by pulse_id
)
update public.pulses p
set
  revision = greatest(p.revision, coalesce(c.move_count,0)),
  current_state = jsonb_set(
    coalesce(p.current_state,'{}'::jsonb),
    '{revision}',
    to_jsonb(greatest(p.revision, coalesce(c.move_count,0))),
    true
  ),
  updated_at = now()
from counts c
where p.id = c.pulse_id
  and greatest(p.revision, coalesce(c.move_count,0)) <> p.revision;

commit;
