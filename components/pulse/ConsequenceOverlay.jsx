'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ConsequenceOverlay = ({
  isVisible,
  versionIndex,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-[#08080A]"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, filter: 'blur(20px) contrast(200%)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px) contrast(100%)' }}
            exit={{ scale: 1.2, opacity: 0, filter: 'blur(10px) brightness(200%)' }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="bg-black text-white p-8 border border-zinc-800 font-mono text-center max-w-sm w-full mx-4 shadow-2xl"
          >
            <div className="text-xs text-[#FF3300] tracking-widest uppercase mb-2">
              // CONSEQUENCE
            </div>
            <div className="text-2xl font-bold tracking-tight mb-1">
              STATE MUTATED
            </div>
            {versionIndex !== undefined && (
              <div className="text-sm text-zinc-400 font-mono">
                TRANSITIONED TO #{versionIndex}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
