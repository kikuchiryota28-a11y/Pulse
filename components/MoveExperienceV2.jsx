'use client';

import { motion } from 'framer-motion';
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

const PANEL = 'rounded-3xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-2xl';
const META = 'font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase';

function stateVisual(state, label) {
  return <div className={`${PANEL} p-4`}>
    <div className="mb-3 flex items-center justify-between"><span className={META}>{label}</span><span className="font-mono text-[10px] text-zinc-600">{String(state?.index ?? 0).padStart(2, '0')}</span></div>
    <p className="text-sm font-semibold leading-6 text-[#FAFAFA]">{state?.summary || 'The Pulse is waiting for its first change.'}</p>
    {state?.media && <img src={state.media} alt="Pulse state" className="mt-3 max-h-56 w-full rounded-2xl object-cover" />}
  </div>;
}

function ChoiceInput({ choices, value, onChange }) {
  return <div className="grid gap-2">{choices.map((item, index) => <button key={item} type="button" onClick={() => onChange(item)} className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left transition ${value === item ? 'border-[#00FF87]/50 bg-[#00FF87] text-black' : 'border-white/[0.05] bg-white/[0.02] text-white hover:bg-white/[0.05]'}`}>
    <span className="text-[13px] font-bold">{item}</span><span className={`${META} !text-zinc-600`}>0{index + 1}</span>
  </button>)}</div>;
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
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try { setBusy(true); setError(''); setPhoto(await imageFileToDataUrl(file)); }
    catch (e) { setError(e?.message || 'Could not read the image.'); }
    finally { setBusy(false); }
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
      return photo ? buildMoveContent({ inputType: 'mixed', photo, caption: cleanText(text || caption, 160) }) : buildMoveContent({ inputType: 'mixed', text: cleanText(text, 500) });
    }
    const clean = cleanText(text, 500);
    if (!clean) throw new Error('Add one thing that changes the Pulse.');
    return buildMoveContent({ inputType: 'text', text: clean });
  };

  const advance = () => {
    setError('');
    try {
      const content = makeContent();
      setCompleted({ content, after: { ...before, index: moves.length + 1, source: 'move', summary: contentPreview(content, 220), media: mediaFromContent(content), lastAction: director.actionType, changedAt: new Date().toISOString() } });
      setStep('changed');
    } catch (e) { setError(e?.message || 'Make one change first.'); }
  };

  const submit = async () => {
    if (busy || !completed) return;
    setBusy(true); setError('');
    try {
      const revision = Number.isInteger(pulse.revision) ? pulse.revision : Number(before.revision || 0);
      const submissionId = crypto.randomUUID();
      const { error: insertError } = await supabase.from('pulse_moves').insert({
        pulse_id: pulse.id, actor_id: actor, parent_move_id: latest?.id || null, depth: moves.length + 1,
        action_type: director.actionType, input_type: director.inputType, prompt: director.prompt,
        content: compactContent(completed.content), state_before: { ...before, revision },
        state_after: { ...completed.after, revision: revision + 1 }, submission_id: submissionId, revision_before: revision,
      });
      if (insertError) throw insertError;
      setStep('next'); setTimeout(() => onSubmitted?.(), 650);
    } catch (e) {
      const message = String(e?.message || '');
      if (message.includes('cannot make the next move')) setError('You started this Pulse, so another person must make the next move.');
      else if (message.includes('duplicate') || String(e?.code || '') === '23505') setError('This move was already submitted.');
      else if (String(e?.code || '') === '40001') setError('This Pulse changed while you were here. Close this and try again.');
      else setError(e?.message || 'Could not save your move.');
      setStep('act');
    } finally { setBusy(false); }
  };

  const errorBlock = error && <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[11px] font-bold text-red-300">{error}</div>;

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4">
    <motion.section initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-t-3xl border border-white/[0.05] bg-[#060608] p-5 text-[#FAFAFA] shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-7">
      <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />
      <div className="mb-6 flex items-start justify-between gap-6">
        <div><p className={META}>{step === 'act' ? 'YOUR MOVE' : step === 'changed' ? 'THE PULSE CHANGED' : 'MOVE SENT'}</p><h2 className="mt-3 font-black tracking-tighter text-4xl uppercase leading-[0.85] text-white">{step === 'act' ? director.title : step === 'changed' ? 'See what your move did.' : 'It is moving again.'}</h2></div>
        <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.05] bg-white/[0.02] text-white" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>

      {step === 'act' && <>
        <div className={`${PANEL} mb-5 p-4`}><div className="flex items-center gap-2"><Sparkles size={13} className="text-[#00FF87]" /><span className={META}>WHY THIS MOVE</span></div><p className="mt-3 text-[13px] font-semibold leading-5 text-[#FAFAFA]">{director.prompt}</p><p className="mt-2 text-[11px] leading-5 text-zinc-500">{director.hint}</p></div>
        <div className="mb-5 grid gap-3">{stateVisual(before, 'CURRENT STATE')}<div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.05] bg-white/[0.02] text-zinc-500"><ChevronDown size={15} /></div></div>
        {director.inputType === 'choice' && <ChoiceInput choices={director.choices.length ? director.choices : meta.choices || ['The detail', 'The whole scene', 'The feeling', 'The question']} value={choice} onChange={setChoice} />}
        {director.inputType === 'text' && <div><label className={`mb-2 block ${META}`}>YOUR INPUT</label><textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={meta.prompt || 'Add the next piece…'} className="min-h-36 w-full resize-none rounded-3xl border border-white/[0.05] bg-white/[0.02] p-4 text-sm font-semibold text-white placeholder:text-zinc-600 outline-none focus:border-[#00FF87]/40" /></div>}
        {(director.inputType === 'photo' || director.inputType === 'mixed') && <div>
          <div className={`${PANEL} overflow-hidden`}>
            {photo ? <img src={photo} alt="Your move preview" className="max-h-64 w-full object-cover" /> : <div className="grid min-h-52 place-items-center p-6 text-center"><Camera size={30} className="text-zinc-600" /><p className="mt-3 max-w-[240px] text-[13px] font-bold text-zinc-300">{director.inputType === 'mixed' ? 'Bring something real into the Pulse, then add your interpretation.' : 'Bring one real thing from your surroundings into the Pulse.'}</p></div>}
            <div className="p-3"><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} /><button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00FF87] px-4 py-3 text-[12px] font-black text-black"><Camera size={15} /> {photo ? 'Replace photo' : 'Choose photo'}</button></div>
          </div>
          {director.inputType === 'mixed' && <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="What does this add or change?" className="mt-3 min-h-28 w-full resize-none rounded-3xl border border-white/[0.05] bg-white/[0.02] p-4 text-[13px] font-semibold text-white placeholder:text-zinc-600 outline-none" />}
          {director.inputType === 'photo' && <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={160} placeholder="One sentence is enough." className="mt-3 w-full rounded-3xl border border-white/[0.05] bg-white/[0.02] p-4 text-[13px] font-semibold text-white placeholder:text-zinc-600 outline-none" />}
        </div>}
        {errorBlock}
        <button type="button" onClick={advance} disabled={busy} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#00FF87] px-5 text-[13px] font-black text-black transition active:scale-[0.99] disabled:opacity-50">Change the Pulse <ArrowRight size={16} /></button>
      </>}

      {step === 'changed' && completed && <>
        <div className="grid gap-3">{stateVisual(before, 'BEFORE')}<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#00FF87] text-black"><ArrowRight size={16} /></div><div className="rounded-3xl border border-[#00FF87]/20 bg-white/[0.02] p-4"><div className={META}>YOUR MOVE · {director.actionType}</div><p className="mt-2 text-sm font-bold leading-6 text-white">{contentPreview(completed.content, 220)}</p>{mediaFromContent(completed.content) && <img src={mediaFromContent(completed.content)} alt="Your move" className="mt-3 max-h-56 w-full rounded-2xl object-cover" />}</div>{stateVisual(completed.after, 'AFTER')}</div>
        <div className={`${PANEL} mt-5 p-4`}><p className="text-[11px] font-bold leading-5 text-zinc-400">Your move becomes part of the Pulse. The next person will act on this new state.</p></div>
        {errorBlock}
        <div className="mt-5 flex gap-2"><button type="button" onClick={() => setStep('act')} className="min-h-13 flex-1 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 text-[12px] font-black text-white">Change</button><button type="button" onClick={submit} disabled={busy} className="flex min-h-13 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[#00FF87] px-4 text-[12px] font-black text-black disabled:opacity-50">{busy ? 'Saving…' : 'Send this move'} {!busy && <Check size={15} />}</button></div>
      </>}

      {step === 'next' && <div className="py-10 text-center"><motion.div initial={{ scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#00FF87] text-black"><Check size={25} /></motion.div><h3 className="mt-5 font-black tracking-tighter text-3xl uppercase text-white">The state changed.</h3><p className="mx-auto mt-2 max-w-[300px] text-[13px] font-semibold leading-6 text-zinc-500">Your Move is now part of the chain. Someone else gets the next turn.</p></div>}
    </motion.section>
  </div>;
}
