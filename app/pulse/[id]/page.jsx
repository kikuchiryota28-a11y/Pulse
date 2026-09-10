'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PulseMoveCanvas } from '@/components/pulse/PulseMoveCanvas';

export default function PulseDetailPage() {
  const params = useParams();
  const pulseId = params?.id;
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 仮データのロード処理（Supabase連携時は supabase.from('pulses')... に差し替え）
    const mockPulse = {
      id: pulseId,
      author_id: 'usr_01',
      title: 'PROJECT PULSE: INITIAL VOID',
      category: 'EXPERIMENTAL',
      current_state_id: 'node_01',
      is_frozen: false,
      created_at: new Date().toISOString(),
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
        state_data: {
          bias_ratio: 50,
        },
        created_by_user_id: 'usr_01',
        created_at: new Date().toISOString(),
      },
    };

    setPulse(mockPulse);
    setLoading(false);
  }, [pulseId]);

  const handleSubmitMove = async (payload) => {
    if (!pulse || !pulse.current_state) return;

    // Supabase RPC 呼び出し用の標準コード例:
    // await supabase.rpc('submit_pulse_move', {
    //   p_pulse_id: pulse.id,
    //   p_target_node_id: pulse.current_state.id,
    //   p_move_type: 'CHOOSE',
    //   p_payload: payload,
    // });

    // ローカルステートを即時更新（UIの確認用）
    setPulse((prev) => {
      if (!prev || !prev.current_state) return prev;
      const nextVersion = prev.current_state.version_index + 1;
      const currentBias = prev.current_state.state_data.bias_ratio || 50;
      return {
        ...prev,
        current_state: {
          ...prev.current_state,
          version_index: nextVersion,
          state_data: {
            ...prev.current_state.state_data,
            bias_ratio: Math.min(Math.max(currentBias + payload.delta, 0), 100),
            selected_option: payload.choice_id,
          },
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-zinc-500 font-mono text-xs">
        LOADING PULSE DATA...
      </div>
    );
  }

  if (!pulse) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-red-500 font-mono text-xs">
        PULSE NOT FOUND
      </div>
    );
  }

  return <PulseMoveCanvas pulse={pulse} onSubmitMove={handleSubmitMove} />;
}
