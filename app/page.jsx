'use client';

import { useEffect, useRef, useState } from 'react';

function Globe({ pulsing, onPulse }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf, start = performance.now();
    const draw = (now) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const w=rect.width,h=rect.height,cx=w/2,cy=h/2,r=Math.min(w,h)*.39;
      const t=(now-start)/1000;
      ctx.clearRect(0,0,w,h);
      ctx.save(); ctx.translate(cx,cy);
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fillStyle='#e7dfd2'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle='rgba(73,69,62,.18)'; ctx.lineWidth=.7;
      for(let i=-3;i<=3;i++){const y=i*r/4, ry=Math.sqrt(Math.max(0,r*r-y*y));ctx.beginPath();ctx.ellipse(0,y,ry,ry*.16,0,0,Math.PI*2);ctx.stroke();}
      for(let i=-4;i<=4;i++){const x=i*r/4;ctx.beginPath();ctx.ellipse(x+Math.sin(t*.25)*16,0,r*.18,r,0,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle='#777168';
      const drift=Math.sin(t*.22)*24;
      [[-105+drift,-38,72,40],[10+drift,-62,55,31],[78+drift,-4,67,43],[-20+drift,43,48,28],[118+drift,52,30,18]].forEach(([x,y,rx,ry])=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,.15,0,Math.PI*2);ctx.fill();});
      ctx.restore();
      if(pulsing){const p=(t*1.7)%1;ctx.beginPath();ctx.arc(0,0,r*(1+p*.3),0,Math.PI*2);ctx.strokeStyle=`rgba(142,100,51,${.42*(1-p)})`;ctx.lineWidth=2;ctx.stroke();}
      ctx.restore(); raf=requestAnimationFrame(draw);
    }; raf=requestAnimationFrame(draw); return()=>cancelAnimationFrame(raf);
  },[pulsing]);
  return <button className="globe" onClick={onPulse} aria-label="Pulse into the world"><canvas ref={canvasRef}/><span className="globeCenter"><b>{pulsing?'SIGNAL':'PULSE'}</b><small>{pulsing?'FOUND':'ENTER THE UNKNOWN'}</small></span></button>;
}

export default function Page(){
  const [pulsing,setPulsing]=useState(false); const [discover,setDiscover]=useState(false);
  const pulse=()=>{if(pulsing)return;setPulsing(true);setTimeout(()=>{setPulsing(false);setDiscover(true)},1500)};
  return <main className="world-app">
    <header><button className="brand">PULSE</button><nav><span className="active">WORLD</span><span>EXPLORE</span><span>YOUR WORLD</span></nav><span className="edition">WORLD / 01</span></header>
    {!discover ? <section className={`world-hero ${pulsing?'is-pulsing':''}`}>
      <div className="copy"><span>THE WORLD / 2026</span><h1>The world is<br/><em>larger than you think.</em></h1><p>One world. An infinite number of things you have never seen.</p></div>
      <div className="globeArea"><Globe pulsing={pulsing} onPulse={pulse}/><p>{pulsing?'SEARCHING THE WORLD':'PULSE TO DISCOVER'}</p></div>
      <div className="heroMeta"><span>01</span><span>DISCOVERY ENGINE</span><span>EARTH · SKY · SPACE · HUMAN · FUTURE</span></div>
    </section> : <section className="found"><button onClick={()=>setDiscover(false)} className="back">← WORLD</button><div className="foundImage"/><div className="foundText"><span>SIGNAL FOUND · 01</span><h2>Somewhere<br/><em>unknown.</em></h2><p>Your first Pulse has found a place in the world. This is only the beginning.</p><button onClick={pulse}>PULSE AGAIN →</button></div></section>}
  </main>;
}
