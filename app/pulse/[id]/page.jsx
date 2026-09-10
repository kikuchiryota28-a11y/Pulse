'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Heart, Share2, Users, Layers3, RefreshCw, X, RotateCcw, Camera, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { actorId, buildMoveContent, contentFromMove, contentPreview, formatRelative, mediaFromContent, participantCount, seedFromPulse, directorFor, cleanText } from '../../../lib/pulse-social';
import '../../../src/pulse-design-system.css';

function Media({ src, alt }) {
  return src ? <img src={src} alt={alt || 'Pulse'} className="pulse-v1-media-img" /> : <div className="pulse-v1-media-empty" aria-hidden="true" />;
}

function JoinFlow({ director, draft, setDraft, photo, setPhoto, caption, setCaption, onSubmit, busy, error, onClose }) {
  const [step, setStep] = useState(1);
  const inputType = director?.inputType || 'text';
  const choices = director?.choices || [];
  const canContinue = inputType === 'choice' ? Boolean(draft) : Boolean(draft.trim() || photo);

  const onPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const reset = () => { setStep(1); setDraft(''); setPhoto(''); setCaption(''); };

  return (
    <div className="pulse-v1-overlay" role="dialog" aria-modal="true" aria-labelledby="join-title">
      <div className="pulse-v1-sheet pulse-join-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pulse-v1-grip" aria-hidden="true" />
        <div className="pulse-join-progress" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((n) => <span key={n} className={step >= n ? 'active' : ''} />)}
        </div>
        <div className="pulse-v1-sheet-head">
          <div>
            <div className="precision-label">{step === 1 ? 'YOUR TURN' : step === 2 ? 'MAKE IT YOURS' : 'READY?'}</div>
            <h2 id="join-title" className="pulse-v1-sheet-title">
              {step === 1 ? (director?.title || 'Change what happens next.') : step === 2 ? 'Add your piece.' : 'Send it into the chain.'}
            </h2>
          </div>
          <button className="precision-icon" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </div>

        {step === 1 && <>
          <p className="precision-body">{director?.prompt || 'Add one thing that changes the current Pulse.'}</p>
          {director?.context && <div className="pulse-join-context"><span>RIGHT NOW</span><strong>{director.context}</strong></div>}
          <button className="pulse-join-primary" onClick={() => setStep(2)}>I'M IN <ArrowRight size={17} /></button>
        </>}

        {step === 2 && <>
          <p className="precision-body">{director?.hint || 'One small contribution is enough.'}</p>
          {inputType === 'choice' && choices.length ? (
            <div className="pulse-v1-choice-list">
              {choices.map((choice) => <button key={choice} className={`pulse-v1-choice ${draft === choice ? 'selected' : ''}`} onClick={() => setDraft(choice)} disabled={busy}>
                <span>{choice}</span>{draft === choice ? <Check size={16} /> : <ArrowRight size={16} />}
              </button>)}
            </div>
          ) : (
            <>
              {(inputType === 'photo' || inputType === 'mixed') && <label className="pulse-photo-drop">
                {photo ? <img src={photo} alt="Your preview" /> : <><Camera size={21} /><strong>Bring a real scene</strong><span>Tap to choose a photo</span></>}
                <input type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
              </label>}
              {(inputType !== 'photo' || photo) && <textarea className="pulse-v1-textarea" value={inputType === 'photo' ? caption : draft} onChange={(e) => inputType === 'photo' ? setCaption(e.target.value) : setDraft(e.target.value)} maxLength={500} autoFocus={inputType !== 'photo'} placeholder={inputType === 'photo' ? 'Optional caption' : 'What do you add, change, or notice?'} disabled={busy} />}
            </>
          )}
          <div className="pulse-join-footer"><button className="pulse-text-button" onClick={() => setStep(1)}>BACK</button><button className="pulse-join-primary compact" disabled={!canContinue} onClick={() => setStep(3)}>PREVIEW <ArrowRight size={15} /></button></div>
        </>}

        {step === 3 && <>
          <div className="pulse-preview-card">
            {photo && <img src={photo} alt="Contribution preview" />}
            <div className="pulse-preview-copy"><span>YOUR CONTRIBUTION</span><strong>{draft || caption || 'A new scene'}</strong></div>
          </div>
          <div className="pulse-preview-chain"><span className="pulse-mini-dot" /><span>YOU</span><ArrowRight size={12} /><span>CHAIN</span><span className="pulse-mini-dot hollow" /></div>
          <div className="pulse-join-footer"><button className="pulse-text-button" onClick={() => setStep(2)} disabled={busy}>EDIT</button><button className="pulse-join-primary compact" disabled={busy} onClick={() => onSubmit(draft || caption || 'A new scene')}>{busy ? 'ADDING…' : 'ADD TO CHAIN'} <ArrowRight size={15} /></button></div>
        </>}
        {error && <p className="pulse-v1-error">{error}</p>}
        <button className="pulse-join-reset" onClick={reset}>Reset this turn</button>
      </div>
    </div>
  );
}

function Consequence({ result, onContinue }) {
  if (!result) return null;
  return <AnimatePresence><motion.div className="pulse-v1-consequence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="consequence-title">
    <div className="pulse-v1-consequence-inner">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
        <div className="precision-label precision-label-dark">YOU'RE IN</div>
        <h2 id="consequence-title" className="pulse-v1-consequence-title">YOU CHANGED<br />THE PULSE.</h2>
      </motion.div>
      <motion.div className="pulse-v1-cause" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 }}>
        <div className="pulse-v1-flow-label"><span>YOUR CONTRIBUTION</span><b>→</b><span>NEW STATE</span></div>
        <p>{contentPreview(contentFromMove(result), 260)}</p>
      </motion.div>
      <motion.div className="pulse-v1-state-dark" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .22 }}>
        <div className="precision-label precision-label-dark">WHAT CHANGED</div>
        <p>{result.state_after?.summary || 'Your contribution is now part of the Pulse.'}</p>
      </motion.div>
      <motion.div className="pulse-v1-next-dark pulse-next-confirm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .34 }}>
        <div><div className="precision-label precision-label-dark">NEXT</div><strong>Someone else can change it now.</strong></div>
        <button onClick={onContinue} className="precision-button">SEE CHAIN <ArrowRight size={16} /></button>
      </motion.div>
    </div>
  </motion.div></AnimatePresence>;
}

function Reveal({ pulse, ordered, seed, actor, onBack }) {
  const steps = [
    { label: 'IT STARTED HERE', text: seed?.text || 'This Pulse began with a simple seed.' },
    ...ordered.flatMap((move, i) => [
      { label: move.actor_id === actor ? 'YOU CHANGED THIS' : `STEP ${i + 1}`, text: contentPreview(contentFromMove(move), 220) },
      { label: 'STATE CHANGED', text: move.state_after?.summary || 'The Pulse moved forward.' },
    ]),
  ];
  return <main className="pulse-reveal-mode">
    <div className="pulse-reveal-top"><button className="pulse-reveal-back" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button><span>PULSE</span><span>{ordered.length} STEPS</span></div>
    <div className="pulse-reveal-story">
      <div className="precision-label reveal-muted">HOW IT CHANGED</div>
      <h1>{pulse.title}</h1>
      <p className="pulse-reveal-intro">One person after another, until it became this.</p>
      <div className="pulse-reveal-timeline">{steps.map((step, i) => <motion.section key={`${step.label}-${i}`} className="pulse-reveal-step" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-20%' }} transition={{ duration: .5, delay: Math.min(i * .04, .24) }}><div className="reveal-node" /><div className="reveal-label">{step.label}</div><div className="reveal-text">{step.text}</div></motion.section>)}</div>
      <section className="pulse-reveal-final"><div className="reveal-label">THE RESULT</div><h2>{pulse.title}</h2><p>{ordered.length ? `${participantCount(ordered)} people changed it.` : 'It never changed.'}</p></section>
    </div>
  </main>;
}

function Chain({ ordered, seed, actor, chainRef }) {
  return <section className="pulse-v1-trace-panel pulse-chain-panel" ref={chainRef}>
    <div className="pulse-chain-heading"><div><div className="precision-label">THE CHAIN</div><h2>See who changed what.</h2></div><span><Users size={13} /> {participantCount(ordered)} people</span></div>
    <div className="pulse-chain">
      <div className="pulse-chain-node seed-node"><div className="pulse-chain-avatar">P</div><div><span>START</span><strong>{contentPreview(seed, 150)}</strong></div></div>
      {ordered.map((move, i) => <div className="pulse-chain-step" key={move.id}>
        <div className="pulse-chain-action"><span>STEP {i + 1}</span><strong>{move.action_type || 'change'}</strong></div>
        <div className={`pulse-chain-node ${move.actor_id === actor ? 'you-node' : ''}`}><div className="pulse-chain-avatar">{move.actor_id === actor ? 'YOU' : String(move.actor_id || 'P').replace(/^a_/, '').slice(0, 2).toUpperCase()}</div><div><span>{move.actor_id === actor ? 'YOU' : 'SOMEONE'} · {formatRelative(move.created_at)}</span><strong>{contentPreview(contentFromMove(move), 150)}</strong></div></div>
      </div>)}
    </div>
  </section>;
}

export default function PulseDeepLink({ params }) {
  const routeParams = use(params); const router = useRouter(); const searchParams = useSearchParams(); const id = routeParams?.id;
  const [pulse, setPulse] = useState(null); const [moves, setMoves] = useState([]); const [actor, setActor] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [liked, setLiked] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false); const [draft, setDraft] = useState(''); const [photo, setPhoto] = useState(''); const [caption, setCaption] = useState(''); const [busy, setBusy] = useState(false); const [moveError, setMoveError] = useState(''); const [lastMoveResult, setLastMoveResult] = useState(null); const [revealOpen, setRevealOpen] = useState(false);
  const chainRef = useRef(null);

  const load = async () => {
    if (!id) return; setLoading(true); setError('');
    try {
      const [{ data: p, error: pe }, { data: m, error: me }] = await Promise.all([
        supabase.from('pulses').select('*').eq('id', id).maybeSingle(),
        supabase.from('pulse_moves').select('*').eq('pulse_id', id).order('created_at', { ascending: true }),
      ]);
      if (pe) throw pe; if (me) throw me; if (!p) throw new Error('This Pulse is no longer available.');
      setPulse(p); setMoves(m || []);
    } catch (e) { setError(e?.message || 'Could not open this Pulse.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setActor(actorId()); setMoveOpen(searchParams.get('move') === '1'); load(); }, [id, searchParams]);
  useEffect(() => { if (!pulse?.id) return; const channel = supabase.channel(`pulse-deep-link:${pulse.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'pulses', filter: `id=eq.${pulse.id}` }, load).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulse_moves', filter: `pulse_id=eq.${pulse.id}` }, load).subscribe(); return () => { supabase.removeChannel(channel); }; }, [pulse?.id]);
  useEffect(() => { if (!lastMoveResult) return; window.setTimeout(() => chainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); }, [lastMoveResult]);

  const ordered = useMemo(() => [...moves].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [moves]);
  const current = ordered.at(-1) || null; const joined = ordered.some((m) => m.actor_id === actor); const isCreator = Boolean(pulse && pulse.creator_id === actor);
  const director = useMemo(() => pulse ? directorFor({ intent: pulse.intent, pulse, moves: ordered }) : null, [pulse, ordered]);
  const seed = pulse ? seedFromPulse(pulse) : null; const currentMedia = mediaFromContent(current?.content) || seed?.dataUrl;
  const canJoin = pulse?.status === 'active' && !joined && !isCreator;

  const share = async () => {
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ title: pulse?.title || 'Pulse', text: 'See what happened in this Pulse.', url }); else await navigator.clipboard.writeText(url); }
    catch { try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copy this Pulse link', url); } }
  };

  const like = async () => {
    if (!pulse || !actor) return; const next = !liked; setLiked(next);
    try { if (next) { const { error: e } = await supabase.from('pulse_reactions').insert({ pulse_id: pulse.id, actor_id: actor, reaction: 'like' }); if (e) throw e; } else { const { error: e } = await supabase.from('pulse_reactions').delete().eq('pulse_id', pulse.id).eq('actor_id', actor).eq('reaction', 'like'); if (e) throw e; } }
    catch { setLiked(!next); }
  };

  const submitJoin = async (raw) => {
    const clean = cleanText(raw, 500); if (!pulse || busy || isCreator) return; setBusy(true); setMoveError('');
    try {
      if (pulse.status !== 'active') throw new Error('THIS PULSE HAS ALREADY ENDED.');
      if (joined) throw new Error('You already joined this Pulse. Come back later to see what happened.');
      if (!actor) throw new Error('Your Pulse identity is not ready yet.');
      const submissionId = crypto.randomUUID(); const inputType = director?.inputType || 'text';
      const content = buildMoveContent({ inputType, text: clean, photo, choice: inputType === 'choice' ? clean : undefined, caption });
      const { data: move, error: rpcError } = await supabase.rpc('submit_pulse_move', {
        p_pulse_id: pulse.id, p_actor_id: actor, p_parent_move_id: current?.id || null, p_action_type: director?.actionType || 'interpret', p_input_type: inputType,
        p_prompt: director?.prompt || 'Change what happens next.', p_content: content, p_submission_id: submissionId, p_expected_revision: Number(pulse.revision || 0),
      });
      if (rpcError) throw rpcError; if (!move?.id) throw new Error('Your contribution could not be confirmed.');
      setDraft(''); setPhoto(''); setCaption(''); setMoveOpen(false); setLastMoveResult(move); await load();
    } catch (e) {
      const message = e?.message || 'Could not add your contribution.';
      if (message.toLowerCase().includes('changed before your move')) { await load(); setMoveError('Someone got there first. The Pulse just changed.'); }
      else setMoveError(message);
    } finally { setBusy(false); }
  };

  if (loading) return <main className="pulse-v1-page"><div className="pulse-v1-skeleton"><div /><div /><div /></div></main>;
  if (error || !pulse) return <main className="pulse-v1-page pulse-v1-center"><div className="precision-card pad"><div className="precision-label">PULSE UNAVAILABLE</div><h1 className="pulse-page-title">Something changed.</h1><p className="precision-body">{error || 'This Pulse could not be found.'}</p><button className="precision-button" onClick={load}><RefreshCw size={14} /> Retry</button></div></main>;
  if (pulse.status !== 'active' || revealOpen) return <Reveal pulse={pulse} ordered={ordered} seed={seed} actor={actor} onBack={() => setRevealOpen(false)} />;

  const stateText = current?.state_after?.summary || seed?.text || 'A new Pulse is waiting for its first change.';
  return <main className="pulse-v1-page">
    <header className="pulse-v1-topbar"><button className="precision-icon" onClick={() => router.back()} aria-label="Back"><ArrowLeft size={17} /></button><div className="pulse-v1-wordmark">PULSE</div><div className="pulse-v1-top-actions"><button className={`precision-icon ${liked ? 'is-liked' : ''}`} onClick={like} aria-label="Like"><Heart size={17} fill={liked ? 'currentColor' : 'none'} /></button><button className="precision-icon" onClick={share} aria-label="Share"><Share2 size={17} /></button></div></header>
    <div className="pulse-v1-detail">
      <section className="pulse-v1-detail-intro"><div className="pulse-detail-status"><span className="pulse-move-chip live">{pulse.status === 'active' ? 'LIVE' : 'ENDED'}</span><span><Users size={12} /> {participantCount(ordered)} joined</span><span><Layers3 size={12} /> {ordered.length} steps</span></div><h1>{pulse.title}</h1><p>{pulse.intent || 'Someone starts. Someone else changes what happens next.'}</p></section>
      <section className="pulse-v1-detail-grid">
        <div className="pulse-v1-state-panel"><div className="pulse-state-head"><div className="precision-label">RIGHT NOW</div><span>{formatRelative(pulse.updated_at)}</span></div><p>{stateText}</p><div className="pulse-v1-state-media"><Media src={currentMedia} alt="Current Pulse state" /></div></div>
        <Chain ordered={ordered} seed={seed} actor={actor} chainRef={chainRef} />
        <div className="pulse-v1-action-panel"><div className="precision-label">YOUR TURN</div><h2>{director?.title || 'Change what happens next.'}</h2><p>{director?.prompt || 'Add one thing that changes the current state.'}</p>{isCreator ? <div className="pulse-v1-notice">YOU STARTED THIS PULSE.<br />Someone else needs to take the next turn.</div> : joined ? <div className="pulse-v1-notice">YOU'RE ALREADY IN.<br />Come back to see what happens after your contribution.</div> : <button className="pulse-v1-move" onClick={() => setMoveOpen(true)} disabled={!canJoin}><span>JOIN PULSE</span><ArrowRight size={18} /></button>}</div>
      </section>
      {joined && <div className="revisit-box"><strong>Your part is in the chain.</strong><p>Check back later to see how another person changed what came after you.</p><button className="precision-button secondary" onClick={load}>REVISIT <RotateCcw size={14} /></button></div>}
    </div>
    {moveOpen && canJoin && <JoinFlow director={director} draft={draft} setDraft={setDraft} photo={photo} setPhoto={setPhoto} caption={caption} setCaption={setCaption} onSubmit={submitJoin} busy={busy} error={moveError} onClose={() => setMoveOpen(false)} />}
    {lastMoveResult && <Consequence result={lastMoveResult} onContinue={() => setLastMoveResult(null)} />}
  </main>;
}
