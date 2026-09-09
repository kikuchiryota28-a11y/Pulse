begin;

-- Legacy Relay is no longer the canonical Pulse execution path.
-- Remove direct client execution rights while preserving functions for migration compatibility.
revoke execute on function public.create_relay(text) from public, anon, authenticated;
revoke execute on function public.claim_relay(text) from public, anon, authenticated;
revoke execute on function public.submit_relay_step(uuid,text,text) from public, anon, authenticated;

commit;
