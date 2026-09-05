create or replace function public.claim_actor_identity(p_old_actor_id text, p_new_actor_id text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_id text := (select auth.uid()::text);
begin
  if v_auth_id is null or v_auth_id <> p_new_actor_id then
    raise exception 'authenticated identity mismatch';
  end if;
  if p_old_actor_id is null or length(p_old_actor_id) < 8 or p_old_actor_id = p_new_actor_id then
    return;
  end if;

  delete from public.pulse_reactions old_r
  using public.pulse_reactions new_r
  where old_r.actor_id = p_old_actor_id
    and new_r.actor_id = p_new_actor_id
    and old_r.pulse_id = new_r.pulse_id
    and old_r.reaction = new_r.reaction;

  update public.pulses set creator_id = p_new_actor_id where creator_id = p_old_actor_id;
  update public.pulse_moves set actor_id = p_new_actor_id where actor_id = p_old_actor_id;
  update public.pulse_reactions set actor_id = p_new_actor_id where actor_id = p_old_actor_id;
  update public.pulse_events set actor_id = p_new_actor_id where actor_id = p_old_actor_id;

  if exists (select 1 from public.profiles where actor_id = p_new_actor_id) then
    delete from public.profiles where actor_id = p_old_actor_id;
  else
    update public.profiles set actor_id = p_new_actor_id where actor_id = p_old_actor_id;
  end if;
end;
$$;

revoke execute on function public.claim_actor_identity(text, text) from public, anon;
grant execute on function public.claim_actor_identity(text, text) to authenticated;
