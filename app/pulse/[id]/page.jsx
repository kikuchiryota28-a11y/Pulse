'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PulseMoveCanvas } from '../../../components/pulse/PulseMoveCanvas';

export default function PulseDetailPage() {
  const params = useParams();
  const pulseId = params?.id;
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockPulse = {
      id: pulseId,
      author_id: 'usr_01',
      title: 'WHAT IF... TODAY, YOU TOOK ONE UNKNOWN ROAD HOME?',
      category: 'OUTSIDE',
      current_state_id: 'node_01',
      is_frozen: false,
      created_at: new Date().toISOString(),
      participant_count: 18,
      author: {
        id: 'usr_01',
        username: 'creator',
        display_name: 'Creator',
        avatar_url: null,
        impact_score: 120,
      },
      current_state: {
        id: 'node_01',
        pulse_id: pulseId,
        parent_node_id: null,
        version_index: 1,
        state_data: { bias_ratio: 50 },
        created_by_user_id: 'usr_01',
        created_at: new Date().toISOString(),
      },
      move_options: [
        { id: 'left', label: 'LEFT TURN', hint: 'Take the first unfamiliar turn.', delta: -8 },
        { id: 'right', label: 'RIGHT TURN', hint: 'Change direction and keep going.', delta: 8 },
        { id: 'straight', label: 'KEEP GOING', hint: 'Stay on route and notice something new.', delta: 3 },
      ],
    };

    setPulse(mockPulse);
    setLoading(false);
  }, [pulseId]);

  const handleSubmitMove = async (payload) => {
    if (!pulse?.current_state) return;

    setPulse((prev) => {
      if (!prev?.current_state) return prev;
      const currentBias = prev.current_state.state_data?.bias_ratio ?? 50;
      return {
        ...prev,
        participant_count: (prev.participant_count ?? 18) + 1,
        current_state: {
          ...prev.current_state,
          version_index: prev.current_state.version_index + 1,
          state_data: {
            ...prev.current_state.state_data,
            bias_ratio: Math.min(Math.max(currentBias + (payload.delta ?? 0), 0), 100),
            selected_option: payload.choice_id ?? null,
            last_move_text: payload.text ?? null,
          },
        },
      };
    });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#08080A] font-mono text-xs text-zinc-500">LOADING PULSE...</div>;
  }

  if (!pulse) {
    return <div className="flex min-h-screen items-center justify-center bg-[#08080A] font-mono text-xs text-red-400">PULSE NOT FOUND</div>;
  }

  return <PulseMoveCanvas pulse={pulse} onSubmitMove={handleSubmitMove} />;
}
