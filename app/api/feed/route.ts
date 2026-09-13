import { NextRequest, NextResponse } from 'next/server';
import { createRecommendationClient } from '@/lib/recommendation/serverClient';
import { calculateDiscoveryScore, repetitionPenalty, type DiscoveryDistance, type ScoredCandidate } from '@/lib/recommendation/scorer';
import type { Media, Post, Profile } from '@/types/pulse';

type EventRow = { post_id: string; event_type: string; action_weight: number; session_id: string | null; created_at: string };
type PostRow = Omit<Post, 'media' | 'author'> & { media: Media[] | null; discovery_distance: number; topic: string | null; quality_score: number };

const DISTANCE_TARGETS: Array<{ distances: DiscoveryDistance[]; ratio: number }> = [
  { distances: [0, 1], ratio: 0.4 },
  { distances: [2], ratio: 0.3 },
  { distances: [3], ratio: 0.2 },
  { distances: [4, 5], ratio: 0.1 },
];

function clamp(value: number) { return Math.max(0, Math.min(1, value)); }

function selectWithDistanceMix(candidates: ScoredCandidate[], limit: number) {
  const selected: ScoredCandidate[] = [];
  const used = new Set<string>();

  for (const bucket of DISTANCE_TARGETS) {
    const quota = Math.max(1, Math.round(limit * bucket.ratio));
    const pool = candidates
      .filter((item) => bucket.distances.includes(item.distance) && !used.has(item.post.id))
      .sort((a, b) => b.discoveryScore - a.discoveryScore);

    for (const item of pool.slice(0, quota)) {
      selected.push(item);
      used.add(item.post.id);
    }
  }

  for (const item of [...candidates].sort((a, b) => b.discoveryScore - a.discoveryScore)) {
    if (selected.length >= limit) break;
    if (!used.has(item.post.id)) {
      selected.push(item);
      used.add(item.post.id);
    }
  }

  return selected.slice(0, limit);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const supabase = createRecommendationClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });

  const limit = Math.min(50, Math.max(10, Number(request.nextUrl.searchParams.get('limit') ?? 20)));
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  const [postsResult, eventsResult, blocksResult] = await Promise.all([
    supabase.from('posts').select('id,author_id,title,description,context,visibility,created_at,updated_at,discovery_distance,topic,quality_score,media(*)').eq('visibility', 'public').order('created_at', { ascending: false }).limit(250),
    supabase.from('interest_events').select('post_id,event_type,action_weight,session_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1000),
    supabase.from('blocks').select('blocked_user_id').eq('user_id', user.id),
  ]);

  if (postsResult.error) return NextResponse.json({ error: postsResult.error.message }, { status: 500 });
  if (eventsResult.error) return NextResponse.json({ error: eventsResult.error.message }, { status: 500 });
  if (blocksResult.error) return NextResponse.json({ error: blocksResult.error.message }, { status: 500 });

  const rows = (postsResult.data ?? []) as PostRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const blocked = new Set((blocksResult.data ?? []).map((row) => row.blocked_user_id));
  const skipped = new Set(events.filter((event) => event.event_type === 'skip').map((event) => event.post_id));
  const recentEvents = sessionId ? events.filter((event) => event.session_id === sessionId) : events.slice(0, 100);

  const postEventWeights = new Map<string, number>();
  const topicWeights = new Map<string, number>();
  const creatorCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();
  const formatCounts = new Map<string, number>();

  for (const event of events) {
    const weight = Number(event.action_weight) || 0;
    postEventWeights.set(event.post_id, (postEventWeights.get(event.post_id) ?? 0) + weight);
  }

  const postsById = new Map(rows.map((post) => [post.id, post]));
  for (const event of events) {
    const post = postsById.get(event.post_id);
    if (!post) continue;
    const weight = Number(event.action_weight) || 0;
    if (post.topic) topicWeights.set(post.topic, (topicWeights.get(post.topic) ?? 0) + weight);
  }
  for (const event of recentEvents) {
    const post = postsById.get(event.post_id);
    if (!post) continue;
    creatorCounts.set(post.author_id, (creatorCounts.get(post.author_id) ?? 0) + 1);
    const mediaType = post.media?.[0]?.type ?? 'unknown';
    formatCounts.set(mediaType, (formatCounts.get(mediaType) ?? 0) + 1);
    if (post.topic) topicCounts.set(post.topic, (topicCounts.get(post.topic) ?? 0) + 1);
  }

  const maxInterest = Math.max(1, ...Array.from(postEventWeights.values()).map(Math.abs));
  const maxTopicWeight = Math.max(1, ...Array.from(topicWeights.values()).map(Math.abs));

  const scored: ScoredCandidate[] = rows
    .filter((post) => !blocked.has(post.author_id) && !skipped.has(post.id))
    .map((post) => {
      const topicInterest = post.topic ? clamp((topicWeights.get(post.topic) ?? 0) / maxTopicWeight) : 0;
      const postInterest = clamp((postEventWeights.get(post.id) ?? 0) / maxInterest);
      const interest = clamp(postInterest * 0.55 + topicInterest * 0.45);
      const creatorPenalty = repetitionPenalty(creatorCounts.get(post.author_id) ?? 0);
      const topicPenalty = repetitionPenalty(post.topic ? topicCounts.get(post.topic) ?? 0 : 0);
      const formatPenalty = repetitionPenalty(formatCounts.get(post.media?.[0]?.type ?? 'unknown') ?? 0);
      const repetition = clamp(creatorPenalty * 0.5 + topicPenalty * 0.35 + formatPenalty * 0.15);
      const novelty = clamp(1 - postInterest);
      const distance = Math.max(0, Math.min(5, Math.round(post.discovery_distance ?? 3))) as DiscoveryDistance;
      const serendipity = clamp(distance / 5) * (1 - interest * 0.35);
      const ageHours = Math.max(0, (Date.now() - new Date(post.created_at ?? Date.now()).getTime()) / 3_600_000);
      const freshness = Math.exp(-ageHours / (24 * 7));
      const quality = clamp(Number(post.quality_score ?? 0.5));
      const discoveryScore = calculateDiscoveryScore({
        interest: { score: interest },
        novelty,
        quality,
        freshness,
        serendipity,
        repetitionPenalty: repetition,
        distance,
      });
      return { post: post as Post, interest: { score: interest }, novelty, quality, freshness, serendipity, repetitionPenalty: repetition, distance, discoveryScore };
    });

  const selected = selectWithDistanceMix(scored, limit);
  const authorIds = [...new Set(selected.map((item) => item.post.author_id))];
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('actor_id,username,display_name,bio,avatar_url').in('actor_id', authorIds);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const profileMap = new Map((profiles ?? []).map((profile: Profile & { actor_id?: string }) => [profile.actor_id ?? profile.id, profile]));
  const feed = selected.map((item) => ({ ...item.post, author: profileMap.get(item.post.author_id) ?? undefined, discoveryScore: item.discoveryScore, distance: item.distance }));

  return NextResponse.json({ feed, distribution: DISTANCE_TARGETS, sessionId });
}
