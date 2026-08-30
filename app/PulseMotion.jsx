'use client';

import { motion } from 'framer-motion';

const spring = { type: 'spring', stiffness: 260, damping: 22, mass: 0.72 };

export default function PulseMotion({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ minHeight: '100vh' }}
    >
      <motion.div
        className="motion-atmosphere motion-atmosphere-a"
        aria-hidden="true"
        animate={{ x: [0, 24, -10, 0], y: [0, -18, 12, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="motion-atmosphere motion-atmosphere-b"
        aria-hidden="true"
        animate={{ x: [0, -18, 14, 0], y: [0, 14, -20, 0], rotate: [0, 12, -8, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      <motion.div
        className="motion-cursor-orb"
        aria-hidden="true"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="motion-content"
        transition={spring}
        whileHover={{ y: -1 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
