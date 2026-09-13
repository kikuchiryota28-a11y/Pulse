create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references public.profiles(actor_id) on delete cascade,
  title text not null,
  description text not null default '',
  context text,
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  discovery_distance smallint not null default 3 check (discovery_distance between 0 and 5),
  topic text,
  quality_score real not null default 0.5 check (quality_score between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  type text not null check (type in ('image','video')),
  url text not null,
  thumbnail_url text,
  width integer,
  height integer,
  alt text
);

create table if not exists public.interest_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  post_id uuid not null references public.posts(id) on delete cascade,
  event_type text not null check (event_type in ('impression','view','dwell_long','complete','skip','save','share')),
  session_id text,
  dwell_ms integer,
  action_weight real not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.saves (
  user_id text not null,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.reactions (
  user_id text not null,
  post_id uuid not null references public.posts(id) on delete cascade,
  type text not null check (type in ('loved','mind_blown','explore','learned')),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id, type)
);

create table if not exists public.blocks (
  user_id text not null,
  blocked_user_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id)
);

create index if not exists posts_distance_idx on public.posts(discovery_distance);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists posts_topic_idx on public.posts(topic);
create index if not exists events_user_created_idx on public.interest_events(user_id, created_at desc);
create index if not exists events_user_post_idx on public.interest_events(user_id, post_id);
create index if not exists blocks_user_idx on public.blocks(user_id, blocked_user_id);

alter table public.posts enable row level security;
alter table public.media enable row level security;
alter table public.interest_events enable row level security;
alter table public.saves enable row level security;
alter table public.reactions enable row level security;
alter table public.blocks enable row level security;

create policy "public posts readable" on public.posts for select to anon, authenticated using (visibility = 'public');
create policy "public media readable" on public.media for select to anon, authenticated using (exists (select 1 from public.posts p where p.id = media.post_id and p.visibility = 'public'));
create policy "own events insertable" on public.interest_events for insert to authenticated with check ((select auth.uid())::text = user_id);
create policy "own events readable" on public.interest_events for select to authenticated using ((select auth.uid())::text = user_id);
create policy "own saves manageable" on public.saves for all to authenticated using ((select auth.uid())::text = user_id) with check ((select auth.uid())::text = user_id);
create policy "own reactions manageable" on public.reactions for all to authenticated using ((select auth.uid())::text = user_id) with check ((select auth.uid())::text = user_id);
create policy "own blocks manageable" on public.blocks for all to authenticated using ((select auth.uid())::text = user_id) with check ((select auth.uid())::text = user_id);

grant select on public.posts, public.media to anon, authenticated;
grant select, insert on public.interest_events to authenticated;
grant select, insert, update, delete on public.saves, public.reactions, public.blocks to authenticated;
