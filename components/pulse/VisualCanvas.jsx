'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const VisualCanvas = ({
  visualUrl,
  versionIndex,
  biasRatio = 50,
  recentContributorsCount = 0,
}) => {
  return (
    <div className="relative w-full aspect-square md:aspect-[16/10] bg-zinc-950 border border-zinc-800 overflow-hidden flex flex-col justify-between p-4">
      {visualUrl ? (
        <img
          src={visualUrl}
          alt={`State v${versionIndex}`}
          className="absolute inset-0 w-full h-full object-cover opacity-70 filter contrast-125 grayscale hover:grayscale-0 transition-all duration-700"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
      )}

      <div className="relative z-10 flex items-center justify-between w-full font-mono text-[11px] tracking-wider">
        <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md px-2.5 py-1 border border-zinc-800 text-zinc-200">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
          STATE #{versionIndex}
        </div>
        {recentContributorsCount > 0 && (
          <div className="bg-zinc-900/90 backdrop-blur-md px-2.5 py-1 border border-zinc-800 text-zinc-400">
            {recentContributorsCount} TRACES IMPRINTED
          </div>
        )}
      </div>

      {!visualUrl && (
        <div className="relative z-10 my-auto text-center font-mono">
          <div className="text-4xl md:text-6xl font-bold tracking-tighter text-zinc-800 select-none">
            UNSTABLE_STATE
          </div>
          <div className="text-xs text-zinc-600 mt-2">WAITING FOR YOUR INTERVENTION</div>
        </div>
      )}

      <div className="relative z-10 w-full font-mono">
        <div className="flex justify-between text-[10px] text-zinc-400 mb-1.5">
          <span>REALITY BIAS</span>
          <span>{biasRatio}%</span>
        </div>
        <div className="w-full h-1 bg-zinc-900 border border-zinc-800 overflow-hidden">
          <motion.div
            className="h-full bg-[#FF3300]"
            initial={{ width: 0 }}
            animate={{ width: `${biasRatio}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
      </div>
    </div>
  );
};
