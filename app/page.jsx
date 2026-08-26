"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronRight, Compass, Globe2, Share2, Sparkles } from "lucide-react";

const DISCOVERIES = [
  { id:"svalbard", tag:"REMOTE WORLD", place:"SVALBARD", meta:"78° N · NORWAY", hook:"Where the sun disappears for months.", fact:"Longyearbyen sits deep inside the Arctic Circle, where winter brings a polar night lasting for weeks.", why:"The world can feel completely different just a few degrees farther north.", image:"https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2200&q=90" },
  { id:"aurora", tag:"SKY", place:"NORTHERN LIGHTS", meta:"ARCTIC SKY", hook:"The sky can move like a living thing.", fact:"Auroras form when particles from the Sun interact with Earth's upper atmosphere and create huge waves of light.", why:"What looks like magic is a planetary-scale interaction above you.", image:"https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=2200&q=90" },
  { id:"socotra", tag:"EARTH", place:"SOCOTRA", meta:"12° N · YEMEN", hook:"An island that looks almost unreal.", fact:"Socotra has an unusually high number of species found nowhere else on Earth because of its long isolation.", why:"Earth can produce landscapes that feel more alien than fiction.", image:"https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2200&q=90" },
  { id:"airport", tag:"AVIATION", place:"KANSAI", meta:"34° N · JAPAN", hook:"An airport built out on the sea.", fact:"Kansai International Airport was constructed on an artificial island offshore from Osaka.", why:"Human engineering can completely redraw the boundary between land and sea.", image:"https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2200&q=90" },
  { id:"space", tag:"SPACE", place:"BEYOND VISIBLE LIGHT", meta:"THE UNIVERSE", hook:"Your eyes see only a tiny part of reality.", fact:"Astronomers use radio, infrared, ultraviolet and X-ray wavelengths to observe information hidden outside visible light.", why:"The universe is far bigger than what human vision can perceive.", image:"https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=2200&q=90" },
  { id:"architecture", tag:"DESIGN", place:"VERTICAL FORESTS", meta:"MODERN CITIES", hook:"A building can become part of the landscape.", fact:"Some towers integrate hundreds of trees and plants into balconies and terraces, creating vertical ecosystems.", why:"Architecture does not always have to separate a city from nature.", image:"https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=2200&q=90" },
  { id:"desert", tag:"NATURE", place:"DESERT BLOOM", meta:"AFTER THE RAIN", hook:"A desert can briefly become a sea of flowers.", fact:"After unusual rainfall, dormant seeds can germinate across arid landscapes and create short-lived blooms.", why:"Some ecosystems are designed around waiting.", image:"https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=2200&q=90" },
  { id:"nighttrain", tag:"JOURNEY", place:"OVERNIGHT RAIL", meta:"EUROPE · ASIA", hook:"Fall asleep in one city. Wake up in another.", fact:"Overnight trains turn the journey itself into part of the destination, crossing landscapes while passengers sleep.", why:"Travel can be an experience before you even arrive.", image:"https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=2200&q=90" }
];

function nextIndex(previous){let n=Math.floor(Math.random()*DISCOVERIES.length);while(n===previous)n=Math.floor(Math.random()*DISCOVERIES.length);return n;}

export default function Page(){
  const [index,setIndex]=useState(null);
  const [saved,setSaved]=useState([]);
  const [mode,setMode]=useState("ready");
  const [count,setCount]=useState(0);
  const [detail,setDetail]=useState(false);
  const discovery=index===null?null:DISCOVERIES[index];
  const isSaved=discovery?saved.includes(discovery.id):false;
  const progress=useMemo(()=>index===null?0:((index+1)/DISCOVERIES.length)*100,[index]);

  useEffect(()=>{try{setSaved(JSON.parse(localStorage.getItem("pulse-saved")||"[]"));}catch{}},[]);
  useEffect(()=>{localStorage.setItem("pulse-saved",JSON.stringify(saved));},[saved]);

  function pulse(){
    if(mode!=="ready")return;
    setDetail(false);setMode("charge");
    window.setTimeout(()=>{setIndex(nextIndex(index));setCount(c=>c+1);setMode("reveal");window.setTimeout(()=>setMode("ready"),1050)},720);
  }
  function toggleSave(){if(!discovery)return;setSaved(s=>s.includes(discovery.id)?s.filter(x=>x!==discovery.id):[...s,discovery.id]);}
  async function share(){if(!discovery)return;try{await navigator.clipboard.writeText(`Pulse — ${discovery.place}: ${discovery.hook}`);setMode("shared");window.setTimeout(()=>setMode("ready"),900)}catch{}}

  return <main className={`pulse-app mode-${mode} ${discovery?"discovered":"home"}`}>
    <div className="noise"/><div className="orb orb-a"/><div className="orb orb-b"/>
    <header className="nav"><div className="logo"><span>P</span>PULSE</div><div className="nav-center">WORLD DISCOVERY ENGINE</div><div className="nav-right">{saved.length>0&&<span>{saved.length} SAVED</span>}<span className="live-dot"/>NOW</div></header>

    {!discovery ? <section className="home-stage">
      <div className="home-copy"><div className="micro"><Sparkles size={13}/> DISCOVERY WITHOUT THE FEED</div><h1>There is a world<br/><i>you haven't seen.</i></h1><p>Don't search. Don't scroll. <b>Pulse.</b> Something unexpected will appear.</p></div>
      <div className="portal-wrap"><button className="portal" onClick={pulse} aria-label="Pulse"><span className="portal-grid"/><span className="portal-ring r1"/><span className="portal-ring r2"/><span className="portal-ring r3"/><span className="portal-core"><Globe2 size={25}/><b>PULSE</b><small>ENTER THE UNKNOWN</small></span></button></div>
      <div className="home-bottom"><span><Compass size={13}/> RANDOM BY DESIGN</span><span>THE NEXT DISCOVERY IS NOT CHOSEN BY YOU</span></div>
    </section> : <section className="discovery-stage">
      <div className="discovery-visual" style={{backgroundImage:`url(${discovery.image})`}}><div className="visual-wash"/><div className="coordinates"><span>{discovery.meta}</span><span>DISCOVERY {String(count).padStart(2,"0")}</span></div><div className="discovery-heading"><div className="tag">{discovery.tag} · UNEXPECTED</div><h1>{discovery.place}</h1><p>{discovery.hook}</p></div><div className="visual-index"><span>01</span><i/><span>08</span></div></div>
      <div className="discovery-dock">
        <div className="dock-main"><span className="dock-label">YOU FOUND THIS</span><p>{detail?discovery.fact:discovery.hook}</p><button className="detail-button" onClick={()=>setDetail(v=>!v)}>{detail?"SHOW LESS":"LOOK CLOSER"}</button></div>
        <div className="dock-side"><div className="why-block"><span>WHY IT'S WORTH KNOWING</span><p>{discovery.why}</p></div><div className="dock-actions"><button onClick={toggleSave}>{isSaved?<BookmarkCheck size={16}/>:<Bookmark size={16}/>} {isSaved?"Saved":"Save"}</button><button onClick={share}><Share2 size={16}/> Share</button><button className="next" onClick={pulse}>NEXT DISCOVERY <ChevronRight size={17}/></button></div></div>
      </div>
      <div className="progress"><span style={{width:`${progress}%`}}/></div>
    </section>}
    <footer><span>Pulse / V1.0 CONCEPT</span><span>{mode==="shared"?"COPIED TO CLIPBOARD":saved.length?`${saved.length} discoveries in your collection`:"THE WORLD IS BIGGER THAN YOUR FEED"}</span></footer>
  </main>;
}
