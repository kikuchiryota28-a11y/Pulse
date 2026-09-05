'use client';

import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import MoveExperienceV2 from './MoveExperienceV2';

function hideLegacySheet(sheet) {
  if (!sheet) return;
  sheet.dataset.pulseLegacyHidden = '1';
  sheet.style.display = 'none';
  const backdrop = document.querySelector('.sheet-backdrop:not([data-pulse-bridge])');
  if (backdrop) {
    backdrop.dataset.pulseBridge = '1';
    backdrop.style.display = 'none';
  }
}

function closeLegacySheet() {
  const sheet = document.querySelector('.sheet[aria-label="Make a move"]');
  const closeButton = sheet?.querySelector('button[aria-label="Close"]');
  if (closeButton) closeButton.click();
}

export default function MoveExperienceBridge() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(null);
  const [moves, setMoves] = useState([]);
  const [actor, setActor] = useState('');
  const legacyRef = useRef(null);

  useEffect(() => {
    const getActor = () => {
      let value = window.localStorage.getItem('pulse:social:actor');
      if (!value) {
        value = `a_${crypto.randomUUID()}`;
        window.localStorage.setItem('pulse:social:actor', value);
      }
      return value;
    };

    const inspect = async () => {
      const sheet = document.querySelector('.sheet[aria-label="Make a move"]');
      if (!sheet || sheet === legacyRef.current) return;
      legacyRef.current = sheet;
      hideLegacySheet(sheet);
      const currentActor = getActor();
      const title = document.querySelector('.pulse-detail-title')?.textContent?.trim();
      if (!title) return;

      const { data: pulseRow } = await supabase
        .from('pulses')
        .select('*')
        .eq('title', title)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!pulseRow || pulseRow.creator_id === currentActor) return;

      const { data: moveRows } = await supabase
        .from('pulse_moves')
        .select('*')
        .eq('pulse_id', pulseRow.id)
        .order('created_at', { ascending: true });

      setActor(currentActor);
      setPulse(pulseRow);
      setMoves(moveRows || []);
      setOpen(true);
    };

    const observer = new MutationObserver(() => { void inspect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    void inspect();
    return () => observer.disconnect();
  }, []);

  const close = () => {
    closeLegacySheet();
    setOpen(false);
    setPulse(null);
    setMoves([]);
    legacyRef.current = null;
  };

  const submitted = () => {
    closeLegacySheet();
    setOpen(false);
    setPulse(null);
    setMoves([]);
    legacyRef.current = null;
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {open && pulse && (
        <MoveExperienceV2
          pulse={pulse}
          moves={moves}
          actor={actor}
          onClose={close}
          onSubmitted={submitted}
        />
      )}
    </AnimatePresence>
  );
}
