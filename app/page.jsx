"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronRight, Compass, Globe2, Map, Play, Search, Share2, Sparkles, X, Zap } from "lucide-react";

const DISCOVERIES = [
  { id:"svalbard", tag:"REMOTE WORLD", place:"SVALBARD", meta:"78° N · NORWAY", hook:"Where the sun disappears for months.", fact:"Longyearbyen sits deep inside the Arctic Circle, where winter brings a polar night lasting for weeks.", why:"The world can feel completely different just a few degrees farther north.", image:"https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2200&q=90", color:"ice", related:["aurora","socotra"] },
  { id:"aurora", tag:"SKY", place:"NORTHERN LIGHTS", meta:"ARCTIC SKY", hook:"The sky can move like a living thing.", fact:"Auroras form when particles from the Sun interact with Earth's upper atmosphere and create huge waves of light.", why:"What looks like magic is a planetary-scale interaction above you.", image:"https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=2200&q=90", color:"night", related:["space","svalbard"] },
  { id:"socotra", tag:"EARTH", place:"SOCOTRA", meta:"12° N · YEMEN", hook:"An island that looks almost unreal.", fact:"Socotra has an unusually high number of species found nowhere else on Earth because of its long isolation.", why:"Earth can produce landscapes that feel more alien than fiction.", image:"https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2200&q=90", color:"sand", related:["desert","svalbard"] },
  { id:"airport", tag:"AVIATION", place:"KANSAI", meta:"34° N · JAPAN", hook:"An airport built out on the sea.", fact:"Kansai International Airport was constructed on an artificial island offshore from Osaka.", why:"Human engineering can completely redraw the boundary between land and sea.", image:"https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2200&q=90", color:"sky", related:["architecture","nighttrain"] },
  { id:"space", tag:"SPACE", place:"BEYOND VISIBLE LIGHT", meta:"THE UNIVERSE", hook:"Your eyes see only a tiny part of reality.", fact:"Astronomers use radio, infrared, ultraviolet and X-ray wavelengths to observe information hidden outside visible light.", why:"The universe is far bigger than what human vision can perceive.", image:"https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=2200&q=90", color:"space", related:["aurora","future"] },
  { id:"architecture", tag:"DESIGN", place:"VERTICAL FORESTS", meta:"MODERN CITIES", hook:"A building can become part of the landscape.", fact:"Some towers integrate hundreds of trees and plants into balconies and terraces, creating vertical ecosystems.", why:"Architecture does not always have to separate a city from nature.", image:"https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=2200&q=90", color:"city", related:["airport","future"] },
  { id:"desert", tag:"NATURE", place:"DESERT BLOOM", meta:"AFTER THE RAIN", hook:"A desert can briefly become a sea of flowers.", fact:"After unusual rainfall, dormant seeds can germinate across arid landscapes and create short-lived blooms.", why:"Some ecosystems are designed around waiting.", image:"https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=2200&q=90", color:"sand", related:["socotra","earth"] },
  { id:"nighttrain", tag:"JOURNEY", place:"OVERNIGHT RAIL", meta:"EUROPE · ASIA", hook:"Fall asleep in one city. Wake up in another.", fact:"Overnight trains turn the journey itself into part of the destination, crossing landscapes while passengers sleep.", why:"Travel can be an experience before you even arrive.", image:"https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=2200&q=90", color:"night", related:["airport","svalbard"] },
  { id:"future", tag:"FUTURE", place:"VERTICAL FARMS", meta:"CONTROLLED ENVIRONMENTS", hook:"The farm can move inside the city.", fact:"Controlled-environment agriculture can grow food indoors with carefully managed light, temperature, water and nutrients.", why:"A future city could grow food inside its own buildings.", image:"https://images.unsplash.com/photo-1515150144380-bca9f1650ed9?auto=format&fit=crop&w=2200&q=90", color:"future", related:["architecture","space"] }
];

const CATEGORIES=["ALL","WORLD","EARTH","SKY","AVIATION","SPACE","DESIGN","NATURE","JOURNEY","FUTURE"];

function randomIndex(previous, pool=DISCOVERIES){ if(pool.length<2)return 0; let n=Math.floor(Math.random()*pool.length); while(pool[n].id===previous?.id)n=Math.floor(Math.random()*pool.length); return DISCOVERIES.findIndex(x=>x.id===pool[n].id); }

export default function Page(){
  const [index,setIndex]=useState(null);
  const [saved,setSaved]=useState([]);
  const [mode,setMode]=useState("home");
  const [count,setCount]=useState(0);
  const [detail,setDetail]=useState(false);
  const [category,setCategory]=useState("ALL");
  const [search,setSearch]=useState("");
  const [showSearch,setShowSearch]=useState(false);
  const [streak,setStreak]=useState(0);
  const discovery=index===null?null:DISCOVERIES[index];
  const isSaved=discovery?saved.includes(discovery.id):false;
  const filtered=useMemo(()=>DISCOVERIES.filter(d=>(category==="ALL"||d.tag===category)&&(!search||`${d.place} ${d.hook} ${d.tag}`.toLowerCase().includes(search.toLowerCase()))),[category,search]);

  useEffect(()=>{try{setSaved(JSON.parse(localStorage.getItem("pulse-saved")||"[]"));setStreak(Number(localStorage.getItem("pulse-streak")||0));}catch{}},[]);
  useEffect(()=>{localStorage.setItem("pulse-saved",JSON.stringify(saved));},[saved]);

  function pulse(pool=filtered){
    if(mode==="charge")return;
    setDetail(false);setMode("charge");
    window.setTimeout(()=>{const next=randomIndex(discovery,pool.length?pool:DISCOVERIES);setIndex(next);setCount(c=>c+1);setStreak(s=>{const n=s+1;localStorage.setItem("pulse-streak",String(n));return n});setMode("reveal");window.setTimeout(()=>setMode("discover"),900)},650);
  }
  function openDiscovery(id){setIndex(DISCOVERIES.findIndex(d=>d.id===id));setCount(c=>c+1);setDetail(false);setMode("discover");}
  function toggleSave(){if(!discovery)return;setSaved(s=>s.includes(discovery.id)?s.filter(x=>x!==discovery.id):[...s,discovery.id]);}
  async function share(){if(!discovery)return;try{await navigator.clipboard.writeText(`Pulse — ${discovery.place}: ${discovery.hook}`);setMode("shared");window.setTimeout(()=>setMode("discover"),900)}catch{}}

  return <main className={`pulse-app mode-${mode}`}>
    <div className="noise"/><div className="orb orb-a"/><div className="orb orb-b"/>
    <header className="nav"><button className="logo" onClick={()=>{setMode("home");setIndex(null)}}><span>P</span>PULSE</button><nav><button className={mode==="home"?"active":""} onClick={()=>{setMode("home");setIndex(null)}}><Zap size={13}/> Pulse</button><button onClick={()=>setMode("explore")}><Compass size={13}/> Explore</button><button onClick={()=>setMode("collection")}><Bookmark size={13}/> Collection</button></nav><div className="nav-right"><button className="search-trigger" onClick={()=>setShowSearch(true)}><Search size={15}/></button><span className="streak"><Sparkles size={12}/> {streak}</span><span className="live-dot"/>LIVE</div></header>

    {mode==="home"||mode==="charge" ? <section className="home-stage">
      <div className="home-copy"><div className="micro"><Sparkles size={13}/> DISCOVERY WITHOUT THE FEED</div><h1>There is a world<br/><i>you haven't seen.</i></h1><p>One pulse gives you a place, idea or phenomenon chosen without your input. <b>No feed. No search. Just curiosity.</b></p><div className="stats"><span><b>{DISCOVERIES.length}</b> curated worlds</span><span><b>{saved.length}</b> in your collection</span></div></div>
      <div className="portal-wrap"><button className="portal" onClick={()=>pulse()} aria-label="Pulse"><span className="portal-grid"/><span className="portal-ring r1"/><span className="portal-ring r2"/><span className="portal-ring r3"/><span className="portal-ring r4"/><span className="portal-core"><Globe2 size={24}/><b>{mode==="charge"?"SYNC":"PULSE"}</b><small>{mode==="charge"?"CONNECTING":"ENTER THE UNKNOWN"}</small></span></button></div>
      <div className="home-side"><div><span className="side-label">TODAY'S IDEA</span><strong>Don't choose what you discover.</strong><p>The point is the surprise. The next world is deliberately hidden.</p></div><button onClick={()=>setMode("explore")}>Explore the archive <ChevronRight size={14}/></button></div>
      <div className="home-bottom"><span><Compass size={13}/> RANDOM BY DESIGN</span><span>{streak>0?`${streak} DISCOVERIES THIS SESSION`:"THE NEXT DISCOVERY IS NOT CHOSEN BY YOU"}</span></div>
    </section> : mode==="explore" ? <section className="explore-stage"><div className="section-head"><div><span className="micro">THE WORLD, ORGANIZED FOR CURIOUS MINDS</span><h2>Explore.</h2></div><button className="big-pulse" onClick={()=>pulse()}><Zap size={15}/> Random pulse</button></div><div className="chips">{CATEGORIES.map(c=><button key={c} className={category===c?"selected":""} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="explore-grid">{filtered.map((d,i)=><button className="explore-card" key={d.id} onClick={()=>openDiscovery(d.id)}><div style={{backgroundImage:`url(${d.image})`}}/><span>{d.tag}</span><small>{d.meta}</small><h3>{d.hook}</h3><em>Open discovery <ChevronRight size={13}/></em></button>)}</div></section> : mode==="collection" ? <section className="collection-stage"><div className="section-head"><div><span className="micro">YOUR PERSONAL WORLD</span><h2>Collection.</h2></div><div className="collection-count">{saved.length}<small>DISCOVERIES</small></div></div>{saved.length===0?<div className="empty"><Globe2 size={30}/><h3>Your world is empty.</h3><p>Pulse into something unexpected, then save the discoveries you want to keep.</p><button onClick={()=>{setMode("home");setIndex(null)}}>Start discovering <ChevronRight size={15}/></button></div>:<div className="collection-grid">{DISCOVERIES.filter(d=>saved.includes(d.id)).map(d=><button className="collection-card" key={d.id} onClick={()=>openDiscovery(d.id)}><div style={{backgroundImage:`url(${d.image})`}}/><span>{d.tag}</span><h3>{d.place}</h3><p>{d.hook}</p></button>)}</div>}</section> : <section className="discovery-stage">
      <div className="discovery-visual" style={{backgroundImage:`url(${discovery.image})`}}><div className="visual-wash"/><div className="coordinates"><span>{discovery.meta}</span><span>DISCOVERY {String(count).padStart(2,"0")}</span></div><div className="discovery-heading"><div className="tag">{discovery.tag} · UNEXPECTED</div><h1>{discovery.place}</h1><p>{discovery.hook}</p></div><div className="visual-index"><span>01</span><i/><span>0{DISCOVERIES.length}</span></div></div>
      <div className="discovery-dock"><div className="dock-main"><span className="dock-label">YOU FOUND THIS</span><p>{detail?discovery.fact:discovery.hook}</p><button className="detail-button" onClick={()=>setDetail(v=>!v)}>{detail?"SHOW LESS":"LOOK CLOSER"}</button></div><div className="dock-side"><div className="why-block"><span>WHY IT'S WORTH KNOWING</span><p>{discovery.why}</p></div><div className="dock-actions"><button onClick={toggleSave}>{isSaved?<BookmarkCheck size={16}/>:<Bookmark size={16}/>} {isSaved?"Saved":"Save"}</button><button onClick={share}><Share2 size={16}/> Share</button><button className="next" onClick={()=>pulse()}>NEXT DISCOVERY <ChevronRight size={17}/></button></div></div></div>
      <div className="related"><span>GO DEEPER</span>{discovery.related.map(id=>{const r=DISCOVERIES.find(x=>x.id===id);return r?<button key={id} onClick={()=>openDiscovery(id)}><span>{r.tag}</span>{r.place}<ChevronRight size={13}/></button>:null})}</div>
    </section>}

    <footer><span>Pulse / V2</span><span>{mode==="shared"?"COPIED TO CLIPBOARD":mode==="explore"?`${filtered.length} DISCOVERIES`:saved.length?`${saved.length} DISCOVERIES IN YOUR COLLECTION`:"THE WORLD IS BIGGER THAN YOUR FEED"}</span></footer>
    {showSearch&&<div className="search-modal"><div className="search-box"><button onClick={()=>setShowSearch(false)}><X size={18}/></button><Search size={18}/><input autoFocus placeholder="Search the known world..." value={search} onChange={e=>{setSearch(e.target.value);setMode("explore")}}/><span>ESC</span></div></div>}
  </main>;
}
