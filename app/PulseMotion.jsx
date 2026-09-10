'use client';

import { motion, useReducedMotion } from 'framer-motion';

export default function PulseMotion({ children }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div style={{ minHeight: '100vh' }}>{children}</div>;
  }

  return (
    <div className="pulse-motion-root" style={{ minHeight: '100vh' }}>
      <motion.div className="motion-atmosphere motion-atmosphere-a" aria-hidden="true"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .8 }} />
      <motion.div className="motion-atmosphere motion-atmosphere-b" aria-hidden="true"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.1, delay: .12 }} />
      <motion.div
        className="motion-content"
        initial={{ opacity: 0, y: 7 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .42, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
