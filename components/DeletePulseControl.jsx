'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function addDeleteButton(pulseId, setBusy, setError, busy) {
  const toolbar = document.querySelector('.screen-toolbar');
  if (!toolbar || toolbar.querySelector('[data-pulse-delete]')) return () => {};
  const actions = toolbar.querySelector('.flex.gap-2') || toolbar.lastElementChild;
  if (!actions) return () => {};

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.pulseDelete = '1';
  button.setAttribute('aria-label', 'Delete Pulse');
  button.title = 'Delete Pulse';
  Object.assign(button.style, {
    width: '40px',
    height: '40px',
    display: 'grid',
    placeItems: 'center',
    border: '1px solid rgba(32,34,29,.10)',
    borderRadius: '50%',
    background: 'rgba(255,255,255,.38)',
    color: '#20221d',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: '1',
  });
  button.textContent = '×';
  button.onclick = async () => {
    if (busy) return;
    const confirmed = window.confirm('Delete this Pulse? It will disappear from the public feed and its trace will no longer be public.');
    if (!confirmed) return;
    setBusy(true);
    setError('');
    const { error } = await supabase.rpc('creator_delete_pulse', { p_pulse_id: pulseId });
    if (error) {
      setError(error.message || 'Could not delete this Pulse.');
      setBusy(false);
      return;
    }
    window.location.href = '/';
  };
  actions.appendChild(button);
  return () => button.remove();
}

export default function DeletePulseControl() {
  const [visible, setVisible] = useState(false);
  const [pulseId, setPulseId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const inspect = async () => {
      const title = document.querySelector('.pulse-detail-title')?.textContent?.trim();
      if (!title) {
        setVisible(false);
        setPulseId('');
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user?.id) {
        setVisible(false);
        return;
      }
      const { data } = await supabase
        .from('pulses')
        .select('id,creator_id,status')
        .eq('title', title)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      const owned = data?.creator_id === user.id && data.status !== 'hidden';
      setVisible(Boolean(owned));
      setPulseId(data?.id || '');
    };

    const observer = new MutationObserver(() => { void inspect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    void inspect();
    return () => { mounted = false; observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!visible || !pulseId) return;
    return addDeleteButton(pulseId, setBusy, setError, busy);
  }, [visible, pulseId, busy]);

  if (!error) return null;
  return <div aria-live="polite" style={{ position: 'fixed', left: '50%', bottom: 90, transform: 'translateX(-50%)', zIndex: 120, maxWidth: 'calc(100% - 36px)', padding: '10px 14px', borderRadius: 14, background: '#f3ddd5', color: '#6f3427', fontSize: 11, fontWeight: 800 }}>{error}</div>;
}
