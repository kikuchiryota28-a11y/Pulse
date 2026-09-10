'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';

export const ChooseWidget = ({ options, onChange }) => {
  const [selectedId, setSelectedId] = useState(null);
  const { trigger: haptic } = useHaptics();

  const handleSelect = (option) => {
    setSelectedId(option.id);
    haptic(12);
    onChange({ choice_id: option.id, delta: option.delta });
  };

  return (
    <div className="flex flex-col gap-3 w-full font-sans">
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
        // CHOOSE THE NEXT REALITY
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <motion.button
              key={opt.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(opt)}
              className={`relative flex flex-col text-left p-4 border transition-all ${
                isSelected
                  ? 'bg-zinc-900 border-[#FF3300] text-zinc-100'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-sm tracking-wide uppercase font-medium">
                  {opt.label}
                </span>
                <span
                  className={`w-3 h-3 border ${
                    isSelected ? 'border-[#FF3300] bg-[#FF3300]' : 'border-zinc-700'
                  }`}
                />
              </div>
              {opt.description && (
                <p className="text-xs text-zinc-500 mt-1.5 font-mono leading-relaxed">
                  {opt.description}
                </p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
