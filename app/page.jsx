"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronRight, Compass, Globe2, Search, Share2, Sparkles, Zap, Radio, MapPin } from "lucide-react";

const TOPICS = [
  "Socotra", "Svalbard", "Kansai International Airport", "Aurora", "Atacama Desert", "Aogashima", "Darvaza gas crater", "Lake Baikal", "Salar de Uyuni", "Antarctica", "James Webb Space Telescope", "International Space Station", "Voyager program", "CERN", "Large Hadron Collider", "vertical forest", "Singapore Changi Airport", "Trans-Siberian Railway", "Fingal's Cave", "Giant's Causeway", "Waitomo Glowworm Caves", "Deep sea", "Mariana Trench", "bioluminescence", "ball lightning", "supercell", "Oymyakon", "Atacama Large Millimeter Array", "Palm Islands", "Øresund Bridge", "Channel Tunnel", "Shinkansen", "Starlink", "Reusable launch system", "International Space Station", "Antikythera mechanism", "Nazca Lines", "Machu Picchu", "Göbekli Tepe", "Moai", "Cappadocia"
];

const FALLBACK = [
  {id:"svalbard", tag:"REMOTE WORLD", place:"SVALBARD", meta:"78° N · NORWAY", hook:"Where the sun disappears for months.", fact:"Longyearbyen sits deep inside the Arctic Circle, where winter brings a long polar night.", why:"The planet can feel completely different a few degrees farther north.", image:"https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2200&q=90"},
  {id:"kansai", tag:"AVIATION", place:"KANSAI", meta:"34° N · JAPAN", hook:"An airport built out on the sea.", fact:"Kansai International Airport was constructed on an artificial island offshore from Osaka.", why:"Human engineering can redraw the boundary between land and sea.", image:"https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2200&q=90"},
  {id:"socotra", tag:"EARTH", place:"SOCOTRA", meta:"12° N · YEMEN", hook:"An island that looks almost unreal.", fact:"Socotra has an unusually high number of species found nowhere else on Earth because of its isolation.", why:"Earth can produce landscapes that feel more alien than fiction.", image:"https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2200&q=90"}
];

const CATEGORIES = ["ALL","WORLD","EARTH","SKY","AVIATION","SPACE","DESIGN","NATURE","JOURNEY","FUTURE"];

const categoryFor = (text="") => {
  const t=text.toLowerCase();
  if (/airport|aircraft|aviation|railway|shinkansen|bridge|tunnel/.test(t)) return "AVIATION";
  if (/space|voyager|starlink|telescope|station|launch|cern|hadron/.test(t)) return "SPACE";
  if (/aurora|sky|supercell|lightning/.test(t)) return "SKY";
  if (/desert|island|lake|ocean|mariana|antarctica|socotra|svalbard|cave|baikal|earth|bioluminescence/.test(t)) return "EARTH";
  if (/forest|nature|glowworm|moai/.test(t)) return "NATURE";
  if (/architecture|building|vertical|palm islands/.test(t)) return "DESIGN";
  if (/railway|train|journey/.test(t)) return "JOURNEY";
  if (/future|reusable|starlink/.test(t)) return "FUTURE";
  return "WORLD";
};

function fallbackDiscovery(previous) {
  let pool = FALLBACK.filter(x => x.id !== previous?.id);
  return pool[Math.floor(Math.random()*pool.length)] || FALLBACK[0];
}

async function getDynamicDiscovery(previous) {
  const shuffled = [...TOPICS].sort(() => Math.random() - 0.5);
  for (const topic of shuffled.slice(0, 5)) {
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.extract || !data.thumbnail?.source || data.type === "disambiguation") continue;
      const title = data.title || topic;
      if (previous && title.toLowerCase() === previous.place.toLowerCase()) continue;
      const tag = categoryFor(`${title} ${data.description || ""}`);
      const location = data.coordinates?.[0];
      const meta = location ? `${location.lat.toFixed(2)}° · ${location.lon.toFixed(2)}°` : "WORLD · LIVE SOURCE";
      return {
        id: `wiki-${data.pageid || title}`,
        tag,
        place: title.toUpperCase(),
        meta,
        hook: data.description ? data.description.replace(/^./, c => c.toUpperCase()) + "." : "A piece of the world worth looking closer at.",
        fact: data.extract,
        why: "This discovery was pulled from a live knowledge source rather than a fixed list.",
        image: data.thumbnail.source,
        source: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`,
        dynamic: true
      };
    } catch {}
  }
  return fallbackDiscovery(previous);
}

export default function Page() {
  const [discovery,setDiscovery] = useState(null);
  const [saved,setSaved] = useState([]);
  const [mode,setMode] = useState("home");
  const [detail,setDetail] = useState(false);
  const [count,setCount] = useState(0);
  const [category,setCategory] = useState("ALL");
  const [search,setSearch] = useState("");
  const [showSearch,setShowSearch] = useState(false);
  const [loading,setLoading] = useState(false);
  const [status,setStatus] = useState("READY");
  const [history,setHistory] = useState([]);

  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem("pulse-saved") || "[]")); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("pulse-saved", JSON.stringify(saved)); } catch {} }, [saved]);

  const isSaved = discovery ? saved.some(x => x.id === discovery.id) : false;
  const collection = useMemo(() => saved, [saved]);

  async function pulse() {
    if (loading) return;
    setLoading(true); setDetail(false); setMode("charge"); setStatus("SCANNING THE WORLD");
    await new Promise(r => setTimeout(r, 420));
    const next = await getDynamicDiscovery(discovery);
    setHistory(h => discovery ? [discovery, ...h].slice(0, 12) : h);
    setDiscovery(next); setCount(c => c + 1); setMode("discover"); setStatus(next.dynamic ? "LIVE KNOWLEDGE SOURCE" : "CURATED FALLBACK"); setLoading(false);
  }

  function openDiscovery(item) { setDiscovery(item); setMode("discover"); setDetail(false); }
  function toggleSave() { if (!discovery) return; setSaved(s => s.some(x => x.id === discovery.id) ? s.filter(x => x.id !== discovery.id) : [...s, discovery]); }
  async function share() { if (!discovery) return; try { await navigator.clipboard.writeText(`Pulse — ${discovery.place}: ${discovery.hook}`); setStatus("COPIED TO CLIPBOARD"); setTimeout(() => setStatus(discovery.dynamic ? "LIVE KNOWLEDGE SOURCE" : "CURATED FALLBACK"), 1200); } catch {} }

  const filteredHistory = history.filter(d => (category === "ALL" || d.tag === category) && (!search || `${d.place} ${d.hook} ${d.tag}`.toLowerCase().includes(search.toLowerCase())));

  return <main className={`pulse-app mode-${mode}`}>
    <div className="noise"/><div className="orb orb-a"/><div className="orb orb-b"/>
    <header className="nav">
      <button className="logo" onClick={() => {setMode("home");setDiscovery(null)}}><span>P</span>PULSE</button>
      <nav>
        <button className={mode === "home" ? "active" : ""} onClick={() => {setMode("home");setDiscovery(null)}}><Zap size={13}/> Pulse</button>
        <button className={mode === "explore" ? "active" : ""} onClick={() => setMode("explore")}><Compass size={13}/> Explore</button>
        <button className={mode === "collection" ? "active" : ""} onClick={() => setMode("collection")}><Bookmark size={13}/> Collection</button>
      </nav>
      <div className="nav-right"><button className="search-trigger" onClick={() => setShowSearch(true)}><Search size={15}/></button><span className="live-dot"/> LIVE</div>
    </header>

    {(mode === "home" || mode === "charge") && <section className="home-stage">
      <div className="home-copy"><div className="micro"><Radio size={13}/> DYNAMIC WORLD DISCOVERY</div><h1>The world is<br/><i>still unknown.</i></h1><p>Pulse searches a live knowledge source and pulls one unexpected place, phenomenon, object or idea into view. <b>No feed. No fixed sequence.</b></p><div className="stats"><span><b>{count}</b> pulses</span><span><b>{saved.length}</b> saved</span></div></div>
      <div className="portal-wrap"><button className="portal" onClick={pulse} disabled={loading}><span className="portal-grid"/><span className="portal-ring r1"/><span className="portal-ring r2"/><span className="portal-ring r3"/><span className="portal-ring r4"/><span className="portal-core"><Globe2 size={24}/><b>{loading ? "SYNC" : "PULSE"}</b><small>{loading ? "SCANNING" : "ENTER THE UNKNOWN"}</small></span></button></div>
      <div className="home-side"><div><span className="side-label">LIVE ENGINE</span><strong>Don't choose what you discover.</strong><p>Every Pulse makes a fresh web request and selects a new subject with an image and source.</p></div><button onClick={() => setMode("explore")}>Open recent discoveries <ChevronRight size={14}/></button></div>
      <div className="home-bottom"><span><Sparkles size={13}/> {status}</span><span>THE NEXT WORLD IS HIDDEN</span></div>
    </section>}

    {mode === "explore" && <section className="explore-stage"><div className="section-head"><div><span className="micro">YOUR RECENTLY DISCOVERED WORLD</span><h2>Explore.</h2></div><button className="big-pulse" onClick={pulse}><Zap size={15}/> New live Pulse</button></div><div className="chips">{CATEGORIES.map(c => <button key={c} className={category === c ? "selected" : ""} onClick={() => setCategory(c)}>{c}</button>)}</div><div className="explore-grid">{filteredHistory.length ? filteredHistory.map(d => <button className="explore-card" key={d.id} onClick={() => openDiscovery(d)}><div style={{backgroundImage:`url(${d.image})`}}/><span>{d.tag}</span><small>{d.meta}</small><h3>{d.hook}</h3><em>Open discovery <ChevronRight size={13}/></em></button>) : <div className="empty"><Compass size={30}/><h3>Your exploration starts here.</h3><p>Pulse into the live world. Every result is fetched at discovery time.</p><button onClick={pulse}>Find something unexpected <ChevronRight size={15}/></button></div>}</div></section>}

    {mode === "collection" && <section className="collection-stage"><div className="section-head"><div><span className="micro">THINGS YOU CHOSE TO KEEP</span><h2>Collection.</h2></div><div className="collection-count">{collection.length}<small>DISCOVERIES</small></div></div>{collection.length === 0 ? <div className="empty"><Bookmark size={30}/><h3>Nothing here yet.</h3><p>Don't save everything. Save the discoveries that genuinely changed your view of the world.</p><button onClick={() => {setMode("home");setDiscovery(null)}}>Start discovering <ChevronRight size={15}/></button></div> : <div className="collection-grid">{collection.map(d => <button className="collection-card" key={d.id} onClick={() => openDiscovery(d)}><div style={{backgroundImage:`url(${d.image})`}}/><span>{d.tag}</span><h3>{d.place}</h3><p>{d.hook}</p></button>)}</div>}</section>}

    {mode === "discover" && discovery && <section className="discovery-stage">
      <div className="discovery-visual" style={{backgroundImage:`url(${discovery.image})`}}><div className="visual-wash"/><div className="coordinates"><span><MapPin size={10}/> {discovery.meta}</span><span>{discovery.dynamic ? "LIVE" : "CURATED"} · {String(count).padStart(2,"0")}</span></div><div className="discovery-heading"><div className="tag">{discovery.tag} · {discovery.dynamic ? "DYNAMIC" : "CURATED"}</div><h1>{discovery.place}</h1><p>{discovery.hook}</p></div><div className="visual-index"><span>DISCOVER</span><i/><span>{String(count).padStart(2,"0")}</span></div></div>
      <div className="discovery-dock"><div className="dock-main"><span className="dock-label">YOU FOUND THIS</span><p>{detail ? discovery.fact : discovery.hook}</p><button className="detail-button" onClick={() => setDetail(v => !v)}>{detail ? "SHOW LESS" : "LOOK CLOSER"}</button>{discovery.source && <a className="source-link" href={discovery.source} target="_blank" rel="noreferrer">SOURCE · WIKIPEDIA</a>}</div><div className="dock-side"><div className="why-block"><span>WHY IT'S WORTH KNOWING</span><p>{discovery.why}</p></div><div className="dock-actions"><button onClick={toggleSave}>{isSaved ? <BookmarkCheck size={16}/> : <Bookmark size={16}/>} {isSaved ? "Saved" : "Save"}</button><button onClick={share}><Share2 size={16}/> Share</button><button className="next" onClick={pulse}>NEXT PULSE <ChevronRight size={17}/></button></div></div></div>
      <div className="related"><span>STATUS</span><button onClick={() => setMode("explore")}><span>{status}</span>Explore your trail<ChevronRight size={13}/></button></div>
    </section>}

    <footer><span>Pulse / Dynamic</span><span>{status}</span></footer>
    {showSearch && <div className="search-modal"><div className="search-box"><button onClick={() => setShowSearch(false)}>×</button><Search size={18}/><input autoFocus placeholder="Search your discovery trail..." value={search} onChange={e => {setSearch(e.target.value);setMode("explore")}}/><span>ESC</span></div></div>}
  </main>;
}
