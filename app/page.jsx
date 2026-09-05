'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Bell, Camera, Check, ChevronRight, Compass,
  Heart, ImagePlus, Menu, Plus, RefreshCw, Search, Send, Share2, Sparkles,
  User, Users, Wand2, X, Zap
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ACTION_CATALOG, ACTIONS, actorId, buildMoveContent, buildState, cleanText,
  compactContent, contentFromMove, contentPreview, deriveTitle, directorFor, formatRelative,
  initials, mediaFromContent, normalizeSeed, participantCount, scorePulse, seedFromPulse
} from '../lib/pulse-social';

const ONBOARDING_KEY = 'pulse:social:onboarded';
const DRAFT_KEY = 'pulse:social:draft';

function readLocal(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}

async function imageFileToDataUrl(file, maxSide = 1200, quality = .72) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose an image.');
  const source = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return canvas.toDataURL('image/jpeg', quality);
}

function IconButton({ children, label, onClick }) {
  return <button className="icon-button" aria-label={label} onClick={onClick}>{children}</button>;
}

function PulseImage({ src, alt = 'Pulse', className = '' }) {
  if (!src) return <div className={`media-placeholder ${className}`}><ImagePlus size={25} /></div>;
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}

function Avatar({ actor = 'pulse', size = 'small', profile }) {
  const label = profile?.display_name || profile?.username || actor;
  return <span className={`avatar avatar-${size}`} style={size === 'small' ? { width: 26, height: 26, borderRadius: 9, fontSize: 8, overflow: 'hidden' } : undefined}>{profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(label)}</span>;
}

function BottomNav({ screen, go }) {
  return <nav className="bottom-nav"><div className="bottom-nav-inner">
    <button className={`nav-item ${screen === 'home' ? 'active' : ''}`} onClick={() => go('home')}><Compass size={19}/><span>Pulses</span></button>
    <button className={`nav-item ${screen === 'activity' ? 'active' : ''}`} onClick={() => go('activity')}><Bell size={19}/><span>Activity</span></button>
    <button className="nav-item" aria-label="Create" onClick={() => go('create')}><span className="nav-create"><Plus size={22}/></span><span>Create</span></button>
    <button className={`nav-item ${screen === 'search' ? 'active' : ''}`} onClick={() => go('search')}><Search size={19}/><span>Explore</span></button>
    <button className={`nav-item ${screen === 'you' ? 'active' : ''}`} onClick={() => go('you')}><User size={19}/><span>You</span></button>
  </div></nav>;
}

function Header({ onSearch, onActivity }) {
  return <header className="pulse-header">
    <button className="pulse-wordmark" onClick={() => onSearch?.('home')}>pulse</button>
    <div className="pulse-header-actions">
      <IconButton label="Search" onClick={() => onSearch?.('search')}><Search size={18}/></IconButton>
      <IconButton label="Activity" onClick={onActivity}><Bell size={18}/></IconButton>
    </div>
  </header>;
}

function LikeButton({ liked = false, count = 0, onClick, detail = false }) {
  return <button className="icon-button" style={{ width: detail ? 40 : 38, height: detail ? 40 : 38, gap: 5, color: liked ? 'var(--pulse-ink)' : undefined }} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked} onClick={onClick}>
    <Heart size={detail ? 17 : 16} fill={liked ? 'currentColor' : 'none'} />
    {count > 0 && <span style={{ fontSize: 10, fontWeight: 800 }}>{count}</span>}
  </button>;
}

function PulseCard({ pulse, moves, actor, reaction, onOpen, onLike }) {
  const seed = seedFromPulse(pulse);
  const latest = moves.at(-1);
  const media = mediaFromContent(latest?.content) || seed?.dataUrl;
  const summary = latest ? contentPreview(latest.content, 105) : cleanText(seed?.text || pulse.intent || 'A new Pulse', 105);
  const people = participantCount(moves);
  const live = pulse.status === 'active';
  return <motion.article className="pulse-card" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: .995 }} onClick={() => onOpen(pulse.id)}>
    <div className="pulse-card-media"><PulseImage src={media} alt={pulse.title}/></div>
    <div className="pulse-card-body">
      <div className="pulse-kicker"><span className="inline-flex items-center gap-2">{live && <i className="pulse-live-dot"/>}{live ? 'STILL MOVING' : 'COMPLETED'}</span><span>{formatRelative(pulse.updated_at)}</span></div>
      <h2 className="pulse-card-title">{pulse.title}</h2>
      <p className="pulse-card-copy">{summary}</p>
      <div className="pulse-card-meta">
        <div className="pulse-stats"><Users size={14}/><span>{people || 0} changed</span><Zap size={13}/><span>{moves.length} moves</span></div>
        <div className="flex items-center gap-2"><LikeButton liked={reaction?.liked} count={reaction?.count || 0} onClick={(e) => { e.stopPropagation(); onLike?.(pulse.id); }}/><button className="pulse-join" onClick={(e) => { e.stopPropagation(); onOpen(pulse.id); }}>{live ? 'JOIN' : 'SEE TRACE'} <ArrowRight size={14}/></button></div>
      </div>
    </div>
  </motion.article>;
}

function LoadingCards() {
  return <div className="feed-stack">{[1,2,3].map((i) => <div key={i} className="pulse-card" style={{ minHeight: 410, background: 'rgba(255,255,255,.35)' }}><div style={{ height: 280, background: 'rgba(32,34,29,.035)' }}/><div className="pulse-card-body"><div style={{ width: 90, height: 8, borderRadius: 99, background: 'rgba(32,34,29,.08)' }}/><div style={{ width: '65%', height: 22, marginTop: 11, borderRadius: 8, background: 'rgba(32,34,29,.08)' }}/><div style={{ width: '100%', height: 12, marginTop: 9, borderRadius: 7, background: 'rgba(32,34,29,.06)' }}/></div></div>)}</div>;
}

function Home({ pulses, groupedMoves, actor, reactions, loading, filter, setFilter, onOpen, onLike, onCreate }) {
  const filtered = useMemo(() => {
    const list = [...pulses];
    if (filter === 'moving') return list.filter((p) => p.status === 'active').sort((a,b) => scorePulse(b, groupedMoves[b.id] || []) - scorePulse(a, groupedMoves[a.id] || []));
    if (filter === 'new') return list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return list.sort((a,b) => scorePulse(b, groupedMoves[b.id] || []) - scorePulse(a, groupedMoves[a.id] || []));
  }, [pulses, groupedMoves, filter]);

  return <main className="screen">
    <Header onSearch={(where) => where === 'search' && document.dispatchEvent(new CustomEvent('pulse:search'))} onActivity={() => document.dispatchEvent(new CustomEvent('pulse:activity'))}/>
    <div className="pulse-content">
      <section className="pulse-feature"><div><h1>See what<br/>people are changing.</h1><p>Pulse is a social feed where posts are not finished when they are posted. Someone else can move them.</p></div><button className="pulse-feature-mark" onClick={onCreate}><Sparkles size={19}/></button></section>
      <div className="pulse-tabs">
        <button className={`pulse-tab ${filter === 'for-you' ? 'active' : ''}`} onClick={() => setFilter('for-you')}>For you</button>
        <button className={`pulse-tab ${filter === 'moving' ? 'active' : ''}`} onClick={() => setFilter('moving')}>Moving</button>
        <button className={`pulse-tab ${filter === 'new' ? 'active' : ''}`} onClick={() => setFilter('new')}>New</button>
      </div>
      {loading ? <LoadingCards/> : filtered.length ? <div className="feed-stack">
        {filtered.map((pulse) => <PulseCard key={pulse.id} pulse={pulse} moves={groupedMoves[pulse.id] || []} actor={actor} reaction={reactions[pulse.id]} onOpen={onOpen} onLike={onLike}/>) }
      </div> : <div className="pulse-empty"><Sparkles size={22}/><h3>Nothing is moving yet.</h3><p>Start the first Pulse. Put something into the feed and leave room for someone else to change it.</p><button className="primary-button" style={{ marginTop: 18 }} onClick={onCreate}>Start something <ArrowRight size={15}/></button></div>}
    </div>
  </main>;
}

function Detail({ pulse, moves, actor, reaction, onBack, onJoin, onShare, onLike }) {
  const seed = seedFromPulse(pulse);
  const seedMedia = seed?.dataUrl;
  const sorted = [...moves].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  const hasJoined = sorted.some((m) => m.actor_id === actor);
  const isCreator = pulse.creator_id === actor;
  const latest = sorted.at(-1);
  const currentMedia = mediaFromContent(latest?.content) || seedMedia;
  return <main className="screen pulse-detail fade-in">
    <div className="pulse-content">
      <div className="screen-toolbar"><button className="back-row" onClick={onBack}><IconButton label="Back"><ArrowLeft size={18}/></IconButton></button><div className="flex gap-2"><LikeButton liked={reaction?.liked} count={reaction?.count || 0} detail onClick={() => onLike?.(pulse.id)}/><IconButton label="Share" onClick={onShare}><Share2 size={17}/></IconButton></div></div>
      <article className="pulse-detail-hero">
        <div className="pulse-detail-media"><PulseImage src={currentMedia} alt={pulse.title}/></div>
        <div className="pulse-detail-head"><div className="pulse-kicker"><span className="inline-flex items-center gap-2">{pulse.status === 'active' && <i className="pulse-live-dot"/>}{pulse.status === 'active' ? 'STILL MOVING' : 'COMPLETED'}</span><span>{formatRelative(pulse.created_at)}</span></div><h1 className="pulse-detail-title">{pulse.title}</h1><p className="pulse-detail-intent">{pulse.intent || 'No intent was written. The meaning is being made by the people who change it.'}</p></div>
        <div className="pulse-detail-footer"><div className="pulse-stats"><Users size={14}/><span>{participantCount(sorted)} people</span><Zap size={13}/><span>{sorted.length} moves</span></div><span className="muted text-[11px] font-bold">by someone</span></div>
      </article>
      <div className="live-strip"><Sparkles size={15}/><span>{pulse.status === 'active' ? (isCreator ? 'You started this Pulse. Someone else has to make the next move.' : 'The post is still open. One more person can change it.') : 'This Pulse has stopped moving. Explore how it changed.'}</span></div>
      <section><div className="profile-section-title">The trace</div><div className="trace">
        <div className="trace-item"><div className="trace-rail"/><div className="trace-node">0</div><div className="trace-card"><h4>The starting point</h4><p>{seed?.text || 'A visual starting point.'}</p>{seedMedia && <img src={seedMedia} alt="Starting point"/>}</div></div>
        {sorted.map((move, index) => { const c = contentFromMove(move); return <div className="trace-item" key={move.id}><div className="trace-rail"/><div className="trace-node">{index + 1}</div><div className="trace-card"><div className="flex items-center justify-between gap-3"><h4>{move.actor_id === actor ? 'You changed it' : 'Someone changed it'}</h4><span className="muted text-[9px] font-bold uppercase tracking-[.12em]">{move.action_type}</span></div><p>{contentPreview(c, 220)}</p>{mediaFromContent(c) && <img src={mediaFromContent(c)} alt="Move"/>}<div className="mt-2 flex items-center gap-2"><Avatar actor={move.actor_id}/><span className="muted text-[9px] font-bold">{formatRelative(move.created_at)}</span></div></div></div>; })}
        {pulse.status === 'active' && <div className="trace-item"><div className="trace-node" style={{ borderStyle: 'dashed' }}>+</div><div className="trace-card"><h4>Next move</h4><p>{isCreator ? 'Your Pulse is waiting for someone else.' : 'Whoever enters next gets to decide what this becomes.'}</p></div></div>}
      </div></section>
    </div>
    {pulse.status === 'active' && !hasJoined && !isCreator && <div className="detail-cta"><span>Change this post.</span><button onClick={onJoin}>Make a move <ArrowRight size={15}/></button></div>}
  </main>;
}

function MoveSheet({ pulse, moves, actor, onClose, onSubmitted }) {
  const fileRef = useRef(null);
  const latest = moves.at(-1);
  const director = useMemo(() => directorFor({ intent: pulse.intent, pulse, moves }), [pulse, moves]);
  const [text, setText] = useState('');
  const [choice, setChoice] = useState('');
  const [photo, setPhoto] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { setBusy(true); setPhoto(await imageFileToDataUrl(file)); } catch(e) { setError(e.message || 'Could not read the image.'); } finally { setBusy(false); } };
  const submit = async () => {
    if (busy) return;
    let content;
    if (director.inputType === 'choice') {
      if (!choice) { setError('Pick one.'); return; }
      content = buildMoveContent({ inputType: 'choice', choice });
    } else if (director.inputType === 'photo' || director.inputType === 'mixed') {
      if (!photo) { setError('Add a photo.'); return; }
      content = buildMoveContent({ inputType: 'photo', photo, caption });
    } else {
      const clean = cleanText(text, 500);
      if (!clean) { setError('Write something first.'); return; }
      content = buildMoveContent({ inputType: 'text', text: clean });
    }
    setBusy(true); setError('');
    try {
      const stateBefore = buildState({ pulse, moves });
      const revision = Number.isInteger(pulse.revision) ? pulse.revision : Number(stateBefore.revision || 0);
      const submissionId = crypto.randomUUID();
      const { error: insertError } = await supabase.from('pulse_moves').insert({
        pulse_id: pulse.id,
        actor_id: actor,
        parent_move_id: latest?.id || null,
        depth: moves.length + 1,
        action_type: director.actionType,
        input_type: director.inputType,
        prompt: director.prompt,
        content: compactContent(content),
        state_before: { ...stateBefore, revision },
        state_after: { ...stateBefore, index: moves.length + 1, summary: contentPreview(content, 220), media: mediaFromContent(content), lastAction: director.actionType },
        submission_id: submissionId,
        revision_before: revision,
      });
      if (insertError) throw insertError;
      onSubmitted();
    } catch (e) {
      const message = String(e?.message || '');
      if (message.includes('cannot make the next move')) setError('You started this Pulse, so another person must make the next move.');
      else if (message.includes('duplicate') || String(e?.code || '') === '23505') setError('This move was already submitted.');
      else if (String(e?.code || '') === '40001') setError('This Pulse changed while you were here. Close this and try again.');
      else setError(e?.message || 'Could not save your move.');
    } finally { setBusy(false); }
  };

  return <><div className="sheet-backdrop" onClick={onClose}/><section className="sheet" role="dialog" aria-modal="true" aria-label="Make a move"><div className="sheet-handle"/><div className="flex items-start justify-between gap-8"><div><p className="pulse-kicker">YOUR TURN</p><h2 className="sheet-title">{director.title}</h2></div><IconButton label="Close" onClick={onClose}><X size={18}/></IconButton></div><p className="sheet-subtitle">{director.prompt}</p>
    <div className="prompt-card"><span className="prompt-label">THE DIRECTOR</span><p>{director.hint}</p></div>
    {director.inputType === 'choice' && <div className="choice-list">{(director.choices.length ? director.choices : ACTION_CATALOG.choose.choices).map((item) => <button key={item} className={`choice-button ${choice === item ? 'selected' : ''}`} onClick={() => setChoice(item)}><span>{item}</span><i className="choice-dot"/></button>)}</div>}
    {(director.inputType === 'text') && <div className="field"><label>Your move</label><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add something that changes the post…" maxLength={500}/><span className="muted text-[9px] font-bold text-right">{text.length}/500</span></div>}
    {(director.inputType === 'photo' || director.inputType === 'mixed') && <div className="media-input">{photo ? <div className="media-preview"><PulseImage src={photo} alt="Your move"/></div> : <div className="media-preview"><div className="media-placeholder"><Camera size={27}/><span>Bring something into the Pulse.</span></div></div>}<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick}/><button className="media-button" onClick={() => fileRef.current?.click()}><Camera size={16}/> {photo ? 'Replace photo' : 'Choose photo'}</button><div className="field"><label>Optional note</label><input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="One sentence is enough." maxLength={160}/></div></div>}
    {error && <div className="error">{error}</div>}
    <div className="sheet-actions"><button className="primary-button" onClick={submit} disabled={busy}>{busy ? 'Changing…' : 'Change the Pulse'} {!busy && <ArrowRight size={15}/>}</button><button className="secondary-button" onClick={onClose}>Later</button></div>
  </section></>;
}

function Create({ onBack, onCreated }) {
  const photoRef = useRef(null);
  const draft = readLocal(DRAFT_KEY, {});
  const [seedType, setSeedType] = useState(draft.seedType || 'photo');
  const [photo, setPhoto] = useState(draft.photo || '');
  const [text, setText] = useState(draft.text || '');
  const [intent, setIntent] = useState(draft.intent || '');
  const [title, setTitle] = useState(draft.title || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState(1);
  const saveDraft = useCallback(() => { if (typeof window !== 'undefined') window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ seedType, photo, text, intent, title })); }, [seedType, photo, text, intent, title]);
  useEffect(() => { saveDraft(); }, [saveDraft]);

  const pick = async (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { setBusy(true); setPhoto(await imageFileToDataUrl(file)); } catch(e) { setError(e.message || 'Could not read image.'); } finally { setBusy(false); } };
  const canNext = stage === 1 ? (seedType === 'photo' ? !!photo : !!cleanText(text)) : !!cleanText(intent);
  const publish = async () => {
    const cleanIntent = cleanText(intent, 500);
    if (!canNext) { setError(stage === 1 ? 'Leave a starting point first.' : 'Tell the Pulse what direction you want it to have.'); return; }
    setBusy(true); setError('');
    try {
      const seed = normalizeSeed({ type: seedType, dataUrl: photo, text });
      const finalTitle = cleanText(title, 80) || deriveTitle({ text: seed.text, intent: cleanIntent, seedType: seed.type });
      const { data, error: insertError } = await supabase.from('pulses').insert({ creator_id: actorId(), seed_type: seed.type, seed: seed, title: finalTitle, intent: cleanIntent, status: 'active', metadata: { version: 'social-v1' } }).select('*').single();
      if (insertError) throw insertError;
      if (typeof window !== 'undefined') window.localStorage.removeItem(DRAFT_KEY);
      onCreated(data);
    } catch(e) { setError(e.message || 'Could not start this Pulse.'); } finally { setBusy(false); }
  };
  return <main className="screen fade-in"><div className="pulse-content">
    <div className="screen-toolbar"><div className="back-row"><IconButton label="Back" onClick={onBack}><ArrowLeft size={18}/></IconButton><span className="screen-title">Start something</span></div><span className="muted text-[10px] font-bold">{stage}/2</span></div>
    {stage === 1 ? <>
      <section className="pulse-feature" style={{ paddingBottom: 16 }}><div><h1>Put something<br/>into the world.</h1><p>It can be ordinary. The interesting part is what somebody else does to it.</p></div></section>
      <div className="create-seed"><div className="seed-switch"><button className={`seed-option ${seedType === 'photo' ? 'active' : ''}`} onClick={() => setSeedType('photo')}><Camera size={15}/> Photo</button><button className={`seed-option ${seedType === 'text' ? 'active' : ''}`} onClick={() => setSeedType('text')}><Wand2 size={15}/> Thought</button></div>
        {seedType === 'photo' ? <div className="media-input">{photo ? <div className="media-preview"><PulseImage src={photo} alt="Starting point"/></div> : <div className="media-preview"><div className="media-placeholder"><Camera size={27}/><span>A place, detail, object, or scene.</span></div></div>}<input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={pick}/><button className="media-button" onClick={() => photoRef.current?.click()}>{photo ? 'Replace starting photo' : 'Choose starting photo'}</button></div> : <div className="field"><label>Starting thought</label><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Leave a thought for somebody else to change…" maxLength={280}/></div>}
      </div>
      {error && <div className="error">{error}</div>}
      <button className="primary-button full-button" style={{ marginTop: 14 }} disabled={!canNext || busy} onClick={() => setStage(2)}>Next <ArrowRight size={15}/></button>
    </> : <>
      <section className="pulse-feature" style={{ paddingBottom: 16 }}><div><h1>Give it<br/>a direction.</h1><p>You are not writing the final task. Tell the system what you want the post to become and let people take it from there.</p></div></section>
      <div className="field"><label>What do you want people to do with it?</label><textarea value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="Make this ordinary place feel personal. Let different people see it differently…" maxLength={500}/></div>
      <div className="field"><label>Title <span className="muted">optional</span></label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short name for the Pulse" maxLength={80}/></div>
      <div className="create-preview"><div className="pulse-kicker"><span>PREVIEW</span><span>the rest is unknown</span></div><div className="preview-flow"><div className="preview-step"><span>01</span><strong>YOUR START</strong></div><div className="preview-step"><span>02</span><strong>SOMEONE MOVES IT</strong></div><div className="preview-step"><span>03</span><strong>THE FEED CHANGES</strong></div></div></div>
      {error && <div className="error">{error}</div>}
      <div className="sheet-actions"><button className="secondary-button" onClick={() => setStage(1)}>Back</button><button className="primary-button" disabled={busy} onClick={publish}>{busy ? 'Publishing…' : 'Publish Pulse'} <Send size={15}/></button></div>
    </>}
  </div></main>;
}

function Activity({ pulses, groupedMoves, actor, onOpen }) {
  const events = useMemo(() => {
    const rows = [];
    for (const p of pulses) {
      for (const m of (groupedMoves[p.id] || []).slice().reverse()) {
        if (m.actor_id === actor) continue;
        rows.push({ id: m.id, type: 'move', pulse: p, move: m, time: m.created_at, text: `Someone changed “${p.title}”.` });
      }
    }
    return rows.sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0, 30);
  }, [pulses, groupedMoves, actor]);
  const mine = pulses.filter((p) => p.creator_id === actor);
  return <main className="screen fade-in"><div className="pulse-content"><div className="screen-toolbar"><span className="screen-title">Activity</span><IconButton label="Refresh" onClick={() => window.location.reload()}><RefreshCw size={17}/></IconButton></div>
    <div className="profile-section-title">Your Pulses moving</div>
    {mine.length ? <div className="activity-list">{mine.slice(0,8).map((p) => <button key={p.id} className="activity-item" onClick={() => onOpen(p.id)}><div className="activity-badge"><Zap size={16}/></div><div><p>{p.title}</p><small>{groupedMoves[p.id]?.length || 0} moves · {p.status}</small></div><ChevronRight size={15} className="activity-arrow"/></button>)}</div> : <div className="pulse-empty"><p>You have not started a Pulse yet.</p></div>}
    <div className="profile-section-title">Recent changes</div>
    {events.length ? <div className="activity-list">{events.map((event) => <button key={event.id} className="activity-item" onClick={() => onOpen(event.pulse.id)}><div className="activity-badge"><Sparkles size={16}/></div><div><p>{event.text}</p><small>{formatRelative(event.time)} · {event.move.action_type}</small></div><ChevronRight size={15} className="activity-arrow"/></button>)}</div> : <div className="pulse-empty"><p>When people change your Pulses, you will see it here.</p></div>}
  </div></main>;
}

function Explore({ pulses, groupedMoves, reactions, search, setSearch, onOpen, onLike }) {
  const q = search.trim().toLowerCase();
  const results = q ? pulses.filter((p) => `${p.title} ${p.intent}`.toLowerCase().includes(q)) : pulses.filter((p) => p.status === 'active');
  return <main className="screen fade-in"><div className="pulse-content"><div className="screen-toolbar"><span className="screen-title">Explore</span></div><div className="field" style={{ marginTop: 0 }}><label>Find a Pulse</label><div style={{ position:'relative' }}><Search size={16} style={{ position:'absolute', left:14, top:15, color:'var(--pulse-muted)' }}/><input style={{ paddingLeft:42 }} autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ideas, places, questions…"/></div></div>
    <div className="profile-section-title">{q ? `${results.length} results` : 'Open now'}</div>
    {results.length ? <div className="feed-stack">{results.map((p) => <PulseCard key={p.id} pulse={p} moves={groupedMoves[p.id] || []} reaction={reactions[p.id]} onOpen={onOpen} onLike={onLike}/>)}</div> : <div className="pulse-empty"><Search size={22}/><h3>No matches.</h3><p>Try a different word. Pulse search works on the Pulse title and intent.</p></div>}
  </div></main>;
}

const profileDefaults = (actor) => ({ actor_id: actor, username: `pulse_${String(actor || '').replace(/^a_/, '').slice(-6).toLowerCase() || 'user'}`.slice(0, 20), display_name: 'Anonymous', bio: 'Known by what I change.', avatar_url: '' });

function ProfileEditor({ profile, onSave, onClose, busy, error }) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => setDraft(profile), [profile]);
  const normalizedUsername = cleanText(draft.username, 20).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  const canSave = normalizedUsername.length >= 3 && cleanText(draft.display_name, 40).length >= 1;
  return <><div className="sheet-backdrop" onClick={onClose}/><section className="sheet" role="dialog" aria-modal="true" aria-label="Edit profile"><div className="sheet-handle"/><div className="flex items-start justify-between gap-8"><div><p className="pulse-kicker">YOUR PROFILE</p><h2 className="sheet-title">Make yourself recognizable.</h2></div><IconButton label="Close" onClick={onClose}><X size={18}/></IconButton></div>
    <div className="profile-hero" style={{ marginTop: 16, marginBottom: 8 }}><div className="avatar avatar-large">{initials(draft.display_name || draft.username)}</div><div><strong>{draft.display_name || 'Anonymous'}</strong><p className="muted" style={{ marginTop: 3 }}>Your profile is about the things you start and change.</p></div></div>
    <div className="field"><label>Username</label><input value={draft.username || ''} onChange={(e) => setDraft((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0,20) }))} placeholder="yourname" maxLength={20}/><span className="muted text-[9px] font-bold">3–20 characters · letters, numbers, underscores</span></div>
    <div className="field"><label>Display name</label><input value={draft.display_name || ''} onChange={(e) => setDraft((p) => ({ ...p, display_name: e.target.value.slice(0,40) }))} placeholder="Your name" maxLength={40}/></div>
    <div className="field"><label>Bio <span className="muted">optional</span></label><textarea value={draft.bio || ''} onChange={(e) => setDraft((p) => ({ ...p, bio: e.target.value.slice(0,160) }))} placeholder="What do you notice, make, or change?" maxLength={160}/></div>
    {error && <div className="error">{error}</div>}
    <div className="sheet-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!canSave || busy} onClick={() => onSave({ ...draft, username: normalizedUsername, display_name: cleanText(draft.display_name, 40), bio: cleanText(draft.bio, 160) })}>{busy ? 'Saving…' : 'Save profile'} <Check size={15}/></button></div>
  </section></>;
}

function You({ pulses, groupedMoves, actor, profile, onOpen, onCreate, onEditProfile }) {
  const mine = pulses.filter((p) => p.creator_id === actor);
  const participated = pulses.filter((p) => (groupedMoves[p.id] || []).some((m) => m.actor_id === actor));
  const moveCount = participated.reduce((n,p) => n + (groupedMoves[p.id] || []).filter((m) => m.actor_id === actor).length, 0);
  return <main className="screen fade-in"><div className="pulse-content"><div className="screen-toolbar"><span className="screen-title">You</span><IconButton label="Edit profile" onClick={onEditProfile}><Menu size={18}/></IconButton></div>
    <section className="profile-hero"><div className="avatar avatar-large">{initials(profile.display_name || profile.username || actor)}</div><div><h2>{profile.display_name || 'Anonymous'}</h2><p>{profile.bio || 'Known by what I change, not by a profile I have to maintain.'}</p><div className="muted" style={{ marginTop: 8, fontWeight: 800, fontSize: 10 }}>@{profile.username}</div></div></section>
    <button className="secondary-button" style={{ width: '100%', marginTop: 10 }} onClick={onEditProfile}>Edit profile</button>
    <div className="profile-stats"><div className="profile-stat"><span>Started</span><strong>{mine.length}</strong></div><div className="profile-stat"><span>Entered</span><strong>{participated.length}</strong></div><div className="profile-stat"><span>Moves</span><strong>{moveCount}</strong></div></div>
    <div className="profile-section-title">Started by you</div>
    {mine.length ? <div className="feed-stack">{mine.map((p) => <PulseCard key={p.id} pulse={p} moves={groupedMoves[p.id] || []} actor={actor} reaction={null} onOpen={onOpen}/>)}</div> : <div className="pulse-empty"><Plus size={21}/><h3>Start your first Pulse.</h3><p>Post a starting point. You decide the direction; someone else decides what happens next.</p><button className="primary-button" style={{ marginTop: 16 }} onClick={onCreate}>Start something <ArrowRight size={15}/></button></div>}
  </div></main>;
}

function Onboarding({ onDone }) {
  return <div className="observer"><div className="observer-card"><div className="observer-mark"><span className="pulse-live-dot"/></div><h1>Post.<br/>Let people<br/>change it.</h1><p>Pulse is a social feed where a post is not the end. Someone else can enter, make one move, and leave the world a little different.</p><button className="primary-button" onClick={onDone}>Enter Pulse <ArrowRight size={16}/></button></div></div>;
}

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [filter, setFilter] = useState('for-you');
  const [pulses, setPulses] = useState([]);
  const [groupedMoves, setGroupedMoves] = useState({});
  const [reactions, setReactions] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [showMove, setShowMove] = useState(false);
  const [activityPulseId, setActivityPulseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [actor, setActor] = useState('');
  const [profile, setProfile] = useState({ actor_id: '', username: 'pulse_user', display_name: 'Anonymous', bio: 'Known by what I change.', avatar_url: '' });
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');

  const loadFeed = useCallback(async (actorOverride = actor) => {
    setLoading(true); setError('');
    try {
      const { data: pulseData, error: pulseError } = await supabase.from('pulses').select('*').neq('status', 'hidden').order('updated_at', { ascending: false }).limit(60);
      if (pulseError) throw pulseError;
      const ids = (pulseData || []).map((p) => p.id);
      let moveData = [];
      let reactionData = [];
      if (ids.length) {
        const { data, error: moveError } = await supabase.from('pulse_moves').select('*').in('pulse_id', ids).order('created_at', { ascending: true });
        if (moveError) throw moveError;
        moveData = data || [];
        const { data: reactionRows, error: reactionError } = await supabase.from('pulse_reactions').select('pulse_id,actor_id,reaction').in('pulse_id', ids).eq('reaction', 'like');
        if (!reactionError) reactionData = reactionRows || [];
      }
      const grouped = {};
      for (const move of moveData) (grouped[move.pulse_id] ||= []).push(move);
      const stats = {};
      for (const row of reactionData) {
        const current = stats[row.pulse_id] || { count: 0, liked: false };
        current.count += 1;
        if (row.actor_id === actorOverride) current.liked = true;
        stats[row.pulse_id] = current;
      }
      setPulses(pulseData || []); setGroupedMoves(grouped); setReactions(stats);
    } catch (e) { setError(e?.message || 'Could not load Pulse.'); } finally { setLoading(false); }
  }, [actor]);

  const loadProfile = useCallback(async (currentActor) => {
    if (!currentActor) return;
    const { data, error: profileLoadError } = await supabase.from('profiles').select('actor_id,username,display_name,bio,avatar_url').eq('actor_id', currentActor).maybeSingle();
    if (profileLoadError) { setProfile(profileDefaults(currentActor)); return; }
    if (data) setProfile(data);
    else setProfile(profileDefaults(currentActor));
  }, []);

  useEffect(() => {
    const id = actorId(); setActor(id);
    if (typeof window !== 'undefined' && !window.localStorage.getItem(ONBOARDING_KEY)) setShowOnboarding(true);
    loadProfile(id);
    loadFeed(id);
    loadFeed(id);
    loadFeed(id);
    loadFeed(id);
    const channel = supabase.channel('pulse-social-feed').on('postgres_changes', { event: '*', schema: 'public', table: 'pulses' }, () => loadFeed()).on('postgres_changes', { event: '*', schema: 'public', table: 'pulse_moves' }, () => loadFeed()).on('postgres_changes', { event: '*', schema: 'public', table: 'pulse_reactions' }, () => loadFeed()).subscribe();
    const onSearch = () => setScreen('search');
    const onActivity = () => setScreen('activity');
    document.addEventListener('pulse:search', onSearch); document.addEventListener('pulse:activity', onActivity);
    return () => { supabase.removeChannel(channel); document.removeEventListener('pulse:search', onSearch); document.removeEventListener('pulse:activity', onActivity); };
  }, [loadFeed, loadProfile]);

  const selectedPulse = useMemo(() => pulses.find((p) => p.id === selectedId) || null, [pulses, selectedId]);
  const selectedMoves = selectedPulse ? (groupedMoves[selectedPulse.id] || []) : [];

  const go = (next) => { setError(''); if (next !== 'detail') setSelectedId(null); setShowMove(false); setScreen(next); };
  const open = (id) => { setSelectedId(id); setScreen('detail'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const like = async (id) => {
    if (!actor) return;
    const current = reactions[id] || { count: 0, liked: false };
    setReactions((prev) => ({ ...prev, [id]: { count: Math.max(0, current.count + (current.liked ? -1 : 1)), liked: !current.liked } }));
    try {
      if (current.liked) {
        const { error: deleteError } = await supabase.from('pulse_reactions').delete().eq('pulse_id', id).eq('actor_id', actor).eq('reaction', 'like');
        if (deleteError) throw deleteError;
      } else {
        const { error: upsertError } = await supabase.from('pulse_reactions').upsert({ pulse_id: id, actor_id: actor, reaction: 'like' }, { onConflict: 'pulse_id,actor_id,reaction' });
        if (upsertError) throw upsertError;
      }
    } catch (e) {
      setReactions((prev) => ({ ...prev, [id]: current }));
      setError(e?.message || 'Could not update like.');
    }
  };

  const share = async () => {
    if (!selectedPulse) return;
    const url = `${window.location.origin}/?pulse=${selectedPulse.id}`;
    const shareData = { title: selectedPulse.title || 'Pulse', text: selectedPulse.intent || 'See what people are changing.', url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setActivityPulseId('shared');
      } else {
        await navigator.clipboard.writeText(url);
        setActivityPulseId('copied');
      }
      setTimeout(() => setActivityPulseId(null), 1800);
    } catch (e) {
      if (e?.name !== 'AbortError') setError('Could not share this Pulse.');
    }
  };

  const saveProfile = async (nextProfile) => {
    if (!actor) return;
    setProfileBusy(true); setProfileError('');
    try {
      const row = { actor_id: actor, username: nextProfile.username, display_name: nextProfile.display_name, bio: nextProfile.bio || '', avatar_url: nextProfile.avatar_url || '' };
      const { data, error: saveError } = await supabase.from('profiles').upsert(row, { onConflict: 'actor_id' }).select('actor_id,username,display_name,bio,avatar_url').single();
      if (saveError) throw saveError;
      setProfile(data || row);
      setShowProfileEditor(false);
    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('duplicate') || String(e?.code || '') === '23505') setProfileError('That username is already taken.');
      else setProfileError(e?.message || 'Could not save your profile.');
    } finally { setProfileBusy(false); }
  };

  const created = (pulse) => { setPulses((prev) => [pulse, ...prev.filter((p) => p.id !== pulse.id)]); setGroupedMoves((prev) => ({ ...prev, [pulse.id]: [] })); setReactions((prev) => ({ ...prev, [pulse.id]: { count: 0, liked: false } })); setSelectedId(pulse.id); setScreen('detail'); };
  const submitMove = () => { setShowMove(false); loadFeed(); };

  return <div className="pulse-shell"><div className="pulse-mobile">
    <AnimatePresence>{showOnboarding && <Onboarding onDone={() => { window.localStorage.setItem(ONBOARDING_KEY, '1'); setShowOnboarding(false); }}/>}</AnimatePresence>
    {error && <div className="error" style={{ padding: '10px 18px', background: '#efe2d9' }}>{error}</div>}
    <AnimatePresence mode="wait">
      {screen === 'home' && <motion.div key="home" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}><Home pulses={pulses} groupedMoves={groupedMoves} actor={actor} reactions={reactions} loading={loading} filter={filter} setFilter={setFilter} onOpen={open} onLike={like} onCreate={() => go('create')}/></motion.div>}
      {screen === 'detail' && selectedPulse && <motion.div key={`detail-${selectedPulse.id}`} initial={{ opacity:0, x:18 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-18 }}><Detail pulse={selectedPulse} moves={selectedMoves} actor={actor} reaction={reactions[selectedPulse.id]} onBack={() => go('home')} onJoin={() => setShowMove(true)} onShare={share} onLike={like}/></motion.div>}
      {screen === 'create' && <motion.div key="create" initial={{ opacity:0, x:18 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-18 }}><Create onBack={() => go('home')} onCreated={created}/></motion.div>}
      {screen === 'activity' && <motion.div key="activity" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}><Activity pulses={pulses} groupedMoves={groupedMoves} actor={actor} onOpen={open}/></motion.div>}
      {screen === 'search' && <motion.div key="search" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}><Explore pulses={pulses} groupedMoves={groupedMoves} reactions={reactions} search={search} setSearch={setSearch} onOpen={open} onLike={like}/></motion.div>}
      {screen === 'you' && <motion.div key="you" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}><You pulses={pulses} groupedMoves={groupedMoves} actor={actor} profile={profile} onOpen={open} onCreate={() => go('create')} onEditProfile={() => { setProfileError(''); setShowProfileEditor(true); }}/></motion.div>}
    </AnimatePresence>
    {['home','activity','search','you'].includes(screen) && <BottomNav screen={screen} go={go}/>} 
    {selectedPulse && showMove && selectedPulse.creator_id !== actor && <MoveSheet pulse={selectedPulse} moves={selectedMoves} actor={actor} onClose={() => setShowMove(false)} onSubmitted={submitMove}/>} 
    <AnimatePresence>{showProfileEditor && <ProfileEditor profile={profile} onSave={saveProfile} onClose={() => setShowProfileEditor(false)} busy={profileBusy} error={profileError}/>}</AnimatePresence>
    <AnimatePresence>{activityPulseId === 'shared' && <motion.div className="toast" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}>Shared.</motion.div>}{activityPulseId === 'copied' && <motion.div className="toast" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}>Link copied.</motion.div>}</AnimatePresence>
  </div></div>;
}
