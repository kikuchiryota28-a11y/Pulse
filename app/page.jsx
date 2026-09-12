'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { participantCount } from '../lib/pulse-social';
import { savePulseMove, subscribeToPulseMoves } from '../lib/pulse-moves';
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
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from('pulses')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(36);

      if (cancelled) return;

      const list = p || [];
      setPulses(list);

      if (list.length) {
        const { data: m } = await supabase
          .from('pulse_moves')
          .select('*')
          .in('pulse_id', list.map((x) => x.id))
          .order('created_at', { ascending: true });

        if (cancelled) return;

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
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = useMemo(() => pulses[0] || null, [pulses]);
  const featuredMoves = featured ? moves[featured.id] || [] : [];
  const baseParticipantCount = featured
    ? featured.participant_count ?? participantCount(featuredMoves)
    : 18;
  const count = localParticipantCount ?? baseParticipantCount;
  const visibleMoves = localMove ? [...featuredMoves, localMove] : featuredMoves;

  useEffect(() => {
    if (!featured?.id) return undefined;

    const unsubscribe = subscribeToPulseMoves(featured.id, (incomingMove) => {
      setMoves((current) => {
        const existing = current[featured.id] || [];
        if (existing.some((move) => move.id === incomingMove.id)) return current;
        return {
          ...current,
          [featured.id]: [...existing, incomingMove].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        };
      });
    });

    return unsubscribe;
  }, [featured?.id]);

  useEffect(() => {
    const handleJoinLink = (event) => {
      const anchor = event.target?.closest?.('a[href^="/pulse/"]');
      if (!anchor || !featured?.id) return;
      if (anchor.getAttribute('href') !== `/pulse/${featured.id}`) return;

      event.preventDefault();
      event.stopPropagation();
      setSaveError(null);
      setCurrentView('move');
      setIsCorePulse(true);
      window.history.replaceState(null, '', `/#pulse-${featured.id}`);
    };

    document.addEventListener('click', handleJoinLink, true);
    return () => document.removeEventListener('click', handleJoinLink, true);
  }, [featured?.id]);

  const handleSubmitMove = async (payload) => {
    if (!featured) return;

    setSaveError(null);

    const optimisticMove = {
      id: `local-${Date.now()}`,
      pulse_id: featured.id,
      action: payload.text || payload.choice_id || 'MOVE RECORDED',
      text: payload.text || null,
      content: {
        type: payload.text ? 'text' : 'choice',
        text: payload.text || null,
        choice: payload.choice_id || null,
        summary: payload.text || payload.choice_id || 'MOVE RECORDED',
      },
      type: payload.text ? 'TEXT' : 'CHOICE',
      user: 'YOU',
      created_at: new Date().toISOString(),
      choice_id: payload.choice_id,
      optimistic: true,
    };

    // Optimistic UI happens before any network work.
    setLocalMove(optimisticMove);
    setLocalParticipantCount((current) => (current ?? baseParticipantCount) + 1);

    const parentMoveId = featuredMoves.length
      ? featuredMoves[featuredMoves.length - 1].id
      : null;

    // Persist in the background. The visual Pulse transition does not wait for the database.
    void savePulseMove({
      pulseId: featured.id,
      parentMoveId,
      type: payload.text ? 'text' : 'choice',
      content: optimisticMove.content,
      prompt: 'What did you do?',
    })
      .then((savedMove) => {
        setLocalMove(null);
        setMoves((current) => {
          const existing = current[featured.id] || [];
          if (existing.some((move) => move.id === savedMove.id)) return current;
          return {
            ...current,
            [featured.id]: [...existing, savedMove].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
          };
        });
        setLocalParticipantCount(null);
      })
      .catch((error) => {
        console.error('Failed to persist Pulse Move:', error);
        setLocalMove(null);
        setLocalParticipantCount(null);
        setSaveError('MOVE SAVE FAILED — TRY AGAIN');
      });

    // Keep the visual transition independent from database latency.
    await new Promise((resolve) => setTimeout(resolve, 1050));
    setIsCorePulse(true);
    setCurrentView('result');
  };

  const handleBackToFeed = () => {
    setCurrentView('feed');
    setIsCorePulse(false);
    setSaveError(null);
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
            {saveError && (
              <div className="relative z-20 mx-auto max-w-6xl px-5 pb-8 font-mono text-[10px] tracking-[0.16em] text-red-300 sm:px-8">
                {saveError}
              </div>
            )}
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
