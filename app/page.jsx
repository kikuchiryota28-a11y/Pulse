'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { participantCount } from '../lib/pulse-social';
import PulseFeedHero from '../components/PulseFeedHero';

export default function Home() {
  const [pulses, setPulses] = useState([]);
  const [moves, setMoves] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from('pulses')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(36);
      const list = p || [];
      setPulses(list);

      if (list.length) {
        const { data: m } = await supabase
          .from('pulse_moves')
          .select('*')
          .in('pulse_id', list.map((x) => x.id))
          .order('created_at', { ascending: true });
        const grouped = {};
        (m || []).forEach((move) => (grouped[move.pulse_id] ??= []).push(move));
        setMoves(grouped);
      } else {
        setMoves({});
      }
      setLoading(false);
    };

    load();
  }, []);

  const featured = useMemo(() => pulses[0] || null, [pulses]);
  const count = featured ? participantCount(moves[featured.id] || []) : 18;

  if (loading) {
    return (
      <main className="flex min-h-[calc(100svh-6rem)] items-center justify-center">
        <span className="font-mono text-xs tracking-[0.2em] text-zinc-600">LOADING / PULSE</span>
      </main>
    );
  }

  if (!featured) {
    return (
      <main className="flex min-h-[calc(100svh-6rem)] items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-zinc-600">PULSE / EMPTY</p>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white">Nothing here yet.</h1>
          <a href="/create" className="mt-8 inline-block font-mono text-xs tracking-[0.12em] text-[#55FF9A]">+ START A PULSE →</a>
        </div>
      </main>
    );
  }

  return <PulseFeedHero pulse={featured} participantCount={count} />;
}
