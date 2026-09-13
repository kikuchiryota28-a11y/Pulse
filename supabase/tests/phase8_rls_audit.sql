-- Phase 8 security audit.
-- Run with: supabase test db
-- This file is intentionally read-only: it verifies table hardening without mutating production data.

begin;

select plan(18);

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.posts'::regclass), 'posts has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.media'::regclass), 'media has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.reactions'::regclass), 'reactions has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.saves'::regclass), 'saves has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.collections'::regclass), 'collections has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.interest_events'::regclass), 'interest_events has RLS enabled');

select ok(exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles own update' and qual ilike '%auth.uid()%'), 'profiles owner update policy is auth.uid based');
select ok(exists (select 1 from pg_policies where schemaname='public' and tablename='posts' and policyname='posts own insert' and with_check ilike '%auth.uid()%'), 'posts insert ownership is auth.uid based');
select ok(exists (select 1 from pg_policies where schemaname='public' and tablename='media' and policyname='media own insert' and with_check ilike '%auth.uid()%'), 'media insert ownership is auth.uid based');
select ok(exists (select 1 from pg_policies where schemaname='public' and tablename='reactions' and policyname='own reactions insert' and with_check ilike '%auth.uid()%'), 'reactions insert ownership is auth.uid based');
select ok(exists (select 1 from pg_policies where schemaname='public' and tablename='saves' and policyname='own saves insert' and with_check ilike '%auth.uid()%'), 'saves insert ownership is auth.uid based');
select ok(exists (select 1 from pg_policies where schemaname='public' and tablename='collections' and policyname='collections own insert' and with_check ilike '%auth.uid()%'), 'collections insert ownership is auth.uid based');
select ok(exists (select 1 from pg_policies where schemaname='public' and tablename='interest_events' and policyname='own events insertable' and with_check ilike '%auth.uid()%'), 'interest_events insert ownership is auth.uid based');

select ok(not exists (select 1 from information_schema.role_table_grants where table_schema='public' and table_name in ('profiles','posts','media','reactions','saves','collections','interest_events') and grantee='anon' and privilege_type in ('INSERT','UPDATE','DELETE')), 'anon cannot mutate protected user data');
select ok(not exists (select 1 from pg_policies where schemaname='public' and tablename in ('profiles','posts','media','reactions','saves','collections','interest_events') and (qual is null and with_check is null)), 'no unrestricted policies exist on protected tables');
select ok(not exists (select 1 from pg_policies where schemaname='public' and tablename in ('profiles','posts','media','reactions','saves','collections','interest_events') and (qual ilike '%user_metadata%' or with_check ilike '%user_metadata%')), 'no policy trusts user metadata for authorization');

select * from finish();
rollback;
