import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronRight, Sparkles } from "lucide-react";

const DISCOVERIES = [
  { id: "aurora", category: "EARTH", accent: "Northern skies", title: "There are places where the sky moves like a curtain.", body: "Auroras appear when charged particles from the Sun interact with Earth's upper atmosphere, creating enormous moving patterns of light.", why: "The sky above you can become a natural light show." },
  { id: "airport", category: "AVIATION", accent: "Built beyond the shore", title: "An airport runway can be built on an artificial island.", body: "Offshore engineering and reclaimed land have allowed airports to extend infrastructure far beyond a natural coastline.", why: "It sounds futuristic, but it is real engineering." },
  { id: "forest", category: "ARCHITECTURE", accent: "Cities can grow upward", title: "A tower can become a small forest.", body: "Some modern towers integrate large numbers of trees and plants into balconies and terraces, creating vertical ecosystems.", why: "Architecture can bring nature into the structure itself." },
  { id: "space", category: "SPACE", accent: "Invisible information", title: "The universe is full of light you cannot see.", body: "Astronomers observe infrared, radio, ultraviolet and X-ray wavelengths to study parts of the universe invisible to human eyes.", why: "Visible light is only a tiny slice of the information reaching Earth." },
  { id: "desert", category: "NATURE", accent: "A temporary transformation", title: "A desert can suddenly look nothing like a desert.", body: "After unusual rainfall, dormant seeds can germinate across arid landscapes and produce short-lived blooms.", why: "Some ecosystems are built around waiting." },
  { id: "night-train", category: "WORLD", accent: "Wake up elsewhere", title: "Some journeys are designed to happen while you sleep.", body: "Overnight rail routes turn travel time into part of the experience: leave one city at night and wake up somewhere else.", why: "The journey itself becomes part of the discovery." },
  { id: "volcano", category: "EARTH", accent: "The planet is active", title: "Much volcanic activity happens where you cannot watch it.", body: "A large amount of volcanic activity occurs beneath the oceans, where tectonic plates interact and new crust forms.", why: "Earth is constantly changing below the surface." },
  { id: "future-food", category: "FUTURE", accent: "Farms without fields", title: "Food production is moving into places farms never used to exist.", body: "Controlled-environment agriculture can grow plants indoors using carefully managed light, temperature, water and nutrients.", why: "The future of a city may include farms inside buildings." }
];

function randomIndex(previous) {
  let next = Math.floor(Math.random() * DISCOVERIES.length);
  while (DISCOVERIES.length > 1 && next === previous) next = Math.floor(Math.random() * DISCOVERIES.length);
  return next;
}

export function App() {
  const [index, setIndex] = useState(null);
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pulse-saved") || "[]"); }
    catch { return []; }
  });
  const [count, setCount] = useState(0);

  const discovery = index === null ? null : DISCOVERIES[index];
  const isSaved = discovery ? saved.includes(discovery.id) : false;

  useEffect(() => {
    localStorage.setItem("pulse-saved", JSON.stringify(saved));
  }, [saved]);

  const pulse = () => {
    setIndex(randomIndex(index));
    setCount(c => c + 1);
  };

  const toggleSave = () => {
    if (!discovery) return;
    setSaved(current => current.includes(discovery.id)
      ? current.filter(id => id !== discovery.id)
      : [...current, discovery.id]);
  };

  return (
    <main className="app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="brand"><span className="brand-mark">P</span><span>Pulse</span></div>
        <div className="status"><span className="status-dot" /> WORLD DISCOVERY</div>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={14} /> THE UNKNOWN IS CLOSER THAN YOU THINK</div>
        <h1>Discover<br /><em>something unknown.</em></h1>
        <p className="subtitle">One tap. One piece of the world you probably didn't know existed.</p>

        {discovery ? (
          <article className="discovery-card">
            <div className="card-header"><span className="category">{discovery.category}</span><span className="counter">PULSE {String(count).padStart(2, "0")}</span></div>
            <div className="card-content">
              <div className="accent">{discovery.accent}</div>
              <h2>{discovery.title}</h2>
              <p>{discovery.body}</p>
              <div className="why"><strong>WHY IT'S INTERESTING</strong><span>{discovery.why}</span></div>
            </div>
            <div className="card-actions">
              <button className="save-button" onClick={toggleSave}>{isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}{isSaved ? "Saved" : "Save"}</button>
              <button className="next-button" onClick={pulse}>Next Pulse <ChevronRight size={18} /></button>
            </div>
          </article>
        ) : (
          <>
            <button className="pulse-button" onClick={pulse} aria-label="Pulse">
              <span className="pulse-ring ring-one" /><span className="pulse-ring ring-two" /><span className="pulse-core">PULSE</span>
            </button>
            <div className="hint">Tap to call something unexpected into view.</div>
          </>
        )}

        {saved.length > 0 && <div className="collection"><span>COLLECTION</span><strong>{saved.length} saved</strong></div>}
      </section>

      <footer><span>Pulse V0.1</span><span>Discover the world, one pulse at a time.</span></footer>
    </main>
  );
}