import { supabase } from '@/lib/supabase';

export type InterestEventType = 'impression' | 'view' | 'dwell_long' | 'complete' | 'skip' | 'save' | 'share';

export const ACTION_WEIGHTS: Record<InterestEventType, number> = {
  impression: 0.05,
  view: 0.15,
  dwell_long: 0.45,
  complete: 0.7,
  skip: -0.5,
  save: 0.9,
  share: 1,
};

export interface InterestEventInput {
  userId: string;
  postId: string;
  eventType: InterestEventType;
  sessionId?: string | null;
  dwellMs?: number | null;
  metadata?: Record<string, unknown>;
}

const LONG_DWELL_MS = 8_000;

export async function logInterestEvent(input: InterestEventInput) {
  const dwellMs = input.dwellMs == null ? null : Math.max(0, Math.round(input.dwellMs));
  const eventType = input.eventType === 'view' && dwellMs != null && dwellMs >= LONG_DWELL_MS ? 'dwell_long' : input.eventType;

  const payload = {
    user_id: input.userId,
    post_id: input.postId,
    event_type: eventType,
    session_id: input.sessionId ?? null,
    dwell_ms: dwellMs,
    action_weight: ACTION_WEIGHTS[eventType],
    metadata: input.metadata ?? {},
  };

  const { error } = await supabase.from('interest_events').insert(payload);
  if (error) throw new Error(`Failed to log recommendation event: ${error.message}`);
  return payload;
}

export function createDwellTracker(params: { userId: string; postId: string; sessionId?: string | null }) {
  const startedAt = Date.now();
  let finished = false;

  return async (eventType: 'view' | 'complete' | 'skip' = 'view') => {
    if (finished) return null;
    if (eventType === 'complete' || eventType === 'skip') finished = true;
    return logInterestEvent({ ...params, eventType, dwellMs: Date.now() - startedAt });
  };
}
