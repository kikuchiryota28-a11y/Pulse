'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';

export default function AccountLauncher() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.location.pathname === '/');
    update();
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Account"
      onClick={() => { window.location.href = '/account'; }}
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 60,
        width: 42,
        height: 42,
        borderRadius: 14,
        border: '1px solid rgba(32,34,29,.10)',
        background: 'rgba(247,244,238,.94)',
        color: 'var(--pulse-ink, #20221d)',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 8px 24px rgba(32,34,29,.08)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <User size={18} />
    </button>
  );
}
