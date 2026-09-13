import type { Post } from '@/types/pulse';

export type DiscoveryDistance = 0 | 1 | 2 | 3 | 4 | 5;

export interface InterestSignal {
  score: number;
  topicMatches?: number;
  creatorMatch?: number;
  formatMatch?: number;
}

export interface CandidateSignals {
  interest: InterestSignal;
  novelty: number;
  quality: number;
  freshness: number;
  serendipity: number;
  repetitionPenalty: number;
  distance: DiscoveryDistance;
}

export interface ScoredCandidate extends CandidateSignals {
  post: Post;
  discoveryScore: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const DISTANCE_BUCKETS = [
  { distances: [0, 1] as DiscoveryDistance[], target: 0.4 },
  { distances: [2] as DiscoveryDistance[], target: 0.3 },
  { distances: [3] as DiscoveryDistance[], target: 0.2 },
  { distances: [4, 5] as DiscoveryDistance[], target: 0.1 },
] as const;

/**
 * Discovery score deliberately gives novelty + serendipity meaningful weight.
 * A high interest match cannot completely dominate the feed.
 */
export function calculateDiscoveryScore(signals: CandidateSignals): number {
  const interest = clamp(signals.interest.score);
  const novelty = clamp(signals.novelty);
  const quality = clamp(signals.quality);
  const freshness = clamp(signals.freshness);
  const serendipity = clamp(signals.serendipity);
  const repetitionPenalty = clamp(signals.repetitionPenalty);

  return clamp(
    interest * 0.32 +
      novelty * 0.18 +
      quality * 0.18 +
      freshness * 0.12 +
      serendipity * 0.20 -
      repetitionPenalty * 0.22,
  );
}

export function scoreCandidate(post: Post, signals: CandidateSignals): ScoredCandidate {
  return {
    post,
    ...signals,
    discoveryScore: calculateDiscoveryScore(signals),
  };
}

export function normalizeDistance(value: number | null | undefined): DiscoveryDistance {
  const rounded = Math.round(value ?? 3);
  return Math.max(0, Math.min(5, rounded)) as DiscoveryDistance;
}

export function freshnessScore(createdAt?: string | null, now = Date.now()): number {
  if (!createdAt) return 0.35;
  const ageHours = Math.max(0, (now - new Date(createdAt).getTime()) / 3_600_000);
  return Math.exp(-ageHours / (24 * 7));
}

export function repetitionPenalty(count: number, threshold = 3): number {
  if (count <= threshold) return 0;
  return clamp((count - threshold) / 6);
}
