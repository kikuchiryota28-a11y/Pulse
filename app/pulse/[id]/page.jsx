'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Heart, Share2, Users, Zap, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { actorId, buildMoveContent, contentFromMove, contentPreview, formatRelative, mediaFromContent, participantCount, seedFromPulse, directorFor, cleanText, compactContent, buildState } from '../../../lib/pulse-social';

function Media({ src, alt }) {
  if (!src) return <div className="h-full min-h-[280px] rounded-[24px] bg-black/[.035]" />;
  return <img src={src} alt={alt || 'Pulse'} className="h-full min-h-[280px] w-full object-cover" />;
}

export default function PulseDeepLink({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const id = params?.id;

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
    const idValue = actorId();
    setActor(idValue);
    load();
    setMoveOpen(searchParams.get('move') === '1');
  }, [id, searchParams]);

  useEffect(() => {
    if (!pulse?.id) return;
    const channel = supabase
      .channel(`pulse-deep-link:${pulse.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pulses', filter: `id=eq.${pulse.id}` }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulse_moves', filter: `pulse_id=eq.${pulse.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pulse?.id]);

  const seed = pulse ? seedFromPulse(pulse) : null;
  const ordered = useMemo(() => [...moves].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [moves]);
  const current = ordered.at(-1);
  const currentMedia = mediaFromContent(current?.content) || seed?.dataUrl;
  const joined = ordered.some((m) => m.actor_id === actor);
  const director = useMemo(() => pulse ? directorFor({ intent: pulse.intent, pulse, moves: ordered }) : null, [pulse, ordered]);

  const share = async () => {
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copy this Pulse link', url); }
  };

  const like = async () => {
    if (!pulse) return;
    const next = !liked;
    setLiked(next);
    try {
      if (next) await supabase.from('pulse_reactions').insert({ pulse_id: pulse.id, actor_id: actor, reaction: 'like' });
      else await supabase.from('pulse_reactions').delete().eq('pulse_id', pulse.id).eq('actor_id', actor).eq('reaction', 'like');
    } catch { setLiked(!next); }
  };

  const submitMove = async () => {
    const text = cleanText(draft, 500);
    if (!text || !pulse || busy) return;
    setBusy(true); setMoveError('');
    try {
      if (joined) throw new Error('You already changed this Pulse. Come back later to see what happened next.');
      const content = buildMoveContent({ inputType: 'text', text });
      const stateBefore = buildState({ pulse, moves: ordered });
      const { error: insertError } = await supabase.from('pulse_moves').insert({
        pulse_id: pulse.id,
        actor_id: actor,
        parent_move_id: current?.id || null,
        depth: (current?.depth || 0) + 1,
        action_type: director?.actionType || 'interpret',
        input_type: 'text',
        prompt: director?.prompt || 'Change this in your own words.',
        content: compactContent(content),
        state_before: stateBefore,
        state_after: { ...stateBefore, summary: contentPreview(content, 220), media: mediaFromContent(content), lastAction: director?.actionType || 'interpret' },
      });
      if (insertError) throw insertError;
      setDraft('');
      setMoveOpen(false);
      await load();
    } catch (e) {
      setMoveError(e?.message || 'Could not save your move.');
    } finally { setBusy(false); }
  };

  if (loading) return <main className="min-h-screen bg-[#f4f1e9] px-5 py-6"><div className="mx-auto max-w-[760px] animate-pulse space-y-4"><div className="h-10 w-24 rounded-full bg-black/[.05]"/><div className="h-[420px] rounded-[28px] bg-black/[.05]"/><div className="h-32 rounded-[24px] bg-black/[.05]"/></div></main>;
  if (error || !pulse) return <main className="min-h-screen bg-[#f4f1e9] flex items-center justify-center px-6"><div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-sm"><AlertTriangle size={22}/><h1 className="mt-4 text-2xl font-semibold tracking-[-.03em]">Pulse unavailable</h1><p className="mt-2 text-sm text-black/55">{error || 'This Pulse could not be found.'}</p><div className="mt-6 flex gap-2"><button onClick={load} className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white flex items-center gap-2"><RefreshCw size={15}/> Retry</button><button onClick={() => router.push('/')} className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold">Back to Pulses</button></div></div></main>;

  return <main className="min-h-screen bg-[#f4f1e9] text-[#20221d]">
    <div className="mx-auto max-w-[760px] px-4 pb-32 pt-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold backdrop-blur"><ArrowLeft size={15}/> Back</button>
        <div className="flex gap-2"><button onClick={like} aria-label="Like" className={`grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white ${liked ? 'text-red-500' : ''}`}><Heart size={17} fill={liked ? 'currentColor' : 'none'}/></button><button onClick={share} aria-label="Share" className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white"><Share2 size={17}/></button></div>
      </div>
      <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[30px] bg-white shadow-[0_20px_70px_rgba(0,0,0,.07)]">
        <div className="aspect-[4/3] w-full"><Media src={currentMedia} alt={pulse.title}/></div>
        <div className="p-6 sm:p-8"><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.14em] text-black/45"><span>{pulse.status === 'active' ? 'STILL MOVING' : 'COMPLETED'}</span><span>{formatRelative(pulse.updated_at)}</span></div><h1 className="mt-3 text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-[.96] tracking-[-.055em]">{pulse.title}</h1><p className="mt-4 text-sm leading-6 text-black/55">{pulse.intent || 'People are changing this post one move at a time.'}</p><div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-semibold text-black/50"><span className="inline-flex items-center gap-1.5"><Users size={14}/>{participantCount(ordered)} changed</span><span className="inline-flex items-center gap-1.5"><Zap size={13}/>{ordered.length} moves</span></div></div>
      </motion.article>
      <div className="mt-5 rounded-[22px] border border-black/10 bg-white/70 px-5 py-4 text-sm font-medium">{pulse.status === 'active' ? 'This post is still moving. You can change what happens next.' : 'This Pulse has stopped moving. Explore how it changed.'}</div>
      <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[.14em] text-black/45">Trace</h2><span className="text-xs text-black/40">{ordered.length} moves</span></div><div className="space-y-3"><div className="rounded-[22px] border border-black/10 bg-white p-5"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-black/40">START</div><p className="mt-2 text-sm leading-6">{seed?.text || 'The starting state of this Pulse.'}</p></div>{ordered.map((move, i) => <motion.div key={move.id} initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-[22px] border border-black/10 bg-white p-5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.14em] text-black/40">MOVE {i + 1}</span><span className="text-[9px] font-bold uppercase tracking-[.12em] text-black/35">{move.action_type}</span></div><p className="mt-2 text-sm leading-6">{contentPreview(contentFromMove(move), 240)}</p>{mediaFromContent(contentFromMove(move)) && <img src={mediaFromContent(contentFromMove(move))} alt="Move result" className="mt-3 max-h-[340px] w-full rounded-2xl object-cover"/>}<div className="mt-3 text-[10px] font-semibold text-black/35">{move.actor_id === actor ? 'YOU' : 'SOMEONE'} · {formatRelative(move.created_at)}</div></motion.div>)}</div></section>
      {pulse.status === 'active' && !joined && <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-[#f4f1e9]/95 p-3 backdrop-blur-xl"><div className="mx-auto flex max-w-[760px] items-center justify-between gap-3"><div><div className="text-sm font-semibold">Change this Pulse.</div><div className="text-[11px] text-black/45">Your move becomes the next person's context.</div></div><button onClick={() => setMoveOpen(true)} className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-bold text-white">Make a move <ArrowRight size={14}/></button></div></div>}
    </div>
    {moveOpen && pulse.status === 'active' && !joined && <div className="fixed inset-0 z-30 bg-black/30 p-4 backdrop-blur-sm" onClick={() => setMoveOpen(false)}><div className="mx-auto mt-auto max-w-[760px] rounded-[28px] bg-[#f4f1e9] p-5 shadow-2xl sm:mt-[12vh]" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-black/40">YOUR MOVE</div><div className="mt-1 text-xl font-semibold tracking-[-.03em]">{director?.prompt || 'Change what happens next.'}</div></div><button onClick={() => setMoveOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white"><X size={16}/></button></div><textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder="What do you add, change, or notice?" className="mt-5 min-h-[180px] w-full resize-none rounded-[22px] border border-black/10 bg-white p-4 text-sm outline-none focus:border-black/30"/><div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-black/40">{draft.length}/500</span><button disabled={!draft.trim() || busy} onClick={submitMove} className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-bold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Submit move'} <ArrowRight size={14}/></button></div>{moveError && <p className="mt-3 text-xs font-medium text-red-600">{moveError}</p>}</div></div>}
  </main>;
}
