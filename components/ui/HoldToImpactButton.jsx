'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';

export const HoldToImpactButton = ({
  onImpact,
  disabled = false,
  holdDurationMs = 1500,
  label = 'HOLD TO IMPACT WORLD',
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);
  const { trigger: haptic } = useHaptics();
  const controls = useAnimation();

  const startHold = useCallback(() => {
    if (disabled) return;

    setIsHolding(true);
    startTimeRef.current = Date.now();
    haptic(15);

    const hapticInterval = setInterval(() => {
      haptic(8);
    }, 100);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentProgress = Math.min((elapsed / holdDurationMs) * 100, 100);
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(hapticInterval);
      }
    }, 16);

    timerRef.current = setTimeout(() => {
      clearInterval(hapticInterval);
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      haptic([30, 50, 80]);
      setIsHolding(false);
      setProgress(100);
      onImpact();

      setTimeout(() => setProgress(0), 400);
    }, holdDurationMs);

    controls.start({
      scale: [1, 1.02, 0.98, 1.01],
      transition: { repeat: Infinity, duration: 0.15 },
    });
  }, [disabled, holdDurationMs, onImpact, haptic, controls]);

  const cancelHold = useCallback(() => {
    if (!isHolding) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setIsHolding(false);
    setProgress(0);
    haptic(5);
    controls.stop();
    controls.set({ scale: 1 });
  }, [isHolding, haptic, controls]);

  return (
    <motion.button
      animate={controls}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      disabled={disabled}
      className={`relative w-full h-16 bg-zinc-900 border border-zinc-800 rounded-none overflow-hidden select-none font-mono text-xs tracking-widest uppercase transition-colors ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-zinc-700'
      }`}
    >
      <motion.div
        className="absolute inset-y-0 left-0 bg-[#FF3300]"
        style={{ width: `${progress}%` }}
        transition={{ ease: 'linear', duration: 0.05 }}
      />
      <div className="relative z-10 flex items-center justify-between px-6 w-full h-full text-zinc-100">
        <span className="flex items-center gap-2 font-semibold">
          <span className={`inline-block w-2 h-2 rounded-full ${isHolding ? 'bg-white animate-ping' : 'bg-[#FF3300]'}`} />
          {label}
        </span>
        <span className="text-zinc-400 font-mono text-[10px]">
          {isHolding ? `${Math.round(progress)}%` : `${(holdDurationMs / 1000).toFixed(1)}S`}
        </span>
      </div>
    </motion.button>
  );
};
