'use client';

import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type ReactionType = 'loved' | 'mind_blown' | 'explore' | 'learned';

type MutationState = {
  pending: boolean;
  error: Error | null;
};

function useMutationState() {
  const [state, setState] = useState<MutationState>({ pending: false, error: null });
  const mounted = useRef(true);

  const setSafe = useCallback((next: MutationState) => {
    if (mounted.current) setState(next);
  }, []);

  return { state, setSafe, mounted };
}

export function useOptimisticSave(postId: string, initialSaved = false) {
  const [saved, setSaved] = useState(initialSaved);
  const { state, setSafe } = useMutationState();

  const toggle = useCallback(async () => {
    const previous = saved;
    const next = !previous;
    setSaved(next);
    setSafe({ pending: true, error: null });

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error('Authentication required.');

      if (next) {
        const { error } = await supabase.from('saves').insert({ user_id: user.id, post_id: postId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase.from('saves').delete().eq('user_id', user.id).eq('post_id', postId);
        if (error) throw error;
      }

      setSafe({ pending: false, error: null });
      return next;
    } catch (cause) {
      setSaved(previous);
      const error = cause instanceof Error ? cause : new Error('Save failed.');
      setSafe({ pending: false, error });
      return previous;
    }
  }, [postId, saved, setSafe]);

  return { saved, toggle, pending: state.pending, error: state.error };
}

export function useOptimisticReaction(postId: string, initialReaction: ReactionType | null = null) {
  const [reaction, setReaction] = useState<ReactionType | null>(initialReaction);
  const { state, setSafe } = useMutationState();

  const setReactionOptimistically = useCallback(async (next: ReactionType | null) => {
    const previous = reaction;
    setReaction(next);
    setSafe({ pending: true, error: null });

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error('Authentication required.');

      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);
      if (deleteError) throw deleteError;

      if (next) {
        const { error: insertError } = await supabase.from('reactions').insert({
          user_id: user.id,
          post_id: postId,
          type: next,
        });
        if (insertError) throw insertError;
      }

      setSafe({ pending: false, error: null });
      return next;
    } catch (cause) {
      setReaction(previous);
      const error = cause instanceof Error ? cause : new Error('Reaction update failed.');
      setSafe({ pending: false, error });
      return previous;
    }
  }, [postId, reaction, setSafe]);

  return { reaction, setReaction: setReactionOptimistically, pending: state.pending, error: state.error };
}

export function useOptimisticFollow(targetUserId: string, initialFollowing = false) {
  const [following, setFollowing] = useState(initialFollowing);
  const { state, setSafe } = useMutationState();

  const toggle = useCallback(async () => {
    const previous = following;
    const next = !previous;
    setFollowing(next);
    setSafe({ pending: true, error: null });

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error('Authentication required.');
      if (user.id === targetUserId) throw new Error('You cannot follow yourself.');

      if (next) {
        const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
        if (error) throw error;
      }

      setSafe({ pending: false, error: null });
      return next;
    } catch (cause) {
      setFollowing(previous);
      const error = cause instanceof Error ? cause : new Error('Follow update failed.');
      setSafe({ pending: false, error });
      return previous;
    }
  }, [following, setSafe, targetUserId]);

  return { following, toggle, pending: state.pending, error: state.error };
}
