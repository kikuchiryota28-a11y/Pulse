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

create table if not exists public.follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  description text,
  visibility text not null default 'private' check (visibility in ('public','unlisted','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocks (
  user_id text not null,
  blocked_user_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);

create index if not exists posts_distance_idx on public.posts(discovery_distance);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists posts_topic_idx on public.posts(topic);
create index if not exists posts_author_idx on public.posts(author_id);
create index if not exists media_post_idx on public.media(post_id);
create index if not exists events_user_created_idx on public.interest_events(user_id, created_at desc);
create index if not exists events_user_post_idx on public.interest_events(user_id, post_id);
create index if not exists follows_follower_idx on public.follows(follower_id, created_at desc);
create index if not exists follows_following_idx on public.follows(following_id, created_at desc);
create index if not exists collections_owner_idx on public.collections(owner_id, created_at desc);
create index if not exists blocks_user_idx on public.blocks(user_id, blocked_user_id);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.media enable row level security;
alter table public.interest_events enable row level security;
alter table public.reactions enable row level security;
alter table public.saves enable row level security;
alter table public.follows enable row level security;
alter table public.collections enable row level security;
alter table public.blocks enable row level security;

drop policy if exists "profiles public readable" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "profiles own delete" on public.profiles;
create policy "profiles public readable" on public.profiles for select to anon, authenticated using (true);
create policy "profiles own insert" on public.profiles for insert to authenticated with check ((select auth.uid())::text = actor_id);
create policy "profiles own update" on public.profiles for update to authenticated using ((select auth.uid())::text = actor_id) with check ((select auth.uid())::text = actor_id);
create policy "profiles own delete" on public.profiles for delete to authenticated using ((select auth.uid())::text = actor_id);

drop policy if exists "public posts readable" on public.posts;
drop policy if exists "posts own insert" on public.posts;
drop policy if exists "posts own update" on public.posts;
drop policy if exists "posts own delete" on public.posts;
create policy "public posts readable" on public.posts for select to anon, authenticated using (visibility = 'public' or (select auth.uid())::text = author_id);
create policy "posts own insert" on public.posts for insert to authenticated with check ((select auth.uid())::text = author_id);
create policy "posts own update" on public.posts for update to authenticated using ((select auth.uid())::text = author_id) with check ((select auth.uid())::text = author_id);
create policy "posts own delete" on public.posts for delete to authenticated using ((select auth.uid())::text = author_id);

drop policy if exists "public media readable" on public.media;
drop policy if exists "media own insert" on public.media;
drop policy if exists "media own update" on public.media;
drop policy if exists "media own delete" on public.media;
create policy "public media readable" on public.media for select to anon, authenticated using (exists (select 1 from public.posts p where p.id = media.post_id and (p.visibility = 'public' or (select auth.uid())::text = p.author_id)));
create policy "media own insert" on public.media for insert to authenticated with check (exists (select 1 from public.posts p where p.id = media.post_id and (select auth.uid())::text = p.author_id));
create policy "media own update" on public.media for update to authenticated using (exists (select 1 from public.posts p where p.id = media.post_id and (select auth.uid())::text = p.author_id)) with check (exists (select 1 from public.posts p where p.id = media.post_id and (select auth.uid())::text = p.author_id));
create policy "media own delete" on public.media for delete to authenticated using (exists (select 1 from public.posts p where p.id = media.post_id and (select auth.uid())::text = p.author_id));

drop policy if exists "own events insertable" on public.interest_events;
drop policy if exists "own events readable" on public.interest_events;
create policy "own events insertable" on public.interest_events for insert to authenticated with check ((select auth.uid())::text = user_id);
create policy "own events readable" on public.interest_events for select to authenticated using ((select auth.uid())::text = user_id);

create policy "own saves readable" on public.saves for select to authenticated using ((select auth.uid())::text = user_id);
create policy "own saves insert" on public.saves for insert to authenticated with check ((select auth.uid())::text = user_id);
create policy "own saves delete" on public.saves for delete to authenticated using ((select auth.uid())::text = user_id);

create policy "own reactions readable" on public.reactions for select to authenticated using ((select auth.uid())::text = user_id);
create policy "own reactions insert" on public.reactions for insert to authenticated with check ((select auth.uid())::text = user_id);
create policy "own reactions delete" on public.reactions for delete to authenticated using ((select auth.uid())::text = user_id);

create policy "follows readable" on public.follows for select to authenticated using ((select auth.uid())::text = follower_id or (select auth.uid())::text = following_id);
create policy "follows own insert" on public.follows for insert to authenticated with check ((select auth.uid())::text = follower_id);
create policy "follows own delete" on public.follows for delete to authenticated using ((select auth.uid())::text = follower_id);

create policy "collections visible" on public.collections for select to authenticated using (visibility = 'public' or (select auth.uid())::text = owner_id);
create policy "collections own insert" on public.collections for insert to authenticated with check ((select auth.uid())::text = owner_id);
create policy "collections own update" on public.collections for update to authenticated using ((select auth.uid())::text = owner_id) with check ((select auth.uid())::text = owner_id);
create policy "collections own delete" on public.collections for delete to authenticated using ((select auth.uid())::text = owner_id);

create policy "own blocks readable" on public.blocks for select to authenticated using ((select auth.uid())::text = user_id);
create policy "own blocks insert" on public.blocks for insert to authenticated with check ((select auth.uid())::text = user_id);
create policy "own blocks delete" on public.blocks for delete to authenticated using ((select auth.uid())::text = user_id);

revoke all on table public.profiles, public.posts, public.media, public.interest_events, public.reactions, public.saves, public.follows, public.collections, public.blocks from anon, authenticated;
grant select on public.profiles, public.posts, public.media to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant insert, update, delete on public.posts, public.media to authenticated;
grant select, insert on public.interest_events to authenticated;
grant select, insert, delete on public.reactions, public.saves, public.follows, public.collections, public.blocks to authenticated;
grant update, delete on public.collections to authenticated;
