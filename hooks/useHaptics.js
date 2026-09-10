'use client';

import { useCallback } from 'react';

export const useHaptics = () => {
  const trigger = useCallback((pattern = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Haptics unsupported
      }
    }
  }, []);

  return { trigger };
};
