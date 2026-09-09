'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Heart, Share2, Users, Zap, AlertTriangle, RefreshCw, X, RotateCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import {
  actorId,
  buildMoveContent,
  contentFromMove,
  contentPreview,
  formatRelative,
  mediaFromContent,
  participantCount,
  seedFromPulse,
  directorFor,
  cleanText,
} from '../../../lib/pulse-social';

function Media({ src, alt }) {
  if (!src) return <div className="h-full min-h-[280px] rounded-[24px] bg-black/[.035]" />;
  return <img src={src} alt={alt || 'Pulse'} className="h-full min-h-[280px] w-full object-cover" />;
}

function MoveEditor({ director, draft, setDraft, onSubmit, busy, error, onClose }) {
  const choices = director?.choices || [];
  const inputType = director?.inputType || 'text';

  return (
    <div className="fixed inset-0 z-40 bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto mt-auto max-w-[760px] rounded-[28px] bg-[#f4f1e9] p-5 shadow-2xl sm:mt-[10vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.15em] text-black/40">YOUR MOVE</div>
            <div className="mt-1 text-xl font-semibold tracking-[-.03em]">{director?.title || 'Change what happens next.'}</div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p className="mt-3 max-w-[620px] text-sm leading-6 text-black/55">{director?.prompt || 'Add something that changes the current state.'}</p>

        {inputType === 'choice' && choices.length > 0 ? (
          <div className="mt-5 grid gap-2">
            {choices.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => onSubmit(choice)}
                disabled={busy}
                className="flex items-center justify-between rounded-[18px] border border-black/10 bg-white px-4 py-4 text-left text-sm font-semibold transition hover:-translate-y-[1px] disabled:opacity-50"
              >
                <span>{choice}</span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        ) : (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              autoFocus
              placeholder={director?.hint || 'What do you add, change, or notice?'}
              className="mt-5 min-h-[180px] w-full resize-none rounded-[22px] border border-black/10 bg-white p-4 text-sm outline-none focus:border-black/30"
              disabled={busy}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-black/40">{draft.length}/500</span>
              <button
                disabled={!draft.trim() || busy}
                onClick={() => onSubmit(draft)}
                className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-bold text-white disabled:opacity-40"
              >
                {busy ? 'Moving…' : 'Move'} <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
        {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function Consequence({ result, onContinue }) {
  if (!result) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#20221d]/92 px-5 py-8 text-[#f4f1e9] backdrop-blur-xl"
      >
        <div className="mx-auto flex min-h-full max-w-[760px] flex-col justify-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }}>
            <div className="text-[10px] font-bold uppercase tracking-[.18em] text-white/45">CONSEQUENCE</div>
            <h2 className="mt-3 text-[clamp(2.5rem,10vw,5rem)] font-semibold leading-[.9] tracking-[-.06em]">YOU MOVED.</h2>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .22 }} className="mt-10 rounded-[28px] bg-white/[.08] p-6 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-white/45"><span>YOUR MOVE</span><span>→</span><span>PULSE CHANGED</span></div>
            <p className="mt-4 text-xl leading-8">{contentPreview(contentFromMove(result), 260)}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .38 }} className="mt-4 rounded-[28px] border border-white/10 bg-white/[.04] p-6">
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-white/40">NEW STATE</div>
            <p className="mt-3 text-lg leading-8 text-white/85">{result.state_after?.summary || 'The Pulse now contains your move.'}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .52 }} className="mt-5 flex items-center justify-between gap-4 text-sm">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-white/35">NEXT PERSON</div>
              <div className="mt-1 font-semibold text-white/85">Someone else can move this Pulse now.</div>
            </div>
            <button onClick={onContinue} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f4f1e9] text-[#20221d]" aria-label="Continue">
              <ArrowRight size={18} />
            </button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function PulseDeepLink({ params }) {
  const routeParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = routeParams?.id;
  const [pulse, setPulse] = useState(null);
  const [moves, setMoves] = useState([]);
  const [actor, setActor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [moveError, setMoveError] = useState('');
  const [lastMoveResult, setLastMoveResult] = useState(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [{ data: p, error: pe }, { data: m, error: me }] = await Promise.all([
        supabase.from('pulses').select('*').eq('id', id).maybeSingle(),
        supabase.from('pulse_moves').select('*').eq('pulse_id', id).order('created_at', { ascending: true }),
      ]);
      if (pe) throw pe;
      if (me) throw me;
      if (!p) throw new Error('This Pulse is no longer available.');
      setPulse(p);
      setMoves(m || []);
    } catch (e) {
      setError(e?.message || 'Could not open this Pulse.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActor(actorId());
    setMoveOpen(searchParams.get('move') === '1');
    load();
  }, [id, searchParams]);

  useEffect(() => {
    if (!pulse?.id) return;
    const channel = supabase.channel(`pulse-deep-link:${pulse.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pulses', filter: `id=eq.${pulse.id}` }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulse_moves', filter: `pulse_id=eq.${pulse.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pulse?.id]);

  const seed = pulse ? seedFromPulse(pulse) : null;
  const ordered = useMemo(() => [...moves].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [moves]);
  const current = ordered.at(-1) || null;
  const joined = ordered.some((m) => m.actor_id === actor);
  const isCreator = Boolean(pulse && pulse.creator_id === actor);
  const director = useMemo(() => pulse ? directorFor({ intent: pulse.intent, pulse, moves: ordered }) : null, [pulse, ordered]);
  const currentMedia = mediaFromContent(current?.content) || seed?.dataUrl;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: pulse?.title || 'Pulse', text: 'See what happened in this Pulse.', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copy this Pulse link', url); }
    }
  };

  const like = async () => {
    if (!pulse || !actor) return;
    const next = !liked;
    setLiked(next);
    try {
      if (next) {
        const { error: e } = await supabase.from('pulse_reactions').insert({ pulse_id: pulse.id, actor_id: actor, reaction: 'like' });
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('pulse_reactions').delete().eq('pulse_id', pulse.id).eq('actor_id', actor).eq('reaction', 'like');
        if (e) throw e;
      }
    } catch {
      setLiked(!next);
    }
  };

  const submitMove = async (rawText) => {
    const text = cleanText(rawText, 500);
    if (!text || !pulse || busy || isCreator) return;
    setBusy(true);
    setMoveError('');
    try {
      if (pulse.status !== 'active') throw new Error('This Pulse is no longer accepting moves.');
      if (joined) throw new Error('You already changed this Pulse. Come back later to see what happened next.');
      if (!actor) throw new Error('Your Pulse identity is not ready yet.');

      const submissionId = crypto.randomUUID();
      const actionType = director?.actionType || 'interpret';
      const inputType = director?.inputType || 'text';
      const content = buildMoveContent({ inputType, text, choice: inputType === 'choice' ? text : undefined });

      const { data: move, error: rpcError } = await supabase.rpc('submit_pulse_move', {
        p_pulse_id: pulse.id,
        p_actor_id: actor,
        p_parent_move_id: current?.id || null,
        p_action_type: actionType,
        p_input_type: inputType,
        p_prompt: director?.prompt || 'Change what happens next.',
        p_content: content,
        p_submission_id: submissionId,
        p_expected_revision: Number(pulse.revision || 0),
      });

      if (rpcError) throw rpcError;
      if (!move?.id) throw new Error('The Pulse changed, but the move result could not be confirmed.');
      setDraft('');
      setMoveOpen(false);
      setLastMoveResult(move);
      await load();
    } catch (e) {
      const message = e?.message || 'Could not save your move.';
      if (message.toLowerCase().includes('changed before your move')) {
        await load();
        setMoveError('Someone moved first. The Pulse has been updated — look at the new state and try again.');
      } else {
        setMoveError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const continueAfterConsequence = async () => {
    setLastMoveResult(null);
    await load();
  };

  if (loading) return <main className="min-h-screen bg-[#f4f1e9] px-5 py-6"><div className="mx-auto max-w-[760px] animate-pulse space-y-4"><div className="h-10 w-24 rounded-full bg-black/[.05]"/><div className="h-[420px] rounded-[28px] bg-black/[.05]"/><div className="h-32 rounded-[24px] bg-black/[.05]"/></div></main>;

  if (error || !pulse) return <main className="min-h-screen bg-[#f4f1e9] flex items-center justify-center px-6"><div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-sm"><AlertTriangle size={22}/><h1 className="mt-4 text-2xl font-semibold tracking-[-.03em]">Pulse unavailable</h1><p className="mt-2 text-sm text-black/55">{error || 'This Pulse could not be found.'}</p><div className="mt-6 flex gap-2"><button onClick={load} className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white flex items-center gap-2"><RefreshCw size={15}/> Retry</button><button onClick={() => router.push('/')} className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold">Back to Pulses</button></div></div></main>;

  const canMove = pulse.status === 'active' && !joined && !isCreator;

  return <main className="min-h-screen bg-[#f4f1e9] text-[#20221d]">
    <div className="mx-auto max-w-[760px] px-4 pb-32 pt-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold backdrop-blur"><ArrowLeft size={15}/> Back</button>
        <div className="flex gap-2">
          <button onClick={like} aria-label="Like" className={`grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white ${liked ? 'text-red-500' : ''}`}><Heart size={17} fill={liked ? 'currentColor' : 'none'}/></button>
          <button onClick={share} aria-label="Share" className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white"><Share2 size={17}/></button>
        </div>
      </div>

      <motion.article initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} className="overflow-hidden rounded-[30px] bg-white shadow-[0_20px_70px_rgba(0,0,0,.07)]">
        <div className="aspect-[4/3] w-full"><Media src={currentMedia} alt={pulse.title}/></div>
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.14em] text-black/45"><span>{pulse.status === 'active' ? 'STILL MOVING' : 'COMPLETED'}</span><span>{formatRelative(pulse.updated_at)}</span></div>
          <h1 className="mt-3 text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-[.96] tracking-[-.055em]">{pulse.title}</h1>
          <p className="mt-4 text-sm leading-6 text-black/55">{pulse.intent || 'Someone starts. Someone else changes it.'}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-semibold text-black/50"><span className="inline-flex items-center gap-1.5"><Users size={14}/>{participantCount(ordered)} people moved</span><span className="inline-flex items-center gap-1.5"><Zap size={13}/>{ordered.length} moves</span></div>
        </div>
      </motion.article>

      <section className="mt-6 rounded-[26px] border border-black/10 bg-white/75 p-5 sm:p-6">
        <div className="text-[10px] font-bold uppercase tracking-[.16em] text-black/40">THE MOVE BEFORE YOU</div>
        <div className="mt-3 rounded-[20px] bg-black/[.035] p-4">
          <p className="text-sm leading-6">{current ? contentPreview(contentFromMove(current), 220) : seed?.text || 'This Pulse is waiting for its first human move.'}</p>
          <div className="mt-3 text-[10px] font-semibold uppercase tracking-[.12em] text-black/35">{current ? 'Someone moved' : 'Seed'}</div>
        </div>
        <div className="mt-5 flex items-center gap-3 text-black/25"><div className="h-px flex-1 bg-black/10"/><ArrowRight size={15}/><div className="h-px flex-1 bg-black/10"/></div>
        <div className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-black/40">CURRENT STATE</div>
        <p className="mt-2 text-base leading-7 text-black/80">{current ? current.state_after?.summary || 'The Pulse changed.' : seed?.text || 'A new world is waiting for a first move.'}</p>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[.14em] text-black/45">TRACE</h2><span className="text-xs text-black/40">{ordered.length} moves</span></div>
        <div className="space-y-3">
          <div className="rounded-[22px] border border-black/10 bg-white p-5"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-black/40">START</div><p className="mt-2 text-sm leading-6">{seed?.text || 'The starting state of this Pulse.'}</p></div>
          {ordered.map((move, i) => <motion.div key={move.id} initial={{opacity:0,x:10}} whileInView={{opacity:1,x:0}} viewport={{once:true}} className="rounded-[22px] border border-black/10 bg-white p-5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-black/40">MOVE {i + 1}</span><span className="text-[9px] font-bold uppercase tracking-[.12em] text-black/35">{move.action_type}</span></div><p className="mt-2 text-sm leading-6">{contentPreview(contentFromMove(move),240)}</p>{mediaFromContent(contentFromMove(move)) && <img src={mediaFromContent(contentFromMove(move))} alt="Move result" className="mt-3 max-h-[340px] w-full rounded-2xl object-cover"/>}<div className="mt-3 text-[10px] font-semibold text-black/35">{move.actor_id === actor ? 'YOU' : 'SOMEONE'} · {formatRelative(move.created_at)}</div></motion.div>)}
        </div>
      </section>

      <section className="mt-8 rounded-[24px] border border-black/10 bg-white/65 p-5">
        {isCreator ? (
          <div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-black/40">CREATOR</div><p className="mt-2 text-sm leading-6 text-black/65">You started this Pulse. You can watch it change, but you cannot make the next move yourself.</p></div>
        ) : joined ? (
          <div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-black/40">YOUR TRACE</div><p className="mt-2 text-sm leading-6 text-black/65">You already moved this Pulse. Come back later to see what happened after you.</p><button onClick={load} className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold"><RotateCcw size={14}/> See what changed</button></div>
        ) : pulse.status !== 'active' ? (
          <div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-black/40">COMPLETED</div><p className="mt-2 text-sm leading-6 text-black/65">This Pulse has stopped moving. Follow the chain above to see how it got here.</p></div>
        ) : (
          <div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-black/40">YOUR MOVE</div><p className="mt-2 text-sm leading-6 text-black/65">{director?.prompt || 'Change what happens next.'}</p><button onClick={() => setMoveOpen(true)} disabled={!canMove} className="mt-4 flex w-full items-center justify-between rounded-[18px] bg-black px-4 py-4 text-sm font-semibold text-white disabled:opacity-40"><span>Make the next move</span><ArrowRight size={16}/></button></div>
        )}
      </section>
    </div>

    {canMove && <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-[#f4f1e9]/95 p-3 backdrop-blur-xl"><div className="mx-auto flex max-w-[760px] items-center justify-between gap-3"><div><div className="text-sm font-semibold">Change this Pulse.</div><div className="text-[11px] text-black/45">Your move becomes the next person's context.</div></div><button onClick={() => setMoveOpen(true)} className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-bold text-white">Move <ArrowRight size={14}/></button></div></div>}
    {moveOpen && canMove && <MoveEditor director={director} draft={draft} setDraft={setDraft} onSubmit={submitMove} busy={busy} error={moveError} onClose={() => setMoveOpen(false)}/>}    
    {lastMoveResult && <Consequence result={lastMoveResult} onContinue={continueAfterConsequence}/>}  
  </main>;
}
