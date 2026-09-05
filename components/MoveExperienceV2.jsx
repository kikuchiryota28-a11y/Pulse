'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Camera, Check, ChevronDown, Sparkles, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ACTION_CATALOG, buildMoveContent, buildState, cleanText, compactContent,
  contentPreview, directorFor, mediaFromContent
} from '../lib/pulse-social';

async function imageFileToDataUrl(file, maxSide = 1200, quality = 0.72) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose an image.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Please choose an image under 12 MB.');
  const source = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare this image.');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return canvas.toDataURL('image/jpeg', quality);
}

function stateVisual(state, label) {
  return (
    <div className="rounded-[22px] border border-black/8 bg-black/[0.025] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-[0.18em] opacity-50">{label}</span>
        <span className="text-[9px] font-bold opacity-45">{state?.index ?? 0}</span>
      </div>
      <p className="text-[14px] font-semibold leading-6">{state?.summary || 'The Pulse is waiting for its first change.'}</p>
      {state?.media && <img src={state.media} alt="Pulse state" className="mt-3 max-h-56 w-full rounded-[16px] object-cover" />}
    </div>
  );
}

function ChoiceInput({ choices, value, onChange }) {
  return (
    <div className="grid gap-2">
      {choices.map((item) => (
        <button key={item} type="button" onClick={() => onChange(item)} className={`flex min-h-14 items-center justify-between rounded-[18px] border px-4 text-left transition ${value === item ? 'border-black/35 bg-black text-white' : 'border-black/10 bg-white/60 hover:bg-white'}`}>
          <span className="text-[13px] font-bold">{item}</span>
          <span className={`h-3 w-3 rounded-full border ${value === item ? 'border-white bg-white' : 'border-black/20'}`} />
        </button>
      ))}
    </div>
  );
}

export default function MoveExperienceV2({ pulse, moves, actor, onClose, onSubmitted }) {
  const fileRef = useRef(null);
  const latest = moves.at(-1);
  const director = useMemo(() => directorFor({ intent: pulse.intent, pulse, moves }), [pulse, moves]);
  const before = useMemo(() => buildState({ pulse, moves }), [pulse, moves]);
  const [text, setText] = useState('');
  const [choice, setChoice] = useState('');
  const [photo, setPhoto] = useState('');
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState('act');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(null);

  const meta = ACTION_CATALOG[director.actionType] || {};

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setBusy(true);
      setError('');
      setPhoto(await imageFileToDataUrl(file));
    } catch (e) {
      setError(e?.message || 'Could not read the image.');
    } finally {
      setBusy(false);
    }
  };

  const makeContent = () => {
    if (director.inputType === 'choice') {
      if (!choice) throw new Error('Choose one to move the Pulse.');
      return buildMoveContent({ inputType: 'choice', choice });
    }
    if (director.inputType === 'photo') {
      if (!photo) throw new Error('Bring one real thing into the Pulse.');
      return buildMoveContent({ inputType: 'photo', photo, caption });
    }
    if (director.inputType === 'mixed') {
      if (!photo && !cleanText(text)) throw new Error('Make one change before continuing.');
      return photo
        ? buildMoveContent({ inputType: 'mixed', photo, caption: cleanText(text || caption, 160) })
        : buildMoveContent({ inputType: 'mixed', text: cleanText(text, 500) });
    }
    const clean = cleanText(text, 500);
    if (!clean) throw new Error('Add one thing that changes the Pulse.');
    return buildMoveContent({ inputType: 'text', text: clean });
  };

  const previewAfter = () => {
    try {
      const content = makeContent();
      return {
        ...before,
        index: moves.length + 1,
        source: 'move',
        summary: contentPreview(content, 220),
        media: mediaFromContent(content),
        lastAction: director.actionType,
        changedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  };

  const advance = () => {
    setError('');
    if (step === 'act') {
      try {
        const content = makeContent();
        setCompleted({ content, after: { ...before, index: moves.length + 1, source: 'move', summary: contentPreview(content, 220), media: mediaFromContent(content), lastAction: director.actionType, changedAt: new Date().toISOString() } });
        setStep('changed');
      } catch (e) {
        setError(e?.message || 'Make one change first.');
      }
    }
  };

  const submit = async () => {
    if (busy || !completed) return;
    setBusy(true);
    setError('');
    try {
      const revision = Number.isInteger(pulse.revision) ? pulse.revision : Number(before.revision || 0);
      const submissionId = crypto.randomUUID();
      const { error: insertError } = await supabase.from('pulse_moves').insert({
        pulse_id: pulse.id,
        actor_id: actor,
        parent_move_id: latest?.id || null,
        depth: moves.length + 1,
        action_type: director.actionType,
        input_type: director.inputType,
        prompt: director.prompt,
        content: compactContent(completed.content),
        state_before: { ...before, revision },
        state_after: { ...completed.after, revision: revision + 1 },
        submission_id: submissionId,
        revision_before: revision,
      });
      if (insertError) throw insertError;
      setStep('next');
      setTimeout(() => onSubmitted?.(), 650);
    } catch (e) {
      const message = String(e?.message || '');
      if (message.includes('cannot make the next move')) setError('You started this Pulse, so another person must make the next move.');
      else if (message.includes('duplicate') || String(e?.code || '') === '23505') setError('This move was already submitted.');
      else if (String(e?.code || '') === '40001') setError('This Pulse changed while you were here. Close this and try again.');
      else setError(e?.message || 'Could not save your move.');
      setStep('act');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/20 backdrop-blur-[3px] sm:items-center">
      <motion.section initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-t-[32px] bg-[#f4f1e8] p-5 pb-7 shadow-2xl sm:rounded-[32px] sm:p-7">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-black/15" />
        <div className="mb-5 flex items-start justify-between gap-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-45">{step === 'act' ? 'YOUR MOVE' : step === 'changed' ? 'THE PULSE CHANGED' : 'MOVE SENT'}</p>
            <h2 className="mt-2 text-[27px] font-black leading-[1.05] tracking-[-0.035em]">{step === 'act' ? director.title : step === 'changed' ? 'See what your move did.' : 'It is moving again.'}</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-black/5" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {step === 'act' && <>
          <div className="mb-4 rounded-[22px] border border-black/8 bg-white/45 p-4">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] opacity-50"><Sparkles size={13} /> Why this move</div>
            <p className="mt-2 text-[13px] font-semibold leading-5">{director.prompt}</p>
            <p className="mt-2 text-[11px] leading-5 opacity-55">{director.hint}</p>
          </div>

          <div className="mb-5 grid gap-3">
            {stateVisual(before, 'CURRENT STATE')}
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/65"><ChevronDown size={15} /></div>
          </div>

          {director.inputType === 'choice' && <ChoiceInput choices={director.choices.length ? director.choices : meta.choices || ['The detail', 'The whole scene', 'The feeling', 'The question']} value={choice} onChange={setChoice} />}
          {director.inputType === 'text' && <div><label className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] opacity-50">YOUR INPUT</label><textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={meta.prompt || 'Add the next piece…'} className="min-h-36 w-full resize-none rounded-[22px] border border-black/10 bg-white/70 p-4 text-[14px] font-semibold outline-none transition focus:border-black/25" /></div>}
          {(director.inputType === 'photo' || director.inputType === 'mixed') && <div>
            <div className="overflow-hidden rounded-[22px] border border-black/10 bg-white/55">
              {photo ? <img src={photo} alt="Your move preview" className="max-h-64 w-full object-cover" /> : <div className="grid min-h-52 place-items-center p-6 text-center"><Camera size={30} className="opacity-35" /><p className="mt-3 max-w-[240px] text-[13px] font-bold">{director.inputType === 'mixed' ? 'Bring something real into the Pulse, then add your interpretation.' : 'Bring one real thing from your surroundings into the Pulse.'}</p></div>}
              <div className="p-3"><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} /><button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-black px-4 py-3 text-[12px] font-black text-white"><Camera size={15} /> {photo ? 'Replace photo' : 'Choose photo'}</button></div>
            </div>
            {director.inputType === 'mixed' && <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="What does this add or change?" className="mt-3 min-h-28 w-full resize-none rounded-[20px] border border-black/10 bg-white/70 p-4 text-[13px] font-semibold outline-none" />}
            {director.inputType === 'photo' && <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={160} placeholder="One sentence is enough." className="mt-3 w-full rounded-[18px] border border-black/10 bg-white/70 p-4 text-[13px] font-semibold outline-none" />}
          </div>}

          {error && <div className="mt-4 rounded-[16px] border border-red-900/10 bg-red-50 px-4 py-3 text-[11px] font-bold text-red-900">{error}</div>}
          <button type="button" onClick={advance} disabled={busy} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-[19px] bg-black px-5 text-[13px] font-black text-white transition active:scale-[0.99] disabled:opacity-50">Change the Pulse <ArrowRight size={16} /></button>
        </>}

        {step === 'changed' && completed && <>
          <div className="grid gap-3">
            {stateVisual(before, 'BEFORE')}
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-black text-white"><ArrowRight size={16} /></div>
            <div className="rounded-[22px] border border-black/10 bg-black p-4 text-white"><div className="text-[9px] font-black uppercase tracking-[0.18em] opacity-55">YOUR MOVE · {director.actionType}</div><p className="mt-2 text-[14px] font-bold leading-6">{contentPreview(completed.content, 220)}</p>{mediaFromContent(completed.content) && <img src={mediaFromContent(completed.content)} alt="Your move" className="mt-3 max-h-56 w-full rounded-[16px] object-cover" />}</div>
            {stateVisual(completed.after, 'AFTER')}
          </div>
          <div className="mt-5 rounded-[19px] bg-white/55 p-4"><p className="text-[11px] font-bold leading-5 opacity-60">Your move becomes part of the Pulse. The next person will act on this new state.</p></div>
          {error && <div className="mt-4 rounded-[16px] border border-red-900/10 bg-red-50 px-4 py-3 text-[11px] font-bold text-red-900">{error}</div>}
          <div className="mt-5 flex gap-2"><button type="button" onClick={() => setStep('act')} className="min-h-13 flex-1 rounded-[18px] border border-black/10 bg-white/60 px-4 text-[12px] font-black">Change</button><button type="button" onClick={submit} disabled={busy} className="flex min-h-13 flex-[1.4] items-center justify-center gap-2 rounded-[18px] bg-black px-4 text-[12px] font-black text-white disabled:opacity-50">{busy ? 'Saving…' : 'Send this move'} {!busy && <Check size={15} />}</button></div>
        </>}

        {step === 'next' && <div className="py-10 text-center"><motion.div initial={{ scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-black text-white"><Check size={25} /></motion.div><h3 className="mt-5 text-[22px] font-black">The state changed.</h3><p className="mx-auto mt-2 max-w-[300px] text-[13px] font-semibold leading-6 opacity-60">Your Move is now part of the chain. Someone else gets the next turn.</p></div>}
      </motion.section>
    </div>
  );
}
