'use client';

import { supabase } from './supabase';

const ACTOR_STORAGE_KEY = 'pulse_actor_id';

function getAnonymousActorId() {
  if (typeof window === 'undefined') return `a_${crypto.randomUUID()}`;

  const existing = window.localStorage.getItem(ACTOR_STORAGE_KEY);
  if (existing) return existing;

  const actorId = `a_${crypto.randomUUID()}`;
  window.localStorage.setItem(ACTOR_STORAGE_KEY, actorId);
  return actorId;
}

export async function getPulseMoves(pulseId) {
  const { data, error } = await supabase
    .from('pulse_moves')
    .select('*')
    .eq('pulse_id', pulseId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function savePulseMove({ pulseId, type, content, prompt }) {
  if (!pulseId) throw new Error('Pulse id is required');

  const actorId = getAnonymousActorId();
  const { data, error } = await supabase.rpc('submit_pulse_move', {
    p_pulse_id: pulseId,
    p_actor_id: actorId,
    p_input_type: type,
    p_content: content || {},
    p_prompt: prompt || 'What did you do?',
  });

  if (error) throw error;
  return data;
}

export function subscribeToPulseMoves(pulseId, onInsert) {
  if (!pulseId) return () => {};

  const channel = supabase
    .channel(`pulse-moves:${pulseId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'pulse_moves',
        filter: `pulse_id=eq.${pulseId}`,
      },
      (payload) => onInsert?.(payload.new)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
