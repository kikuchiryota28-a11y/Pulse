create or replace function public.submit_pulse_move(p_pulse_id uuid, p_actor_id text, p_parent_move_id uuid, p_action_type text, p_input_type text, p_prompt text, p_content jsonb, p_submission_id uuid default null, p_expected_revision integer default null)
returns public.pulse_moves
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_move public.pulse_moves;
  v_pulse public.pulses;
  v_submission uuid;
  v_auth_id text := (select auth.uid()::text);
begin
  if p_actor_id is null or length(trim(p_actor_id)) < 8 or length(trim(p_actor_id)) > 80 then
    raise exception using errcode='22023', message='Invalid actor identity';
  end if;

  if v_auth_id is not null and v_auth_id <> p_actor_id then
    raise exception using errcode='42501', message='Actor identity does not match the authenticated user';
  end if;

  if p_action_type not in ('react','choose','interpret','find','connect','transform','compare','predict','add','remix') then
    raise exception using errcode='23514', message='Invalid action type';
  end if;

  if p_input_type not in ('choice','text','photo','mixed') then
    raise exception using errcode='23514', message='Invalid input type';
  end if;

  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception using errcode='22P02', message='Move content must be an object';
  end if;

  if char_length(coalesce(p_prompt,'')) < 1 or char_length(p_prompt) > 500 then
    raise exception using errcode='22023', message='Invalid prompt';
  end if;

  if p_submission_id is not null then
    select * into v_move from public.pulse_moves where submission_id = p_submission_id;
    if found then return v_move; end if;
    v_submission := p_submission_id;
  else
    v_submission := md5(concat_ws('|', p_pulse_id::text, coalesce(p_actor_id,''), coalesce(p_parent_move_id::text,''), coalesce(p_action_type,''), coalesce(p_input_type,''), coalesce(p_prompt,''), coalesce(p_content::text,'')))::uuid;
    select * into v_move from public.pulse_moves where submission_id = v_submission;
    if found then return v_move; end if;
  end if;

  select * into v_pulse from public.pulses where id = p_pulse_id for update;
  if not found then raise exception using errcode='P0001', message='Pulse not found'; end if;
  if v_pulse.status <> 'active' then raise exception using errcode='P0001', message='Pulse is not accepting moves'; end if;
  if v_pulse.creator_id = p_actor_id then raise exception using errcode='42501', message='The person who started a Pulse cannot make the next move'; end if;
  if p_expected_revision is not null and v_pulse.revision <> p_expected_revision then raise exception using errcode='40001', message='Pulse changed before your move was submitted'; end if;

  if p_parent_move_id is not null then
    if not exists (select 1 from public.pulse_moves where id = p_parent_move_id and pulse_id = p_pulse_id) then
      raise exception using errcode='23503', message='Invalid parent move';
    end if;
  elsif exists (select 1 from public.pulse_moves where pulse_id = p_pulse_id) then
    raise exception using errcode='P0001', message='Parent move is required after the first move';
  end if;

  insert into public.pulse_moves(pulse_id, actor_id, parent_move_id, depth, action_type, input_type, prompt, content, state_before, state_after, submission_id, revision_before)
  values (p_pulse_id, p_actor_id, p_parent_move_id, 1, p_action_type, p_input_type, p_prompt, p_content, '{}', '{}', v_submission, v_pulse.revision)
  returning * into v_move;

  return v_move;
exception
  when unique_violation then
    select * into v_move from public.pulse_moves where submission_id = v_submission;
    if found then return v_move; end if;
    raise;
end;
$function$;

revoke execute on function public.submit_pulse_move(uuid,text,uuid,text,text,text,jsonb,uuid,integer) from public;
grant execute on function public.submit_pulse_move(uuid,text,uuid,text,text,text,jsonb,uuid,integer) to anon, authenticated;
