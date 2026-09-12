'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const DEFAULT_OPTIONS = [
  {
    id: 'left',
    label: 'LEFT TURN',
    hint: 'Take the first unfamiliar turn you see.',
    delta: -8,
  },
  {
    id: 'right',
    label: 'RIGHT TURN',
    hint: 'Change direction and keep going.',
    delta: 8,
  },
  {
    id: 'straight',
    label: 'KEEP GOING',
    hint: 'Stay on your route, but notice something new.',
    delta: 3,
  },
];

const formatAge = (createdAt) => {
  if (!createdAt) return 'NOW';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  if (seconds < 60) return 'NOW';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const PulseMoveCanvas = ({ pulse, onSubmitMove }) => {
  const [stage, setStage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [moveText, setMoveText] = useState('');
  const [status, setStatus] = useState('READY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  const currentState = pulse?.current_state;
  const versionIndex = currentState?.version_index ?? 1;
  const participantCount = pulse?.participant_count ?? 18;
  const options = pulse?.move_options?.length ? pulse.move_options : DEFAULT_OPTIONS;

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedId) ?? null,
    [options, selectedId]
  );

  useEffect(() => {
    if (stage === 2 && status === 'READY') {
      const timer = setTimeout(() => setStatus('WAITING FOR YOUR MOVE'), 220);
      return () => clearTimeout(timer);
    }
  }, [stage, status]);

  const handleOption = (option) => {
    if (isProcessing || hasChanged) return;
    setSelectedId(option.id);
    setStage(2);
  };

  const handleSubmit = async () => {
    if (isProcessing || hasChanged || (!selectedOption && !moveText.trim())) return;

    setIsProcessing(true);
    setStatus('PROCESSING...');
    setStage(3);

    const payload = {
      choice_id: selectedOption?.id ?? null,
      delta: selectedOption?.delta ?? 0,
      text: moveText.trim() || null,
    };

    try {
      await onSubmitMove?.(payload);
      setStatus('CHAIN UPDATED');
      setHasChanged(true);
    } catch (error) {
      console.error('Failed to submit move:', error);
      setStatus('UPDATE FAILED');
      setStage(2);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08080A] text-zinc-100">
      <AnimatePresence>
        {stage === 3 && (
          <motion.div
            key="pulse-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.72, 0.16, 0.48, 0] }}
            transition={{ duration: 1.25, times: [0, 0.18, 0.42, 0.62, 1], ease: 'easeInOut' }}
            className="pointer-events-none fixed inset-0 z-30"
            style={{
              background:
                'radial-gradient(circle at 50% 46%, rgba(176,255,215,0.30), transparent 30%), radial-gradient(circle at 50% 50%, rgba(130,220,180,0.18), transparent 58%)',
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        aria-hidden="true"
        animate={stage === 3 ? { scale: [1, 1.45, 1.06, 1], opacity: [0.2, 0.75, 0.36, 0.2] } : { scale: 1, opacity: 0.2 }}
        transition={{ duration: stage === 3 ? 1.2 : 0.8, ease: 'easeInOut' }}
        className="pointer-events-none fixed left-1/2 top-[43%] z-0 h-[55vh] w-[55vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(108,255,174,0.20) 0%, rgba(94,76,255,0.08) 34%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-24 pt-24 sm:px-8">
        <header className="flex items-start justify-between gap-6 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          <div>
            <div className="mb-2 flex items-center gap-2 text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
              <span>LIVE · {formatAge(pulse?.created_at)}</span>
            </div>
            <div>CAT // {pulse?.category ?? 'OUTSIDE'}</div>
          </div>
          <div className="text-right">
            <div>{String(versionIndex).padStart(2, '0')} / ACTIVE</div>
            <div className="mt-2 text-zinc-700">MOVE PROTOCOL</div>
          </div>
        </header>

        <section className="relative flex flex-1 flex-col justify-center py-12 sm:py-16">
          <motion.div
            layout
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <div className="mb-5 font-mono text-[10px] tracking-[0.24em] text-zinc-600">
              STAGE {stage} // {stage === 1 ? 'SEED' : stage === 2 ? 'MOVE INPUT' : 'CHANGE'}
            </div>

            <h1
              className={`font-sans font-black tracking-[-0.055em] text-zinc-100 ${
                stage === 1 ? 'text-4xl sm:text-6xl' : 'text-3xl sm:text-5xl'
              }`}
            >
              {pulse?.title || 'WHAT IF...'}
            </h1>

            {stage === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5 }}
                className="mt-8 max-w-2xl"
              >
                <p className="font-mono text-xs leading-6 text-zinc-500">
                  This Pulse changes when someone acts. There is no correct answer. Your move becomes part of the next state.
                </p>

                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex -space-x-2">
                    {Array.from({ length: Math.min(5, participantCount) }).map((_, index) => (
                      <span
                        key={index}
                        className="h-7 w-7 rounded-full border border-[#08080A] bg-zinc-800"
                        style={{ opacity: 1 - index * 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    {participantCount} people changed this
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setStage(2)}
                  className="group mt-12 inline-flex items-center gap-4 font-mono text-xs font-semibold tracking-[0.18em] text-zinc-100 transition-colors hover:text-emerald-200"
                >
                  <span>MAKE YOUR MOVE</span>
                  <motion.span
                    initial={{ x: 0 }}
                    whileHover={{ x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="text-emerald-300"
                  >
                    →
                  </motion.span>
                </button>
              </motion.div>
            )}

            {stage === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 max-w-xl"
              >
                <div className="mb-7 font-mono text-[10px] tracking-[0.22em] text-zinc-500">
                  YOUR MOVE
                </div>

                <div className="space-y-2">
                  {options.map((option) => {
                    const active = selectedId === option.id;
                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleOption(option)}
                        className={`flex w-full items-center justify-between border-b px-0 py-4 text-left font-mono transition-all ${
                          active
                            ? 'border-zinc-300 text-zinc-100'
                            : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                        }`}
                      >
                        <span>
                          <span className="block text-xs tracking-[0.12em]">{option.label}</span>
                          <span className="mt-1 block text-[10px] tracking-normal text-zinc-600">{option.hint}</span>
                        </span>
                        <span className={`text-sm transition-transform ${active ? 'translate-x-1 text-emerald-300' : ''}`}>
                          →
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <label className="mt-8 block">
                  <span className="mb-2 block font-mono text-[10px] tracking-[0.18em] text-zinc-600">
                    OPTIONAL // WHAT DID YOU NOTICE?
                  </span>
                  <input
                    value={moveText}
                    onChange={(event) => setMoveText(event.target.value)}
                    placeholder="どこを歩いた？"
                    disabled={isProcessing || hasChanged}
                    className="w-full border-b border-zinc-800 bg-transparent px-0 py-3 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-700 transition-colors focus:border-zinc-200 focus:shadow-[0_10px_28px_-18px_rgba(255,255,255,0.75)]"
                  />
                </label>

                <div className="mt-10 flex items-center justify-between gap-5">
                  <button
                    type="button"
                    onClick={() => setStage(1)}
                    disabled={isProcessing}
                    className="font-mono text-[10px] tracking-[0.16em] text-zinc-600 transition-colors hover:text-zinc-300 disabled:opacity-40"
                  >
                    ← BACK
                  </button>
                  <motion.button
                    type="button"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={isProcessing || (!selectedOption && !moveText.trim())}
                    className="font-mono text-xs font-semibold tracking-[0.18em] text-zinc-100 transition-all disabled:cursor-not-allowed disabled:text-zinc-700"
                  >
                    COMMIT MOVE <span className="ml-2 text-emerald-300">→</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {stage === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45 }}
                className="mt-12"
              >
                <div className="font-mono text-xs tracking-[0.2em] text-zinc-500">// STATE TRANSITION</div>
                <motion.div
                  key={status}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-3 font-mono text-2xl font-semibold tracking-[0.08em] ${
                    status === 'CHAIN UPDATED' ? 'text-emerald-200' : 'text-zinc-100'
                  }`}
                >
                  {status}
                </motion.div>
                <p className="mt-5 max-w-md font-mono text-[10px] leading-5 text-zinc-600">
                  {status === 'CHAIN UPDATED'
                    ? 'YOUR MOVE IS NOW PART OF THIS PULSE.'
                    : 'PROPAGATING YOUR MOVE THROUGH THE CHAIN...'}
                </p>

                {status === 'CHAIN UPDATED' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="mt-10 flex items-center gap-5"
                  >
                    <span className="font-mono text-[10px] tracking-[0.15em] text-zinc-500">
                      STATE {String(versionIndex + 1).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStage(1)}
                      className="font-mono text-[10px] tracking-[0.15em] text-zinc-300 hover:text-emerald-200"
                    >
                      VIEW UPDATED PULSE →
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        </section>

        <footer className="flex items-end justify-between border-t border-zinc-900 pt-5 font-mono text-[9px] tracking-[0.16em] text-zinc-700">
          <span>MOVE / {String(versionIndex).padStart(2, '0')}</span>
          <Link href="/" className="transition-colors hover:text-zinc-400">
            EXIT PULSE
          </Link>
        </footer>
      </div>
    </main>
  );
};
