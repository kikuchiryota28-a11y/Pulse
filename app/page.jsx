'use client';

import { useEffect, useMemo, useState } from 'react';

const DISCOVERIES = [
  { id: 1, name: 'Svalbard', country: 'NORWAY', region: 'ARCTIC', category: 'EARTH', kicker: 'EXTREME LIGHT', title: 'A place where the sun can disappear for months.', text: 'Far above the Arctic Circle, the seasons behave very differently from almost anywhere else on Earth.', fact: 'Polar night can last for months in Longyearbyen.' },
  { id: 2, name: 'Atacama Desert', country: 'CHILE', region: 'SOUTH AMERICA', category: 'EARTH', kicker: 'MARS ON EARTH', title: 'One of the driest places on the planet.', text: 'The Atacama is so dry and stark that parts of it are used to test instruments designed for Mars.', fact: 'Some weather stations have recorded essentially no rainfall for years.' },
  { id: 3, name: 'Socotra', country: 'YEMEN', region: 'INDIAN OCEAN', category: 'LIFE', kicker: 'ISLAND OF DRAGONS', title: 'An island that looks like another planet.', text: 'Extreme isolation helped produce an ecosystem packed with species found nowhere else.', fact: 'Socotra has an unusually high share of endemic plant species.' },
  { id: 4, name: 'Lake Baikal', country: 'RUSSIA', region: 'SIBERIA', category: 'EARTH', kicker: 'ANCIENT WATER', title: 'The deepest lake on Earth.', text: 'A vast ancient freshwater system containing an extraordinary share of the world’s unfrozen surface water.', fact: 'Its maximum depth is about 1,642 metres.' },
  { id: 5, name: 'Atacama Array', country: 'CHILE', region: 'CHAJNANTOR', category: 'SPACE', kicker: 'LOOKING OUTWARD', title: 'A telescope built where the air is almost empty.', text: 'High in the Andes, a giant radio telescope array studies the coldest and most distant parts of the universe.', fact: 'The array sits at roughly 5,000 metres above sea level.' },
  { id: 6, name: 'Oresund Bridge', country: 'DENMARK / SWEDEN', region: 'EUROPE', category: 'HUMAN', kicker: 'ENGINEERED LANDSCAPE', title: 'A bridge that turns into a tunnel.', text: 'The crossing begins above the sea, disappears into an artificial island, then continues underwater toward Copenhagen.', fact: 'The full connection opened in 2000.' },
];

const CATEGORIES = ['ALL', 'EARTH', 'LIFE', 'SPACE', 'HUMAN'];

const POSITIONS = [
  [13, 23], [31, 69], [48, 31], [67, 18], [82, 57], [72, 82], [22, 45], [55, 72], [91, 30], [42, 13], [8, 78], [61, 47]
];

function pickDiscovery(category, currentId) {
  const pool = DISCOVERIES.filter(d => (category === 'ALL' || d.category === category) && d.id !== currentId);
  return pool[Math.floor(Math.random() * pool.length)] || DISCOVERIES[0];
}

export default function Page() {
  const [mode, setMode] = useState('explore');
  const [category, setCategory] = useState('ALL');
  const [signal, setSignal] = useState(null);
  const [saved, setSaved] = useState([]);
  const [visited, setVisited] = useState([]);
  const [motion, setMotion] = useState({ x: 0, y: 0 });
  const [searching, setSearching] = useState(false);
  const [revealStep, setRevealStep] = useState(0);

  const visibleNodes = useMemo(() => POSITIONS.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })), []);

  useEffect(() => {
    if (!searching) return;
    const timer = setTimeout(() => {
      const next = pickDiscovery(category, signal?.id);
      setSignal(next);
      setSearching(false);
      setRevealStep(1);
      setVisited(v => [next.id, ...v.filter(id => id !== next.id)].slice(0, 12));
      setMode('encounter');
    }, 1100);
    return () => clearTimeout(timer);
  }, [searching, category, signal?.id]);

  const pulse = () => {
    if (searching) return;
    setSearching(true);
    setMode('explore');
  };

  const chooseNode = (node) => {
    if (searching) return;
    const next = pickDiscovery(category, signal?.id);
    setSignal(next);
    setRevealStep(1);
    setVisited(v => [next.id, ...v.filter(id => id !== next.id)].slice(0, 12));
    setMode('encounter');
  };

  const reveal = () => {
    setRevealStep(step => Math.min(step + 1, 3));
  };

  const toggleSave = () => {
    if (!signal) return;
    setSaved(s => s.includes(signal.id) ? s.filter(id => id !== signal.id) : [...s, signal.id]);
  };

  const moveWorld = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - .5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - .5) * 2;
    setMotion({ x, y });
  };

  return (
    <main className="pulse-v2">
      <header className="topbar">
        <button className="brand" onClick={() => { setMode('explore'); setRevealStep(0); }}>PULSE</button>
        <div className="modeLabel">{mode === 'explore' ? 'EXPLORE' : 'ENCOUNTER'}</div>
        <div className="topMeta"><span>{visited.length.toString().padStart(2, '0')} FOUND</span><span>{saved.length.toString().padStart(2, '0')} KEPT</span></div>
      </header>

      {mode === 'explore' && (
        <section className={`explore ${searching ? 'is-searching' : ''}`} onPointerMove={moveWorld}>
          <div className="worldField" style={{ '--mx': `${motion.x * 18}px`, '--my': `${motion.y * 12}px` }}>
            <div className="worldGlow" />
            <div className="worldGrid" />
            <div className="worldArc arcOne" />
            <div className="worldArc arcTwo" />
            {visibleNodes.map(node => (
              <button
                key={node.id}
                className={`worldNode ${node.id % 5 === 0 ? 'rare' : ''}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={() => chooseNode(node)}
                aria-label="Explore this part of the world"
              >
                <span />
              </button>
            ))}
            <div className="fieldCenter">
              <span className="eyebrow">THE WORLD IS NOT A FEED</span>
              <h1>Go somewhere<br /><em>unexpected.</em></h1>
              <p>Move through the unknown. Follow a signal when something catches your eye.</p>
              <button className={`pulseTrigger ${searching ? 'loading' : ''}`} onClick={pulse}>
                <span className="pulseOrb" />
                <b>{searching ? 'LISTENING' : 'PULSE'}</b>
                <small>{category === 'ALL' ? 'ANYWHERE' : category}</small>
              </button>
            </div>
          </div>

          <div className="exploreBottom">
            <div className="categorySelect">
              {CATEGORIES.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}
            </div>
            <div className="instruction">DRAG TO EXPLORE · TAP A SIGNAL · PULSE TO GO FURTHER</div>
            <div className="counter">{visited.length ? `YOUR WORLD · ${visited.length}` : 'NOTHING FOUND YET'}</div>
          </div>
        </section>
      )}

      {mode === 'encounter' && signal && (
        <section className="encounter">
          <div className="encounterScene">
            <div className="sceneTexture" />
            <div className="sceneOrb" />
            <div className="sceneCoordinates"><span>{signal.region}</span><span>{signal.category}</span></div>
            <div className="sceneTitle"><span>YOU FOUND SOMETHING</span><h2>{signal.name}</h2><p>{signal.country}</p></div>
            <div className="sceneSignal">SIGNAL {String(signal.id).padStart(2, '0')}</div>
          </div>

          <div className="encounterInfo">
            <div className="revealProgress"><span className={revealStep >= 1 ? 'on' : ''} /><span className={revealStep >= 2 ? 'on' : ''} /><span className={revealStep >= 3 ? 'on' : ''} /></div>
            {revealStep === 1 && <>
              <span className="eyebrow">{signal.kicker}</span>
              <h3>Why does this place<br />exist like <em>this?</em></h3>
              <button className="revealButton" onClick={reveal}>REVEAL <span>→</span></button>
            </>}
            {revealStep === 2 && <>
              <span className="eyebrow">DISCOVER</span>
              <h3>{signal.title}</h3>
              <p>{signal.text}</p>
              <button className="revealButton" onClick={reveal}>WHY IT MATTERS <span>→</span></button>
            </>}
            {revealStep === 3 && <>
              <span className="eyebrow">WHY IT MATTERS</span>
              <h3>{signal.fact}</h3>
              <div className="encounterActions"><button onClick={toggleSave}>{saved.includes(signal.id) ? 'KEPT' : 'KEEP'} <span>+</span></button><button onClick={pulse}>FIND ANOTHER <span>→</span></button></div>
            </>}
            <button className="returnWorld" onClick={() => { setMode('explore'); setRevealStep(0); }}>← RETURN TO THE WORLD</button>
          </div>
        </section>
      )}
    </main>
  );
}
