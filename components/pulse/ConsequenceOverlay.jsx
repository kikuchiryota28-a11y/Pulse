'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ConsequenceOverlay = ({ isVisible, versionIndex }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-5"
        >
          <motion.div
            initial={{ scale: .92, opacity: 0, filter: 'blur(12px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: .96, opacity: 0, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-sm rounded-[28px] border border-black/5 bg-white/82 p-7 text-center text-[#111113] shadow-[0_30px_80px_rgba(17,17,19,.14)] backdrop-blur-2xl"
          >
            <div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-[#718078]">CONSEQUENCE</div>
            <div className="mb-1 text-2xl font-black tracking-tight">STATE MUTATED</div>
            {versionIndex !== undefined && (
              <div className="font-mono text-sm text-[#71717A]">TRANSITIONED TO #{versionIndex}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
