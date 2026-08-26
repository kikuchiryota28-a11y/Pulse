'use client';

import { useEffect, useRef, useState } from 'react';

const DISCOVERIES = [
  { id: 1, name: 'Svalbard', country: 'NORWAY', region: 'ARCTIC', category: 'EARTH', x: 74, y: 24, kicker: 'EXTREME LIGHT', title: 'A place where the sun can disappear for months.', text: 'Far above the Arctic Circle, the seasons behave very differently from almost anywhere else on Earth.', fact: 'Polar night can last for months in Longyearbyen.' },
  { id: 2, name: 'Atacama Desert', country: 'CHILE', region: 'SOUTH AMERICA', category: 'EARTH', x: 30, y: 69, kicker: 'MARS ON EARTH', title: 'One of the driest places on the planet.', text: 'The Atacama is so dry and stark that parts of it are used to test instruments designed for Mars.', fact: 'Some weather stations have recorded essentially no rainfall for years.' },
  { id: 3, name: 'Socotra', country: 'YEMEN', region: 'INDIAN OCEAN', category: 'LIFE', x: 62, y: 57, kicker: 'ISLAND OF DRAGONS', title: 'An island that looks like another planet.', text: 'Extreme isolation helped produce an ecosystem packed with species found nowhere else.', fact: 'Socotra has an unusually high share of endemic plant species.' },
  { id: 4, name: 'Lake Baikal', country: 'RUSSIA', region: 'SIBERIA', category: 'EARTH', x: 68, y: 37, kicker: 'ANCIENT WATER', title: 'The deepest lake on Earth.', text: 'A vast ancient freshwater system containing an extraordinary share of the world’s unfrozen surface water.', fact: 'Its maximum depth is about 1,642 metres.' },
  { id: 5, name: 'Atacama Array', country: 'CHILE', region: 'CHAJNANTOR', category: 'SPACE', x: 29, y: 64, kicker: 'LOOKING OUTWARD', title: 'A telescope built where the air is almost empty.', text: 'High in the Andes, a giant radio telescope array studies the coldest and most distant parts of the universe.', fact: 'The array sits at roughly 5,000 metres above sea level.' },
  { id: 6, name: 'Oresund Bridge', country: 'DENMARK / SWEDEN', region: 'EUROPE', category: 'HUMAN', x: 50, y: 31, kicker: 'ENGINEERED LANDSCAPE', title: 'A bridge that turns into a tunnel.', text: 'The crossing begins above the sea, disappears into an artificial island, then continues underwater toward Copenhagen.', fact: 'The full connection opened in 2000.' },
];

const CATEGORIES = ['ALL', 'EARTH', 'LIFE', 'SPACE', 'HUMAN'];

const LAND = [
  [[-168, 72], [-140, 70], [-126, 57], [-114, 52], [-102, 30], [-87, 16], [-80, 9], [-68, 10], [-60, 24], [-78, 31], [-82, 47], [-104, 60], [-128, 63], [-145, 70]],
  [[-82, 12], [-70, 7], [-63, -5], [-58, -20], [-64, -38], [-70, -53], [-77, -48], [-80, -22]],
  [[-18, 36], [-5, 36], [10, 43], [30, 36], [39, 27], [50, 30], [47, 13], [39, 5], [28, 5], [20, -5], [8, -34], [-5, -35], [-16, -10], [-18, 8], [-10, 24]],
  [[30, 72], [60, 70], [92, 67], [126, 58], [150, 55], [168, 45], [155, 31], [139, 23], [121, 8], [104, 2], [90, 9], [73, 22], [55, 25], [45, 36], [33, 43]],
  [[112, -10], [130, -12], [145, -24], [154, -39], [139, -43], [122, -34], [113, -22]],
  [[-52, 80], [-30, 82], [-20, 73], [-28, 61], [-45, 60], [-58, 68]],
];

function project([lon, lat], rotation, r) {
  const lonRad = ((lon + rotation) * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const x = Math.cos(latRad) * Math.sin(lonRad);
  const y = -Math.sin(latRad);
  const z = Math.cos(latRad) * Math.cos(lonRad);
  return { x: x * r, y: y * r, z };
}

function Globe({ pulseState, signal, onPulse, category }) {
  const canvasRef = useRef(null);
  const drag = useRef({ active: false, x: 0, rotation: 0 });
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (!drag.current.active && pulseState !== 'charging') setRotation(v => v + 0.018);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pulseState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    const draw = (now) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.height, cx = w / 2, cy = h / 2;
      const r = Math.min(w, h) * 0.405;
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(cx, cy);

      // Atmospheric halo — restrained, not neon.
      const halo = ctx.createRadialGradient(0, 0, r * .72, 0, 0, r * 1.15);
      halo.addColorStop(0, 'rgba(112,104,91,0)');
      halo.addColorStop(.88, 'rgba(112,104,91,.055)');
      halo.addColorStop(1, 'rgba(112,104,91,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2); ctx.fill();

      const ocean = ctx.createRadialGradient(-r * .35, -r * .45, r * .08, 0, 0, r * 1.05);
      ocean.addColorStop(0, '#eee9df');
      ocean.addColorStop(.6, '#d8d0c3');
      ocean.addColorStop(.9, '#bcb3a5');
      ocean.addColorStop(1, '#958d80');
      ctx.fillStyle = ocean;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

      ctx.save(); ctx.clip();
      // Latitude/longitude are drawn as curved arcs, giving the sphere actual depth.
      ctx.lineWidth = .65; ctx.strokeStyle = 'rgba(53,49,43,.12)';
      for (let lat = -60; lat <= 60; lat += 30) {
        const p = project([0, lat], rotation, r);
        const ry = Math.cos((lat * Math.PI) / 180) * r;
        ctx.beginPath(); ctx.ellipse(0, p.y, ry, Math.max(ry * .18, 2), 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (let lon = -150; lon <= 150; lon += 30) {
        const visible = Math.cos(((lon + rotation) * Math.PI) / 180);
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 4) {
          const p = project([lon, lat], rotation, r);
          if (lat === -90) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.globalAlpha = Math.max(.04, Math.abs(visible) * .11); ctx.stroke(); ctx.globalAlpha = 1;
      }

      LAND.forEach((poly) => {
        const points = poly.map(p => project(p, rotation, r));
        ctx.beginPath();
        points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = 'rgba(79,75,68,.78)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(250,247,239,.22)'; ctx.lineWidth = .6; ctx.stroke();
      });

      // A subtle terminator gives the globe a light source rather than a flat icon.
      const shade = ctx.createLinearGradient(-r, -r * .2, r, r * .3);
      shade.addColorStop(0, 'rgba(255,255,255,.16)'); shade.addColorStop(.55, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(30,28,25,.22)');
      ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
      ctx.restore();

      if (signal) {
        const p = project([(signal.x - 50) * 3.2, (50 - signal.y) * 1.8], rotation, r);
        if (p.z > -0.1) {
          const wave = pulseState === 'charging' ? ((t * 1.3) % 1) : .2;
          ctx.fillStyle = '#9a6737'; ctx.globalAlpha = .95; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#9a6737'; ctx.lineWidth = 1.4; ctx.globalAlpha = .22 * (1 - wave); ctx.beginPath(); ctx.arc(p.x, p.y, 9 + wave * 34, 0, Math.PI * 2); ctx.stroke();
        }
      }
      if (pulseState === 'charging') {
        const p = (t * .9) % 1;
        ctx.strokeStyle = '#9a6737'; ctx.lineWidth = 1.4; ctx.globalAlpha = .22 * (1-p);
        ctx.beginPath(); ctx.arc(0,0,r*(1+p*.12),0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [rotation, pulseState, signal]);

  const down = (e) => { drag.current = { active: true, x: e.clientX, rotation }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { if (!drag.current.active) return; setRotation(drag.current.rotation + (e.clientX - drag.current.x) * .22); };
  const up = () => { drag.current.active = false; };

  return <div className="globeShell">
    <button className="globe" onClick={onPulse} onPointerDown={down} onPointerMove={move} onPointerUp={up} aria-label="Discover something unknown">
      <canvas ref={canvasRef} />
      <span className={`globeCore ${pulseState === 'charging' ? 'is-active' : ''}`}>
        <span className="coreRing" />
        <b>{pulseState === 'charging' ? 'SEARCHING' : 'PULSE'}</b>
        <small>{category === 'ALL' ? 'THE UNKNOWN' : category}</small>
      </span>
    </button>
    <div className="globeHint">DRAG THE EARTH · TAP THE CENTER</div>
  </div>;
}

export default function Page() {
  const [pulseState, setPulseState] = useState('idle');
  const [discover, setDiscover] = useState(false);
  const [signal, setSignal] = useState(null);
  const [category, setCategory] = useState('ALL');
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);

  const pulse = () => {
    if (pulseState === 'charging') return;
    const pool = DISCOVERIES.filter(d => category === 'ALL' || d.category === category).filter(d => d.id !== signal?.id);
    const next = pool[Math.floor(Math.random() * pool.length)] || DISCOVERIES[0];
    setSignal(next); setPulseState('charging');
    setTimeout(() => { setPulseState('idle'); setDiscover(true); setHistory(h => [next, ...h.filter(x => x.id !== next.id)].slice(0, 4)); }, 1250);
  };

  const save = () => {
    if (!signal) return;
    setSaved(s => s.includes(signal.id) ? s.filter(id => id !== signal.id) : [...s, signal.id]);
  };

  return <main className="world-app">
    <header>
      <button className="brand" onClick={() => setDiscover(false)}>PULSE</button>
      <nav>{CATEGORIES.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => { setCategory(c); setDiscover(false); }}>{c}</button>)}</nav>
      <div className="headerRight"><span>WORLD / 01</span><span className="savedCount">SAVED {saved.length.toString().padStart(2,'0')}</span></div>
    </header>

    {!discover ? <section className={`world-hero ${pulseState === 'charging' ? 'is-pulsing' : ''}`}>
      <div className="copy">
        <span>THE WORLD / 2026 · {category}</span>
        <h1>There is more<br/>to <em>discover.</em></h1>
        <p>Not a feed. Not a search engine. A way to stumble into something you did not know existed.</p>
        <div className="categoryRail">{CATEGORIES.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}<span>{c === 'ALL' ? '∞' : DISCOVERIES.filter(d=>d.category===c).length.toString().padStart(2,'0')}</span></button>)}</div>
      </div>
      <div className="globeArea"><Globe pulseState={pulseState} signal={signal} onPulse={pulse} category={category}/></div>
      <div className="heroMeta"><span>01 / DISCOVERY ENGINE</span><span>EARTH · LIFE · SPACE · HUMAN</span><span>{history.length ? `RECENT SIGNALS ${history.length}` : 'NO FEED · NO NOISE'}</span></div>
    </section> : <section className="found">
      <button onClick={() => setDiscover(false)} className="back">← WORLD</button>
      <div className="foundVisual">
        <div className="foundImage">
          <div className="imageGrid" />
          <div className="foundCoordinates"><span>{signal?.region}</span><span>{signal?.x.toFixed(1)}° / {signal?.y.toFixed(1)}°</span></div>
          <span className="signalDot" />
          <span className="signalLabel">SIGNAL 01</span>
        </div>
        <div className="location"><b>{signal?.name}</b><span>{signal?.country}</span></div>
      </div>
      <div className="foundText">
        <div className="foundKicker"><span>{signal?.kicker}</span><span>{signal?.category}</span></div>
        <h2>{signal?.title}</h2>
        <p>{signal?.text}</p>
        <div className="fact"><span>WHY IT MATTERS</span><b>{signal?.fact}</b></div>
        <div className="foundActions"><button onClick={save} className={saved.includes(signal?.id) ? 'saved' : ''}>{saved.includes(signal?.id) ? 'SAVED' : 'SAVE'} <span>+</span></button><button onClick={() => { setDiscover(false); setTimeout(pulse, 180); }}>PULSE AGAIN <span>→</span></button></div>
      </div>
    </section>}
  </main>;
}
