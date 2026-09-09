begin;

alter table public.pulses
  add column if not exists current_state jsonb not null default jsonb_build_object(
    'revision', 0,
    'phase', 'moving',
    'summary', 'A Pulse is waiting for its first move.',
    'facts', '{}'::jsonb,
    'constraints', jsonb_build_object(
      'maxDepth', 50,
      'allowedInputTypes', jsonb_build_array('photo','text','audio','choice','mixed')
    ),
    'activeBranchIds', '[]'::jsonb,
    'currentTipIds', '[]'::jsonb,
    'participantCount', 0,
    'moveCount', 0
  ),
  add column if not exists current_tip_id uuid,
  add column if not exists current_tip_ids uuid[] not null default '{}'::uuid[],
  add column if not exists phase text not null default 'moving';

alter table public.pulses
  drop constraint if exists pulses_phase_check;

alter table public.pulses
  add constraint pulses_phase_check
  check (phase in ('seed','moving','revealing','completed'));

-- Backfill the canonical state without rewriting existing Move history.
with latest as (
  select distinct on (m.pulse_id)
    m.pulse_id,
    m.id as move_id,
    m.state_after,
    m.action_type,
    m.input_type,
    m.created_at
  from public.pulse_moves m
  order by m.pulse_id, m.created_at desc, m.id desc
)
update public.pulses p
set
  phase = case
    when p.status = 'active' then 'moving'
    when p.status = 'completed' then 'completed'
    else 'seed'
  end,
  current_tip_id = latest.move_id,
  current_tip_ids = case when latest.move_id is null then '{}'::uuid[] else array[latest.move_id] end,
  current_state = jsonb_build_object(
    'revision', p.revision,
    'phase', case
      when p.status = 'active' then 'moving'
      when p.status = 'completed' then 'completed'
      else 'seed'
    end,
    'summary', coalesce(
      latest.state_after->>'summary',
      p.seed->>'text',
      p.intent,
      'A Pulse is waiting for its first move.'
    ),
    'facts', jsonb_build_object(
      'seedType', p.seed_type,
      'lastMoveId', latest.move_id,
      'lastAction', latest.action_type,
      'lastInputType', latest.input_type,
      'lastChangedAt', latest.created_at
    ),
    'constraints', jsonb_build_object(
      'maxDepth', 50,
      'allowedInputTypes', jsonb_build_array('photo','text','audio','choice','mixed')
    ),
    'activeBranchIds', '[]'::jsonb,
    'currentTipIds', case
      when latest.move_id is null then '[]'::jsonb
      else jsonb_build_array(latest.move_id)
    end,
    'participantCount', p.participant_count,
    'moveCount', p.move_count
  );

create index if not exists pulses_current_tip_id_idx on public.pulses(current_tip_id);
create index if not exists pulse_events_move_id_idx on public.pulse_events(move_id);

-- Canonical state transition: every successful Move updates the Pulse ledger
-- in the same transaction as the Move insert and event creation.
create or replace function public.after_pulse_move_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_revision integer;
  v_tip_ids uuid[];
  v_phase text;
begin
  v_next_revision := coalesce(new.revision_before, 0) + 1;
  v_tip_ids := coalesce((select current_tip_ids from public.pulses where id = new.pulse_id), '{}'::uuid[]);

  if new.parent_move_id is not null and new.parent_move_id = any(v_tip_ids) then
    v_tip_ids := array_remove(v_tip_ids, new.parent_move_id);
  end if;
  v_tip_ids := array_append(v_tip_ids, new.id);

  v_phase := case
    when (select status from public.pulses where id = new.pulse_id) = 'completed' then 'completed'
    else 'moving'
  end;

  update public.pulses
  set
    move_count = (select count(*) from public.pulse_moves where pulse_id = new.pulse_id),
    participant_count = (select count(distinct actor_id) from public.pulse_moves where pulse_id = new.pulse_id),
    revision = v_next_revision,
    last_move_at = now(),
    updated_at = now(),
    phase = v_phase,
    current_tip_id = new.id,
    current_tip_ids = v_tip_ids,
    current_state = jsonb_build_object(
      'revision', v_next_revision,
      'phase', v_phase,
      'summary', coalesce(new.state_after->>'summary', 'The Pulse changed.'),
      'facts', jsonb_build_object(
        'lastMoveId', new.id,
        'parentMoveId', new.parent_move_id,
        'lastAction', new.action_type,
        'lastInputType', new.input_type,
        'changedAt', new.created_at
      ),
      'constraints', jsonb_build_object(
        'maxDepth', 50,
        'allowedInputTypes', jsonb_build_array('photo','text','audio','choice','mixed')
      ),
      'activeBranchIds', '[]'::jsonb,
      'currentTipIds', to_jsonb(v_tip_ids),
      'participantCount', (select count(distinct actor_id) from public.pulse_moves where pulse_id = new.pulse_id),
      'moveCount', (select count(*) from public.pulse_moves where pulse_id = new.pulse_id)
    )
  where id = new.pulse_id;

  insert into public.pulse_events(pulse_id,actor_id,event_type,move_id,payload)
  values(
    new.pulse_id,
    new.actor_id,
    'move_submitted',
    new.id,
    jsonb_build_object(
      'depth', new.depth,
      'action', new.action_type,
      'revision', v_next_revision
    )
  );

  return new;
end;
$$;

commit;
