'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { participantCount } from '../lib/pulse-social';
import PulseFeedHero from '../components/PulseFeedHero';
import { PulseMoveCanvas } from '../components/pulse/PulseMoveCanvas';
import PulseChainResult from '../components/pulse/PulseChainResult';

const VIEW_TRANSITION = {
  duration: 0.48,
  ease: [0.22, 1, 0.36, 1],
};

export default function Home() {
  const [currentView, setCurrentView] = useState('feed');
  const [pulses, setPulses] = useState([]);
  const [moves, setMoves] = useState({});
  const [loading, setLoading] = useState(true);
  const [isCorePulse, setIsCorePulse] = useState(false);
  const [localParticipantCount, setLocalParticipantCount] = useState(null);
  const [localMove, setLocalMove] = useState(null);

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
        (m || []).forEach((move) => {
          if (!grouped[move.pulse_id]) grouped[move.pulse_id] = [];
          grouped[move.pulse_id].push(move);
        });
        setMoves(grouped);
      } else {
        setMoves({});
      }
      setLoading(false);
    };

    load();
  }, []);

  const featured = useMemo(() => pulses[0] || null, [pulses]);
  const featuredMoves = featured ? moves[featured.id] || [] : [];
  const baseParticipantCount = featured ? participantCount(featuredMoves) : 18;
  const count = localParticipantCount ?? baseParticipantCount;
  const visibleMoves = localMove ? [...featuredMoves, localMove] : featuredMoves;

  useEffect(() => {
    const handleJoinLink = (event) => {
      const anchor = event.target?.closest?.('a[href^="/pulse/"]');
      if (!anchor || !featured?.id) return;
      if (anchor.getAttribute('href') !== `/pulse/${featured.id}`) return;

      event.preventDefault();
      event.stopPropagation();
      setCurrentView('move');
      setIsCorePulse(true);
      window.history.replaceState(null, '', `/#pulse-${featured.id}`);
    };

    document.addEventListener('click', handleJoinLink, true);
    return () => document.removeEventListener('click', handleJoinLink, true);
  }, [featured?.id]);

  const handleSubmitMove = async (payload) => {
    if (!featured) return;

    const nextMove = {
      id: `local-${Date.now()}`,
      pulse_id: featured.id,
      action: payload.text || payload.choice_id || 'MOVE RECORDED',
      text: payload.text || null,
      content: payload.text || null,
      type: payload.text ? 'TEXT' : 'CHOICE',
      user: 'YOU',
      created_at: new Date().toISOString(),
      choice_id: payload.choice_id,
    };

    setLocalMove(nextMove);
    setLocalParticipantCount((baseParticipantCount) =>
      (baseParticipantCount ?? count) + 1
    );

    await new Promise((resolve) => setTimeout(resolve, 1050));
    setIsCorePulse(true);
    setCurrentView('result');
  };

  const handleBackToFeed = () => {
    setCurrentView('feed');
    setIsCorePulse(false);
  };

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

  const resultSummary = `${count}人が参加し、${visibleMoves.length}個のMoveを経て、このPulseの次の状態が生まれた`;

  return (
    <main className="relative min-h-[calc(100svh-6rem)] overflow-hidden">
      <AnimatePresence>
        {isCorePulse && currentView !== 'feed' && (
          <motion.div
            key="core-pulse"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.46, 0.08, 0.22, 0] }}
            transition={{ duration: 1.15, times: [0, 0.18, 0.42, 0.64, 1], ease: 'easeInOut' }}
            className="pointer-events-none fixed inset-0 z-[60]"
            style={{
              background:
                'radial-gradient(circle at 50% 48%, rgba(176,255,215,0.34), transparent 28%), radial-gradient(circle at 50% 50%, rgba(85,255,154,0.18), transparent 62%)',
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {currentView === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={VIEW_TRANSITION}
          >
            <PulseFeedHero pulse={featured} participantCount={count} />
          </motion.div>
        )}

        {currentView === 'move' && (
          <motion.div
            key="move"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.015 }}
            transition={VIEW_TRANSITION}
          >
            <PulseMoveCanvas
              pulse={{ ...featured, participant_count: count }}
              onSubmitMove={handleSubmitMove}
            />
          </motion.div>
        )}

        {currentView === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...VIEW_TRANSITION, delay: 0.08 }}
          >
            <PulseChainResult
              title={featured.title}
              moves={visibleMoves}
              status="RESULT"
              result={{
                participants: count,
                moves: visibleMoves.length,
                summary: resultSummary,
                label: 'PULSE / UPDATED STATE',
              }}
            />
            <div className="relative z-20 border-t border-zinc-900 bg-[#08080A] px-5 py-7 sm:px-8">
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-5">
                <button
                  type="button"
                  onClick={handleBackToFeed}
                  className="font-mono text-[10px] tracking-[0.17em] text-zinc-500 transition-colors hover:text-white"
                >
                  ← BACK TO DISCOVER
                </button>
                <span className="font-mono text-[9px] tracking-[0.16em] text-zinc-700">
                  STATE / {String(visibleMoves.length + 1).padStart(2, '0')}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
