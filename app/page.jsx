'use client';

import { useEffect, useMemo, useState } from 'react';

const MAX_STEPS = 10;
const STARTERS = [
  'Show the next person something you noticed today.',
  'Take one ordinary thing and make it strange.',
  'Describe a place you would send a stranger to.',
];

function encodeRelay(relay) {
  const json = JSON.stringify(relay);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeRelay(value) {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const relay = JSON.parse(new TextDecoder().decode(bytes));
    if (!relay || relay.v !== 1 || typeof relay.seed !== 'string' || !Array.isArray(relay.steps)) return null;
    return relay.steps.length <= MAX_STEPS ? relay : null;
  } catch { return null; }
}

function readRelayFromLocation() {
  if (typeof window === 'undefined') return null;
  const match = window.location.hash.match(/relay=([^&]+)/);
  return match ? decodeRelay(match[1]) : null;
}

function relayUrl(relay) {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.hash = `relay=${encodeRelay(relay)}`;
  return url.toString();
}

function makeRelay(seed) {
  return { v: 1, id: Math.random().toString(36).slice(2, 10).toUpperCase(), seed, steps: [] };
}

function shortText(text, max = 140) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function Page() {
  const [relay, setRelay] = useState(null);
  const [view, setView] = useState('home');
  const [seed, setSeed] = useState('');
  const [response, setResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const incoming = readRelayFromLocation();
    if (incoming) {
      setRelay(incoming);
      setView(incoming.steps.length >= MAX_STEPS ? 'complete' : 'join');
    }
  }, []);

  const currentStep = relay?.steps.length ?? 0;
  const complete = currentStep >= MAX_STEPS;
  const progress = `${String(currentStep).padStart(2, '0')}/${MAX_STEPS}`;
  const remaining = MAX_STEPS - currentStep;

  const prompt = useMemo(() => {
    if (!relay) return '';
    if (relay.steps.length === 0) return 'Start with one small observation, image in your head, or idea.';
    const last = relay.steps[relay.steps.length - 1];
    return `Take this and change it. Do one small thing that the next person can continue:\n\n“${last.output}”`;
  }, [relay]);

  const startRelay = (value = seed) => {
    const clean = value.trim();
    if (clean.length < 4) { setError('Give the Relay a little more to work with.'); return; }
    const next = makeRelay(clean);
    setRelay(next); setSeed(''); setResponse(''); setError(''); setView('share');
  };

  const submitStep = () => {
    const clean = response.trim();
    if (clean.length < 2) { setError('Add at least a tiny response.'); return; }
    if (!relay || relay.steps.length >= MAX_STEPS) return;
    const next = { ...relay, steps: [...relay.steps, { output: shortText(clean), at: Date.now() }] };
    setRelay(next); setResponse(''); setError(''); setView(next.steps.length >= MAX_STEPS ? 'complete' : 'pass');
  };

  const copyRelay = async (target = relay) => {
    if (!target) return;
    const link = relayUrl(target);
    try { await navigator.clipboard.writeText(link); }
    catch {
      const input = document.createElement('input'); input.value = link; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
    }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };

  const newRelay = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setRelay(null); setSeed(''); setResponse(''); setError(''); setView('home');
  };

  const goHome = () => setView(relay ? (complete ? 'complete' : 'pass') : 'home');

  return (
    <main className="pulse-relay">
      <header className="relay-topbar">
        <button className="relay-logo" onClick={goHome}>PULSE</button>
        <div className="relay-status">{relay ? `RELAY ${relay.id}` : 'A HUMAN EXPERIMENT'}</div>
        <button className="relay-new" onClick={newRelay}>NEW</button>
      </header>

      {view === 'home' && (
        <section className="home-stage">
          <div className="hero-word">PASS<br /><em>IT ON.</em></div>
          <div className="hero-copy">
            <span className="eyebrow">NOT A FEED · NOT A GAME · NOT A CHAT</span>
            <h1>One idea.<br />Ten strangers.</h1>
            <p>Start something. A stranger changes it. Another stranger changes that. See what survives.</p>
            <div className="starter-block">
              <textarea value={seed} onChange={e => { setSeed(e.target.value); setError(''); }} placeholder="Give a stranger something to continue…" maxLength={180} />
              <button onClick={() => startRelay()} className="primary-cta">START A RELAY <span>→</span></button>
              {error && <p className="error">{error}</p>}
            </div>
            <div className="starter-suggestions">
              {STARTERS.map(item => <button key={item} onClick={() => { setSeed(item); setError(''); }}>{item}</button>)}
            </div>
          </div>
          <div className="hero-mark"><span>01</span><span>→</span><span>∞</span></div>
        </section>
      )}

      {view === 'share' && relay && (
        <section className="share-stage">
          <div className="step-large">01<span>/10</span></div>
          <div className="share-panel">
            <span className="eyebrow">YOUR SEED</span>
            <blockquote>“{relay.seed}”</blockquote>
            <p>Now the interesting part: someone else has to take it from here.</p>
            <div className="share-actions">
              <button className="primary-cta" onClick={() => copyRelay()}>{copied ? 'LINK COPIED' : 'PASS TO A STRANGER'} <span>↗</span></button>
              <button className="ghost-cta" onClick={() => setView('join')}>PREVIEW THE NEXT STEP</button>
            </div>
            <div className="share-note">The Relay travels inside the link itself. No account. No feed. No profile.</div>
          </div>
        </section>
      )}

      {view === 'join' && relay && !complete && (
        <section className="join-stage">
          <div className="join-rail">
            <span className="eyebrow">A RELAY IS MOVING</span>
            <div className="rail-count">{progress}</div>
            <div className="rail-lines">{Array.from({ length: MAX_STEPS }).map((_, i) => <span key={i} className={i < currentStep ? 'filled' : i === currentStep ? 'current' : ''} />)}</div>
          </div>
          <div className="join-main">
            <span className="eyebrow">{currentStep === 0 ? 'YOU ARE FIRST' : 'YOU ARE SOMEWHERE IN THE MIDDLE'}</span>
            <h1>{currentStep === 0 ? 'Make the first move.' : 'Change what you were given.'}</h1>
            <div className="seed-context">
              <span>{currentStep === 0 ? 'THE ORIGINAL SEED' : 'THE LAST PERSON LEFT THIS'}</span>
              <p>“{currentStep === 0 ? relay.seed : relay.steps[currentStep - 1]?.output}”</p>
            </div>
            <p className="instruction">{prompt}</p>
            <textarea value={response} onChange={e => { setResponse(e.target.value); setError(''); }} placeholder="Your move…" maxLength={180} autoFocus />
            <div className="join-footer"><span>{response.length}/180</span><button className="primary-cta" onClick={submitStep}>PASS IT ON <span>→</span></button></div>
            {error && <p className="error">{error}</p>}
          </div>
          <div className="join-history">
            <span className="eyebrow">TRACE</span>
            <div className="trace-list">
              <div className="trace-seed"><i>00</i><span>{shortText(relay.seed, 90)}</span></div>
              {relay.steps.map((step, index) => <div className="trace-step" key={`${step.at}-${index}`}><i>{String(index + 1).padStart(2, '0')}</i><span>{shortText(step.output, 90)}</span></div>)}
            </div>
          </div>
        </section>
      )}

      {view === 'pass' && relay && !complete && (
        <section className="pass-stage">
          <div className="pass-orbit"><span>{progress}</span></div>
          <div className="pass-copy">
            <span className="eyebrow">YOUR PART IS DONE</span>
            <h1>Now give it<br /><em>to someone else.</em></h1>
            <p>You changed the Relay. The next stranger gets a different starting point than you did.</p>
            <div className="share-actions"><button className="primary-cta" onClick={() => copyRelay()}>{copied ? 'LINK COPIED' : 'PASS THE LINK'} <span>↗</span></button><button className="ghost-cta" onClick={() => setView('join')}>EDIT MY STEP</button></div>
            <div className="pass-meta"><span>{remaining} HANDOFFS LEFT</span><span>RELAY {relay.id}</span></div>
          </div>
        </section>
      )}

      {view === 'complete' && relay && (
        <section className="complete-stage">
          <div className="complete-head"><span className="eyebrow">RELAY COMPLETE · {MAX_STEPS} HANDOFFS</span><h1>Look what<br /><em>happened.</em></h1><p>Your original seed passed through ten strangers and came back as something none of you could have planned.</p></div>
          <div className="timeline"><div className="timeline-seed"><span>00 · YOU</span><p>{relay.seed}</p></div>{relay.steps.map((step, index) => <div className="timeline-step" key={`${step.at}-${index}`}><span>{String(index + 1).padStart(2, '0')} · STRANGER</span><p>{step.output}</p></div>)}</div>
          <div className="complete-footer"><button className="primary-cta" onClick={() => copyRelay()}>{copied ? 'LINK COPIED' : 'SHARE THE RESULT'} <span>↗</span></button><button className="ghost-cta" onClick={newRelay}>START ANOTHER</button></div>
        </section>
      )}

      <footer className="relay-footer"><span>THIS IS AN EXPERIMENT IN HUMAN HANDOFFS.</span><span>NO PROFILES · NO FEED · JUST THE RELAY.</span></footer>
    </main>
  );
}
