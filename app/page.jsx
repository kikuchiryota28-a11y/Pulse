"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronRight, Sparkles, ArrowUpRight } from "lucide-react";

const DISCOVERIES = [
  { id: "aurora", category: "EARTH", location: "NORTHERN SKIES", title: "The sky can move like a curtain.", body: "Auroras appear when charged particles from the Sun interact with Earth's upper atmosphere, creating enormous moving patterns of light.", why: "The night sky becomes a natural light show.", image: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1800&q=85" },
  { id: "airport", category: "AVIATION", location: "OFFSHORE ENGINEERING", title: "A runway can be built beyond the shore.", body: "Some airports use reclaimed land and offshore engineering to push infrastructure far beyond a natural coastline.", why: "It looks futuristic, but it is real engineering.", image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=85" },
  { id: "forest", category: "ARCHITECTURE", location: "VERTICAL ECOSYSTEMS", title: "A tower can become a forest.", body: "Some modern buildings integrate trees and plants into balconies and terraces, turning architecture into a vertical ecosystem.", why: "A building can become part of the landscape.", image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1800&q=85" },
  { id: "space", category: "SPACE", location: "BEYOND VISIBLE LIGHT", title: "Most of the universe is invisible to your eyes.", body: "Astronomers use infrared, radio, ultraviolet and X-ray wavelengths to observe information hidden outside visible light.", why: "What we see is only a tiny slice of the universe.", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1800&q=85" },
  { id: "desert", category: "NATURE", location: "AFTER THE RAIN", title: "A desert can suddenly become a sea of flowers.", body: "After unusual rainfall, dormant seeds can germinate across arid landscapes and produce short-lived blooms.", why: "Some ecosystems are built around waiting.", image: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1800&q=85" },
  { id: "night-train", category: "WORLD", location: "OVERNIGHT JOURNEYS", title: "You can fall asleep in one city and wake up in another.", body: "Overnight rail routes turn travel time into part of the experience: leave one city at night and wake up somewhere else.", why: "The journey itself becomes the discovery.", image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1800&q=85" },
  { id: "volcano", category: "EARTH", location: "BENEATH THE OCEAN", title: "Earth is constantly changing where you cannot see it.", body: "A huge amount of volcanic activity occurs beneath the oceans, where tectonic plates interact and new crust forms.", why: "The planet is active even when everything looks still.", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85" },
  { id: "future-food", category: "FUTURE", location: "CONTROLLED ENVIRONMENTS", title: "Farms are moving into places farms never used to exist.", body: "Controlled-environment agriculture can grow plants indoors using carefully managed light, temperature, water and nutrients.", why: "A future city could grow food inside its own buildings.", image: "https://images.unsplash.com/photo-1515150144380-bca9f1650ed9?auto=format&fit=crop&w=1800&q=85" }
];

function randomIndex(previous) {
  let next = Math.floor(Math.random() * DISCOVERIES.length);
  while (DISCOVERIES.length > 1 && next === previous) next = Math.floor(Math.random() * DISCOVERIES.length);
  return next;
}

export default function Page() {
  const [index, setIndex] = useState(null);
  const [saved, setSaved] = useState([]);
  const [count, setCount] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("pulse-saved") || "[]")); } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("pulse-saved", JSON.stringify(saved));
  }, [saved]);

  const discovery = index === null ? null : DISCOVERIES[index];
  const isSaved = discovery ? saved.includes(discovery.id) : false;

  const pulse = () => {
    setTransitioning(true);
    window.setTimeout(() => {
      setIndex(randomIndex(index));
      setCount(c => c + 1);
      window.setTimeout(() => setTransitioning(false), 60);
    }, index === null ? 0 : 260);
  };

  const toggleSave = () => {
    if (!discovery) return;
    setSaved(current => current.includes(discovery.id)
      ? current.filter(id => id !== discovery.id)
      : [...current, discovery.id]);
  };

  return (
    <main className={`app ${transitioning ? "is-pulsing" : ""}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <div className="brand"><span className="brand-mark">P</span><span>Pulse</span></div>
        <div className="status"><span className="status-dot" /> WORLD DISCOVERY</div>
      </header>

      <section className="hero">
        {!discovery ? (
          <div className="landing">
            <div className="eyebrow"><Sparkles size={14} /> THE UNKNOWN IS CLOSER THAN YOU THINK</div>
            <h1>Discover<br /><em>something unknown.</em></h1>
            <p className="subtitle">One tap. One piece of the world you probably didn't know existed.</p>
            <button className="pulse-button" onClick={pulse} aria-label="Pulse">
              <span className="pulse-orbit orbit-one" /><span className="pulse-orbit orbit-two" />
              <span className="pulse-ring ring-one" /><span className="pulse-ring ring-two" />
              <span className="pulse-core">PULSE</span>
            </button>
            <div className="hint">Tap to call something unexpected into view.</div>
          </div>
        ) : (
          <article className="discovery" key={discovery.id}>
            <div className="discovery-image" style={{ backgroundImage: `url(${discovery.image})` }}>
              <div className="image-shade" />
              <div className="image-top"><span>{discovery.category}</span><span>PULSE {String(count).padStart(2, "0")}</span></div>
              <div className="image-copy">
                <div className="location">{discovery.location}</div>
                <h2>{discovery.title}</h2>
              </div>
            </div>

            <div className="discovery-body">
              <div className="body-copy"><p>{discovery.body}</p><div className="why"><strong>WHY IT'S INTERESTING</strong><span>{discovery.why}</span></div></div>
              <div className="discovery-actions">
                <button className="save-button" onClick={toggleSave}>{isSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}{isSaved ? "Saved" : "Save"}</button>
                <button className="next-button" onClick={pulse}>Next Pulse <ChevronRight size={18} /></button>
              </div>
            </div>
          </article>
        )}
        {saved.length > 0 && <div className="collection"><span>YOUR COLLECTION</span><strong>{saved.length} discoveries saved <ArrowUpRight size={13} /></strong></div>}
      </section>
      <footer><span>Pulse V0.2</span><span>Discover the world, one pulse at a time.</span></footer>
    </main>
  );
}
