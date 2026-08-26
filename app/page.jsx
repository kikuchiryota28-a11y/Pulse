'use client';

import { useEffect, useRef, useState } from 'react';

const SIGNALS = [
  { name: 'Svalbard', country: 'NORWAY', x: 73, y: 25, title: 'A place where the sun can disappear for months.', text: 'Far above the Arctic Circle, the seasons behave very differently from almost anywhere else on Earth.' },
  { name: 'Atacama', country: 'CHILE', x: 31, y: 67, title: 'One of the driest places on Earth.', text: 'A landscape so dry that scientists use it as a rough analogue for the surface of Mars.' },
  { name: 'Socotra', country: 'YEMEN', x: 61, y: 55, title: 'An island that looks like another planet.', text: 'Its isolation helped create an ecosystem filled with species found nowhere else.' },
  { name: 'Lake Baikal', country: 'RUSSIA', x: 67, y: 36, title: 'The deepest lake on Earth.', text: 'A vast body of ancient freshwater holding an extraordinary share of the world’s unfrozen surface water.' },
];

function Globe({ pulsing, signal, onPulse }) {
  const canvasRef = useRef(null);
  const drag = useRef({ active: false, x: 0, offset: 0 });
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (!drag.current.active && !pulsing) setRotation(v => v + 0.025);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pulsing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    const draw = (now) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.height, cx = w / 2, cy = h / 2;
      const r = Math.min(w, h) * .39;
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.save(); ctx.translate(cx, cy);

      const gradient = ctx.createRadialGradient(-r*.3, -r*.35, r*.05, 0, 0, r*1.1);
      gradient.addColorStop(0, '#f5f0e7');
      gradient.addColorStop(.7, '#e3dbce');
      gradient.addColorStop(1, '#c9c0b1');
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fillStyle=gradient; ctx.fill();

      ctx.save(); ctx.clip();
      ctx.globalAlpha=.12; ctx.strokeStyle='#3f3b35'; ctx.lineWidth=.7;
      for(let i=-3;i<=3;i++){const y=i*r/4, ry=Math.sqrt(Math.max(0,r*r-y*y));ctx.beginPath();ctx.ellipse(0,y,ry,ry*.13,0,0,Math.PI*2);ctx.stroke();}
      for(let i=-3;i<=3;i++){const x=i*r/4+Math.sin(rotation*.02)*r*.06;ctx.beginPath();ctx.ellipse(x,0,r*.16,r,0,0,Math.PI*2);ctx.stroke();}

      // Quiet, recognizable continent silhouettes rather than decorative blobs.
      ctx.fillStyle='#756f65'; ctx.globalAlpha=.82;
      const land = [
        [-.58,-.15,.22,.18],[-.43,.08,.15,.28],[-.24,-.27,.18,.13],[-.05,-.12,.22,.12],
        [.18,-.32,.17,.13],[.31,-.12,.23,.17],[.43,.10,.16,.24],[.25,.31,.10,.18],[-.02,.31,.16,.12]
      ];
      land.forEach(([x,y,rx,ry],i)=>{const drift=Math.sin(t*.12+i)*.012*r;ctx.beginPath();ctx.ellipse((x*r)+drift,y*r,rx*r,ry*r,.15,0,Math.PI*2);ctx.fill();});
      ctx.restore();

      if (signal) {
        const sx=(signal.x/100-.5)*r*1.72;
        const sy=(signal.y/100-.5)*r*1.72;
        const wave=pulsing ? ((t*1.4)%1) : .15;
        ctx.globalAlpha=.8; ctx.fillStyle='#9a6737'; ctx.beginPath();ctx.arc(sx,sy,3.5,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=.22*(1-wave);ctx.strokeStyle='#9a6737';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(sx,sy,8+wave*32,0,Math.PI*2);ctx.stroke();
      }
      if (pulsing) {
        const p=(t*1.15)%1;ctx.globalAlpha=.25*(1-p);ctx.strokeStyle='#9a6737';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,r*(1+p*.16),0,Math.PI*2);ctx.stroke();
      }
      ctx.restore(); raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw); return()=>cancelAnimationFrame(raf);
  }, [rotation,pulsing,signal]);

  const down = (e) => { drag.current={active:true,x:e.clientX,offset:rotation}; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { if(!drag.current.active)return; const dx=e.clientX-drag.current.x; setRotation(drag.current.offset+dx*.12); };
  const up = () => { drag.current.active=false; };

  return <button className="globe" onClick={onPulse} onPointerDown={down} onPointerMove={move} onPointerUp={up} aria-label="Pulse into the world">
    <canvas ref={canvasRef}/>
    <span className={`globeCenter ${pulsing?'is-active':''}`}><b>{pulsing?'SIGNAL':'PULSE'}</b><small>{pulsing?'FOUND':'DISCOVER'}</small></span>
  </button>;
}

export default function Page(){
  const [pulsing,setPulsing]=useState(false);
  const [discover,setDiscover]=useState(false);
  const [signal,setSignal]=useState(null);

  const pulse=()=>{
    if(pulsing)return;
    const next=SIGNALS[Math.floor(Math.random()*SIGNALS.length)];
    setSignal(next); setPulsing(true);
    setTimeout(()=>{setPulsing(false);setDiscover(true)},1800);
  };

  return <main className="world-app">
    <header><button className="brand" onClick={()=>setDiscover(false)}>PULSE</button><nav><span className="active">WORLD</span><span>EXPLORE</span><span>YOUR WORLD</span></nav><span className="edition">WORLD / 01</span></header>
    {!discover ? <section className={`world-hero ${pulsing?'is-pulsing':''}`}>
      <div className="copy"><span>THE WORLD / 2026</span><h1>The world is<br/><em>larger than you think.</em></h1><p>One world. An infinite number of things you have never seen.</p></div>
      <div className="globeArea"><Globe pulsing={pulsing} signal={signal} onPulse={pulse}/><p>{pulsing?'FOLLOWING THE SIGNAL':'DRAG TO EXPLORE · PULSE TO DISCOVER'}</p></div>
      <div className="heroMeta"><span>01</span><span>DISCOVERY ENGINE</span><span>EARTH · SKY · SPACE · HUMAN · FUTURE</span></div>
    </section> : <section className="found">
      <button onClick={()=>setDiscover(false)} className="back">← WORLD</button>
      <div className="foundVisual"><div className="foundImage"><span className="signalDot"/></div><div className="location"><b>{signal?.name}</b><span>{signal?.country}</span></div></div>
      <div className="foundText"><span>SIGNAL FOUND · 01</span><h2>{signal?.title}</h2><p>{signal?.text}</p><button onClick={()=>{setDiscover(false);setTimeout(pulse,250)}}>PULSE AGAIN →</button></div>
    </section>}
  </main>;
}
