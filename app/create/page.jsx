'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Type, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { actorId } from '../../lib/pulse-social';
import '../../src/pulse-design-system.css';

const stages = ['IDEA', 'SEED', 'PREVIEW', 'LAUNCH'];

export default function CreatePage() {
  const router = useRouter(); const [stage, setStage] = useState(0); const [kind, setKind] = useState('text'); const [title, setTitle] = useState(''); const [intent, setIntent] = useState(''); const [seed, setSeed] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { try { const saved = localStorage.getItem('pulse:create:draft'); if (saved) { const data = JSON.parse(saved); setTitle(data.title || ''); setIntent(data.intent || ''); setSeed(data.seed || ''); setKind(data.kind || 'text'); } } catch {} }, []);
  useEffect(() => { try { localStorage.setItem('pulse:create:draft', JSON.stringify({ title, intent, seed, kind })); } catch {} }, [title, intent, seed, kind]);
  const canNext = stage === 0 ? Boolean(intent.trim()) : stage === 1 ? Boolean(title.trim() && seed.trim()) : true;
  const next = () => { setError(''); if (!canNext) return; if (stage < 3) setStage(stage + 1); };
  const launch = async () => { if (!title.trim() || !seed.trim()) return; setBusy(true); setError(''); try { const creator = actorId(); const { data, error: e } = await supabase.from('pulses').insert({ creator_id: creator, title: title.trim(), intent: intent.trim(), seed: { text: seed.trim(), inputType: kind }, status: 'active', revision: 0 }).select().single(); if (e) throw e; if (!data?.id) throw new Error('Could not create Pulse.'); try { localStorage.removeItem('pulse:create:draft'); } catch {} router.push(`/pulse/${data.id}`); } catch (e) { setError(e?.message || 'Could not launch this Pulse.'); } finally { setBusy(false); } };
  return <main className="pulse-page create-v2">
    <header className="pulse-page-header"><div><div className="pulse-page-kicker"><Sparkles size={12} /> CREATE</div><h1 className="pulse-page-title">Start something<br />worth passing on.</h1><p className="pulse-page-subtitle">Give someone a starting point. Pulse handles the next turn.</p></div><button className="precision-icon" onClick={() => router.back()} aria-label="Back"><ArrowLeft size={17} /></button></header>
    <div className="create-progress">{stages.map((s, i) => <span key={s} className={i <= stage ? 'active' : ''} title={s} />)}</div>
    <div className="create-stage">
      <div className="create-stage-label"><span>{stages[stage]}</span><span>{stage + 1}/4</span></div>
      {stage === 0 && <section className="create-panel"><div className="create-panel-eyebrow">THE HANDOFF</div><h2>What do you want the next person to do?</h2><p>Make it concrete enough to act on, open enough to surprise you.</p><textarea className="pulse-v1-textarea" value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="Find a hidden detail in your town and leave the next clue."/><button className="pulse-join-primary" onClick={next} disabled={!canNext}>BUILD THE PULSE <ArrowRight size={16} /></button></section>}
      {stage === 1 && <section className="create-panel"><div className="create-kind-row"><button className={kind === 'text' ? 'active' : ''} onClick={() => setKind('text')}><Type size={15} /> TEXT</button><button className={kind === 'photo' ? 'active' : ''} onClick={() => setKind('photo')}><Camera size={15} /> PHOTO</button></div><label className="create-field"><span>TITLE</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="FIND THE HIDDEN COLOR" /></label><label className="create-field"><span>STARTING POINT</span><textarea className="pulse-v1-textarea" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="A red door was found." /></label><div className="create-nav"><button className="pulse-text-button" onClick={() => setStage(0)}>BACK</button><button className="pulse-join-primary compact" onClick={next} disabled={!canNext}>PREVIEW <ArrowRight size={15} /></button></div></section>}
      {stage === 2 && <section className="create-panel create-preview"><div className="stranger-banner">STRANGER VIEW</div><div className="preview-main"><span>YOUR SEED</span><h2>{title}</h2><p>{seed}</p></div><div className="preview-handoff"><span>THE NEXT PERSON SEES</span><strong>{intent}</strong></div><div className="create-nav"><button className="pulse-text-button" onClick={() => setStage(1)}>EDIT</button><button className="pulse-join-primary compact" onClick={next}>CONTINUE <ArrowRight size={15} /></button></div></section>}
      {stage === 3 && <section className="create-panel launch-panel"><div className="precision-label">READY</div><h2>{title}</h2><p>{intent}</p><div className="launch-seed"><span>STARTING POINT</span><strong>{seed}</strong></div>{error && <p className="pulse-v1-error">{error}</p>}<div className="create-nav"><button className="pulse-text-button" onClick={() => setStage(2)}>BACK</button><button className="pulse-join-primary compact" onClick={launch} disabled={busy}>{busy ? 'LAUNCHING…' : 'LAUNCH PULSE'} <ArrowRight size={15} /></button></div></section>}
    </div>
  </main>;
}
