"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronRight, Sparkles } from "lucide-react";

const DISCOVERIES = [
  { id:"svalbard", tag:"WORLD", place:"SVALBARD", meta:"78° N · NORWAY", hook:"Where the sun disappears for months.", fact:"Longyearbyen sits deep inside the Arctic Circle, where winter brings a polar night lasting for weeks.", why:"The world can feel completely different just a few degrees farther north.", image:"https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2200&q=90" },
  { id:"aurora", tag:"SKY", place:"NORTHERN LIGHTS", meta:"ARCTIC SKY", hook:"The sky can move like a living thing.", fact:"Auroras form when particles from the Sun interact with Earth's upper atmosphere and create huge waves of light.", why:"What looks like magic is a planetary-scale interaction above you.", image:"https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=2200&q=90" },
  { id:"socotra", tag:"EARTH", place:"SOCOTRA", meta:"12° N · YEMEN", hook:"An island that looks almost unreal.", fact:"Socotra has an unusually high number of species found nowhere else on Earth because of its long isolation.", why:"Earth can produce landscapes that feel more alien than fiction.", image:"https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2200&q=90" },
  { id:"airport", tag:"AVIATION", place:"KANSAI", meta:"34° N · JAPAN", hook:"An airport built out on the sea.", fact:"Kansai International Airport was constructed on an artificial island offshore from Osaka.", why:"Human engineering can completely redraw the boundary between land and sea.", image:"https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2200&q=90" },
  { id:"space", tag:"SPACE", place:"BEYOND VISIBLE LIGHT", meta:"THE UNIVERSE", hook:"Your eyes see only a tiny part of reality.", fact:"Astronomers use radio, infrared, ultraviolet and X-ray wavelengths to observe information hidden outside visible light.", why:"The universe is far bigger than what human vision can perceive.", image:"https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=2200&q=90" },
  { id:"architecture", tag:"DESIGN", place:"VERTICAL FORESTS", meta:"MODERN CITIES", hook:"A building can become part of the landscape.", fact:"Some towers integrate hundreds of trees and plants into balconies and terraces, creating vertical ecosystems.", why:"Architecture does not always have to separate a city from nature.", image:"https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=2200&q=90" },
  { id:"desert", tag:"NATURE", place:"DESERT BLOOM", meta:"AFTER THE RAIN", hook:"A desert can briefly become a sea of flowers.", fact:"After unusual rainfall, dormant seeds can germinate across arid landscapes and create short-lived blooms.", why:"Some ecosystems are designed around waiting.", image:"https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=2200&q=90" },
  { id:"nighttrain", tag:"JOURNEY", place:"OVERNIGHT RAIL", meta:"EUROPE · ASIA", hook:"Fall asleep in one city. Wake up in another.", fact:"Overnight trains turn the journey itself into part of the destination, crossing landscapes while passengers sleep.", why:"Travel can be an experience before you even arrive.", image:"https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=2200&q=90" }
];

function nextIndex(previous){ let n=Math.floor(Math.random()*DISCOVERIES.length); while(n===previous) n=Math.floor(Math.random()*DISCOVERIES.length); return n; }

export default function Page(){
  const [index,setIndex]=useState(null);
  const [saved,setSaved]=useState([]);
  const [phase,setPhase]=useState("idle");
  const [count,setCount]=useState(0);
  const discovery=index===null?null:DISCOVERIES[index];
  const isSaved=discovery?saved.includes(discovery.id):false;

  useEffect(()=>{try{setSaved(JSON.parse(localStorage.getItem("pulse-saved")||"[]"));}catch{}},[]);
  useEffect(()=>{localStorage.setItem("pulse-saved",JSON.stringify(saved));},[saved]);

  function pulse(){
    if(phase!=="idle")return;
    setPhase("charging");
    window.setTimeout(()=>{setIndex(nextIndex(index));setCount(c=>c+1);setPhase("reveal");window.setTimeout(()=>setPhase("idle"),900)},index===null?450:650);
  }
  function toggleSave(){if(!discovery)return;setSaved(s=>s.includes(discovery.id)?s.filter(x=>x!==discovery.id):[...s,discovery.id]);}

  return <main className={`pulse-app ${discovery?"has-world":"at-start"} phase-${phase}`}>
    <div className="noise"/><div className="light light-a"/><div className="light light-b"/>
    <header className="nav"><div className="logo"><span>P</span> PULSE</div><div className="nav-right">{discovery&&<span>DISCOVERY {String(count).padStart(2,"0")}</span>}<span className="live-dot"/>WORLD ENGINE</div></header>

    {!discovery ? <section className="start-screen">
      <div className="start-copy"><div className="micro"><Sparkles size={13}/> A DIFFERENT WAY TO EXPLORE</div><h1>Don't search.<br/><i>Discover.</i></h1><p>One tap brings something you didn't know existed into your world.</p></div>
      <button className="core-pulse" onClick={pulse}><span className="halo h1"/><span className="halo h2"/><span className="halo h3"/><span className="core-label">PULSE</span></button>
      <div className="start-rule"><span/> <b>THE NEXT THING IS UNKNOWN</b> <span/></div>
    </section> : <section className="world-screen" key={discovery.id}>
      <div className="world-photo" style={{backgroundImage:`url(${discovery.image})`}}><div className="photo-shade"/><div className="photo-grain"/>
        <div className="world-label"><span>{discovery.tag}</span><span>{discovery.meta}</span></div>
        <div className="world-title"><div className="overline">YOU DIDN'T CHOOSE THIS</div><h1>{discovery.place}</h1><p>{discovery.hook}</p></div>
      </div>
      <div className="reveal-bar"><div className="fact"><span>01 · LOOK CLOSER</span><p>{discovery.fact}</p></div><div className="why"><span>WHY IT MATTERS</span><p>{discovery.why}</p></div><div className="actions"><button className="save" onClick={toggleSave}>{isSaved?<BookmarkCheck size={17}/>:<Bookmark size={17}/>} {isSaved?"Saved":"Save"}</button><button className="another" onClick={pulse}>ANOTHER <ChevronRight size={17}/></button></div></div>
    </section>}

    <footer><span>Pulse / V0.5</span><span>{saved.length?`${saved.length} saved discoveries`:"THE WORLD IS BIGGER THAN YOUR FEED"}</span></footer>
  </main>;
}
