import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Globe from "globe.gl";
import * as THREE from "three";
import {
  ArrowRight,
  AlertTriangle,
  Eye,
  Bell,
  Users,
  Shield,
  BarChart3,
  Globe2,
  Zap,
  TrendingUp,
  Calendar,
  Newspaper,
  Sparkles,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { EVENTS, IC, IB } from "../data.js";

/* ────────────────────────────────────────────────────────────
   GLOBE SHADER — custom day/night with vivid city lights
   ──────────────────────────────────────────────────────────── */
const FRAG = `uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D specMap; uniform vec3 sunDirection; uniform float nightBoost; varying vec2 vUv; varying vec3 vObjectNormal; void main(){ vec3 N=normalize(vObjectNormal); vec3 L=normalize(sunDirection); float cosAngle=dot(N,L); float dayMix=smoothstep(-0.15,0.30,cosAngle); vec3 day=texture2D(dayMap,vUv).rgb; float waterMask=texture2D(specMap,vUv).r; vec3 litDay=day*(0.38+0.85*max(cosAngle,0.0)); float spec=pow(max(cosAngle,0.0),32.0)*waterMask*0.55; litDay+=vec3(spec*1.1,spec*1.05,spec*0.95); vec3 nightTex=texture2D(nightMap,vUv).rgb; vec3 night=nightTex*nightBoost*vec3(1.5,1.15,0.75)+vec3(0.006,0.010,0.020); float cityGlow=nightTex.r*nightTex.r*nightBoost*0.6; night+=vec3(cityGlow*1.0,cityGlow*0.65,cityGlow*0.3); vec3 color=mix(night,litDay,dayMix); float rim=pow(1.0-abs(cosAngle),4.0)*smoothstep(-0.25,0.05,cosAngle); color+=vec3(0.0,0.45,0.55)*rim*0.30; gl_FragColor=vec4(color,1.0); }`;

/* ────────────────────────────────────────────────────────────
   GLOBE CAMERA STATES
   ──────────────────────────────────────────────────────────── */
const GLOBE_STATES = [
  { tx: 28, scale: 1.0, opacity: 1.0, lat: 20, lng: -40, altitude: 2.5, arcs: "all" },
  { tx: 28, scale: 1.1, opacity: 1.0, lat: 30, lng: -30, altitude: 1.8, arcs: "eu_na" },
  { tx: 20, scale: 1.2, opacity: 0.7, lat: 15, lng: -20, altitude: 2.2, arcs: "all" },
  { tx: 15, scale: 1.3, opacity: 0.6, lat: 20, lng: -40, altitude: 2.4, arcs: "all" },
  { tx: 15, scale: 1.2, opacity: 0.5, lat: 20, lng: -40, altitude: 2.6, arcs: "none" },
  { tx: 20, scale: 1.15, opacity: 0.6, lat: 25, lng: -30, altitude: 2.4, arcs: "all" },
  { tx: 20, scale: 1.25, opacity: 0.5, lat: 20, lng: -40, altitude: 2.5, arcs: "eu_na" },
  { tx: 20, scale: 1.2, opacity: 0.5, lat: 25, lng: -30, altitude: 2.4, arcs: "all" },
  { tx: 20, scale: 1.25, opacity: 0.5, lat: 20, lng: -40, altitude: 2.5, arcs: "eu_na" },
  { tx: 20, scale: 1.3, opacity: 0.4, lat: 20, lng: -40, altitude: 2.5, arcs: "none" },
  { tx: 15, scale: 1.5, opacity: 0.0, lat: 20, lng: -40, altitude: 3.2, arcs: "none" },
];

/* ────────────────────────────────────────────────────────────
   ARC BUILDER
   ──────────────────────────────────────────────────────────── */
function buildArcs(mode) {
  const entries = Object.entries(EVENTS);
  const arcs = [];
  if (mode === "all") {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[i][1].impact !== "low" || entries[j][1].impact !== "low") {
          arcs.push({
            startLat: entries[i][1].lat, startLng: entries[i][1].lon,
            endLat: entries[j][1].lat, endLng: entries[j][1].lon,
            color: ["rgba(0,201,167,0)", "rgba(0,201,167,0.5)", "rgba(0,201,167,0)"],
            stroke: 0.4,
            dashAnimateTime: 1500 + Math.random() * 2500,
          });
        }
      }
    }
  } else if (mode === "eu_na") {
    const euNa = entries.filter(([, e]) => {
      const na = e.lat > 15 && e.lat < 70 && e.lng > -170 && e.lng < -50;
      const eu = e.lat > 35 && e.lat < 70 && e.lng > -10 && e.lng < 40;
      return na || eu;
    });
    for (let i = 0; i < euNa.length; i++) {
      for (let j = i + 1; j < euNa.length; j++) {
        arcs.push({
          startLat: euNa[i][1].lat, startLng: euNa[i][1].lon,
          endLat: euNa[j][1].lat, endLng: euNa[j][1].lon,
          color: ["rgba(0,201,167,0)", "rgba(0,201,167,0.5)", "rgba(0,201,167,0)"],
          stroke: 0.4,
          dashAnimateTime: 1500 + Math.random() * 2500,
        });
      }
    }
  }
  return arcs;
}

/* ────────────────────────────────────────────────────────────
   GLOBE COMPONENT
   ──────────────────────────────────────────────────────────── */
function Globe3D({ onMarkerClick, popupMarker, onPopupClose, onEnter }) {
  const outerRef = useRef(null);
  const globeRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const node = outerRef.current;
    if (!node) return;
    let disposed = false;

    const TEX = {
      day: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      night: "https://unpkg.com/three-globe/example/img/earth-night.jpg",
      spec: "https://unpkg.com/three-globe/example/img/earth-water.png",
    };

    const loader = new THREE.TextureLoader();
    let dayTex, nightTex, specTex;
    let loadedCount = 0;
    const onTex = () => {
      loadedCount++;
      if (loadedCount === 3 && !disposed) setLoaded(true);
    };
    dayTex = loader.load(TEX.day, onTex);
    nightTex = loader.load(TEX.night, onTex);
    specTex = loader.load(TEX.spec, onTex);

    const sunDirection = new THREE.Vector3(-0.5, 0.5, 1).normalize();

    const g = Globe()(node)
      .globeMaterial(new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayTex },
          nightMap: { value: nightTex },
          specMap: { value: specTex },
          sunDirection: { value: sunDirection },
          nightBoost: { value: 3.5 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vObjectNormal;
          void main() {
            vUv = uv;
            vObjectNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: FRAG,
      }))
      .showGlobe(true)
      .showAtmosphere(true)
      .atmosphereColor("#00C9A7")
      .atmosphereAltitude(0.15)
      .htmlElementsData(Object.entries(EVENTS).map(([code, e]) => ({ code, ...e })))
      .htmlLat("lat")
      .htmlLng("lon")
      .htmlAltitude(0.01)
      .htmlElement((d) => {
        const el = document.createElement("div");
        el.className = `mx-land-marker mx-land-marker-${d.impact}`;
        el.innerHTML = `<div class="mx-land-marker-pulse mx-land-marker-pulse--1"></div><div class="mx-land-marker-pulse mx-land-marker-pulse--2"></div><div class="mx-land-marker-pulse mx-land-marker-pulse--3"></div><div class="mx-land-marker-dot"></div>`;
        el.style.cursor = "pointer";
        el.addEventListener("click", () => onMarkerClick(d));
        return el;
      })
      .arcsData([])
      .arcColor("color")
      .arcAltitude(0.3)
      .arcStroke(0.4)
      .arcDashLength(0.4)
      .arcDashGap(0.6)
      .arcDashAnimateTime(2000)
      .width(node.clientWidth)
      .height(node.clientHeight);

    globeRef.current = g;
    g.pointOfView({ lat: 20, lng: -40, altitude: 2.5 }, 0);

    const onResize = () => {
      if (globeRef.current && node) globeRef.current.width(node.clientWidth).height(node.clientHeight);
    };
    window.addEventListener("resize", onResize);

    node._cleanup = () => {
      window.removeEventListener("resize", onResize);
      disposed = true;
    };

    return () => { if (node && node._cleanup) node._cleanup(); };
  }, [onMarkerClick]);

  /* Scroll-driven camera + arc updates */
  useEffect(() => {
    const node = outerRef.current;
    if (!node) return;
    let raf;

    const update = () => {
      const g = globeRef.current;
      if (!g) return;
      const rect = node.getBoundingClientRect();
      const winH = window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / (winH * 2.5)));
      const idx = Math.min(GLOBE_STATES.length - 1, Math.floor(progress * GLOBE_STATES.length));
      const s = GLOBE_STATES[idx];

      node.style.transform = `translateX(${s.tx}%) scale(${s.scale})`;
      node.style.opacity = String(s.opacity);

      const { lat, lng, altitude } = s;
      g.pointOfView({ lat, lng, altitude }, 0);

      if (s.arcs !== node._lastArcMode) {
        node._lastArcMode = s.arcs;
        if (s.arcs === "none") {
          g.arcsData([]);
        } else {
          const arcs = buildArcs(s.arcs);
          g.arcsData(arcs);
          g.arcDashAnimateTime((d) => d.dashAnimateTime || 2000);
          g.arcStroke((d) => d.stroke || 0.4);
        }
      }
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="mx-land-globe-outer" ref={outerRef}>
      <div className="mx-land-globe-inner" style={{ opacity: loaded ? 1 : 0 }}>
        <div className="mx-land-globe-vignette" />
      </div>
      {!loaded && <div className="mx-land-globe-skeleton" />}
      <AnimatePresence>
        {popupMarker && (
          <GlobePopup marker={popupMarker} onClose={onPopupClose} onEnter={onEnter} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   GLOBE POPUP
   ──────────────────────────────────────────────────────────── */
function GlobePopup({ marker, onClose, onEnter }) {
  return (
    <motion.div
      className="mx-land-globe-popup"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mx-land-popup-header">
        <span className="mx-land-popup-flag">{marker.flag}</span>
        <span className="mx-land-popup-name">{marker.name}</span>
        <span className={`mx-land-popup-impact mx-land-popup-impact--${marker.impact}`}>
          {marker.impact}
        </span>
        <button className="mx-land-popup-close" onClick={onClose}>×</button>
      </div>
      <div className="mx-land-popup-events">
        {marker.items.map((item, i) => (
          <div key={i} className="mx-land-popup-event">
            <span className="mx-land-popup-time">{item.time}</span>
            <span className="mx-land-popup-event-name">{item.name}</span>
            <span className={`mx-land-popup-event-impact mx-land-popup-event-impact--${item.impact}`}>
              {item.impact}
            </span>
          </div>
        ))}
      </div>
      <div className="mx-land-popup-affects">
        <span>Affects:</span>
        {marker.affects.map((s) => (
          <span key={s} className="mx-land-popup-affect-pill">{s}</span>
        ))}
      </div>
      <button className="mx-land-btn mx-land-btn--primary mx-land-btn--sm" onClick={onEnter}>
        View in Meridex <ArrowRight size={13} />
      </button>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────
   NAVBAR
   ──────────────────────────────────────────────────────────── */
function Navbar() {
  return (
    <nav className="mx-land-nav">
      <div className="mx-land-nav-brand">
        <div className="mx-land-nav-mark">
          <Globe2 size={18} />
        </div>
        <span className="mx-land-nav-text">Meri<span>dex</span></span>
      </div>
      <div className="mx-land-nav-links">
        <a href="#features" className="mx-land-nav-link--active">Features</a>
        <a href="#calendar">Calendar</a>
        <a href="#markets">Markets</a>
        <a href="#intelligence">Intelligence</a>
        <a href="#pricing">Pricing</a>
      </div>
      <div className="mx-land-nav-actions">
        <button className="mx-land-btn mx-land-btn--ghost mx-land-btn--sm mx-land-nav-login">Login</button>
        <button className="mx-land-btn mx-land-btn--primary mx-land-btn--sm">Get Started</button>
      </div>
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────
   COUNTDOWN HOOK
   ──────────────────────────────────────────────────────────── */
function useCountdown(targetHours) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = Date.now() + targetHours * 3600000;
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetHours]);
  return time;
}

/* ────────────────────────────────────────────────────────────
   COUNTDOWN BANNER
   ──────────────────────────────────────────────────────────── */
function CountdownBanner() {
  const t = useCountdown(3.23);
  const blocks = [
    { label: "Days", value: String(t.d).padStart(2, "0") },
    { label: "Hours", value: String(t.h).padStart(2, "0") },
    { label: "Minutes", value: String(t.m).padStart(2, "0") },
    { label: "Seconds", value: String(t.s).padStart(2, "0") },
  ];
  return (
    <div className="mx-land-countdown-banner">
      <div className="mx-land-countdown-left">
        <AlertTriangle size={14} className="mx-land-countdown-icon" />
        <span>Next high impact event: <strong>US CPI m/m</strong> in</span>
        <div className="mx-land-countdown-blocks">
          {blocks.map((b) => (
            <div key={b.label} className="mx-land-countdown-block">
              <span className="mx-land-countdown-num">{b.value}</span>
              <span className="mx-land-countdown-label">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-land-countdown-pill">Today: 5 High Impact Events</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   ACTIVITY FEED
   ──────────────────────────────────────────────────────────── */
function ActivityFeed() {
  const messages = [
    { icon: Eye, text: "A trader in London just checked US CPI briefing" },
    { icon: Bell, text: "New: Pre-event NQ briefing for US CPI published" },
    { icon: Users, text: "847 traders are viewing the dashboard right now" },
    { icon: Bell, text: "New high impact alert: Fed Chair Powell in 2h 14m" },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 3500);
    return () => clearInterval(id);
  }, [messages.length]);
  const Icon = messages[idx].icon;
  return (
    <div className="mx-land-activity-feed">
      <div className="mx-land-activity-header">
        <span className="mx-land-activity-dot" />
        Live Activity
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          className="mx-land-activity-item"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Icon size={13} className="mx-land-activity-icon" />
          {messages[idx].text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   SCROLL CUE
   ──────────────────────────────────────────────────────────── */
function ScrollCue() {
  return (
    <div className="mx-land-scroll-cue">
      <span>Scroll</span>
      <div className="mx-land-scroll-cue-track">
        <motion.div
          className="mx-land-scroll-cue-dot"
          animate={{ y: [0, 18, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   FLOATING STAT PILLS
   ──────────────────────────────────────────────────────────── */
function FloatingStatPills() {
  const pills = [
    { icon: Globe2, num: "195+", label: "Countries", delay: 0 },
    { icon: Zap, num: "14", label: "Events Today", delay: 1.3 },
    { icon: BarChart3, num: "847", label: "Active Now", delay: 2.6 },
  ];
  return (
    <div className="mx-land-stat-pills">
      {pills.map((p, i) => {
        const Icon = p.icon;
        return (
          <div key={i} className="mx-land-stat-pill" style={{ animationDelay: `${p.delay}s` }}>
            <Icon size={16} className="mx-land-stat-pill-icon" />
            <div className="mx-land-stat-pill-text">
              <span className="mx-land-stat-pill-num">{p.num}</span>
              <span className="mx-land-stat-pill-label">{p.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   HERO SECTION
   ──────────────────────────────────────────────────────────── */
function HeroSection({ onEnter, onMarkerClick, popupMarker, onPopupClose }) {
  return (
    <section className="mx-land-section mx-land-hero" data-section="0">
      <div className="mx-land-dot-grid" />
      <FloatingStatPills />
      <div className="mx-land-hero-content">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-land-eyebrow">
            <span className="mx-land-eyebrow-dot" />
            Global Economic Intelligence
          </div>
          <h1 className="mx-land-headline">
            Markets move fast.
            <br />
            <span className="mx-land-headline-accent">We move faster.</span>
          </h1>
          <p className="mx-land-subtitle">
            The only platform built specifically for NQ and ES futures traders.
            Economic events, central bank intelligence, and pre-event price briefings —
            all in one command centre.
          </p>
          <p className="mx-land-hint">Try it — click any marker on the globe.</p>
          <div className="mx-land-btns">
            <button className="mx-land-btn mx-land-btn--primary mx-land-btn--arrow mx-land-btn--hero" onClick={onEnter}>
              Enter Meridex <ArrowRight size={15} className="mx-land-btn-arrow-icon" />
            </button>
            <button className="mx-land-btn mx-land-btn--ghost mx-land-btn--ghost-teal">
              See how it works
            </button>
          </div>
          <div className="mx-land-trust-row">
            <div className="mx-land-trust-item">
              <span className="mx-land-trust-dot" />
              Live data
            </div>
            <span className="mx-land-trust-sep" />
            <div className="mx-land-trust-item">
              <Shield size={14} />
              Used by 10K+ traders
            </div>
            <span className="mx-land-trust-sep" />
            <div className="mx-land-trust-item">
              <BarChart3 size={14} />
              195 countries tracked
            </div>
          </div>
        </motion.div>
      </div>
      <ActivityFeed />
      <ScrollCue />
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   FEATURES SECTION
   ──────────────────────────────────────────────────────────── */
function FeaturesSection() {
  const features = [
    { icon: Calendar, title: "Economic Calendar", desc: "Every high-impact event across 195 countries, filtered for NQ and ES relevance." },
    { icon: Newspaper, title: "Pre-Event Briefings", desc: "AI-generated price action briefings published before each major event." },
    { icon: TrendingUp, title: "Live Market Impact", desc: "Real-time correlation between events and NQ, ES, gold, and FX movements." },
    { icon: Sparkles, title: "Central Bank Watch", desc: "Track every central bank stance, speech, and rate decision in one place." },
  ];
  return (
    <section className="mx-land-section mx-land-features" id="features">
      <div className="mx-land-section-inner">
        <div className="mx-land-section-label">Features</div>
        <h2 className="mx-land-section-title">Everything you need to trade the news</h2>
        <div className="mx-land-features-grid">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                className="mx-land-feature-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="mx-land-feature-icon"><Icon size={24} /></div>
                <h3 className="mx-land-feature-title">{f.title}</h3>
                <p className="mx-land-feature-desc">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   CALENDAR PREVIEW SECTION
   ──────────────────────────────────────────────────────────── */
function CalendarSection() {
  const rows = Object.entries(EVENTS).flatMap(([code, e]) =>
    e.items.map((item) => ({ ...item, country: e.name, flag: e.flag, code }))
  ).slice(0, 8);
  return (
    <section className="mx-land-section mx-land-calendar" id="calendar">
      <div className="mx-land-section-inner">
        <div className="mx-land-section-label">Calendar</div>
        <h2 className="mx-land-section-title">Today's high-impact events</h2>
        <div className="mx-land-cal-table">
          <div className="mx-land-cal-header">
            <span>Time</span><span>Event</span><span>Country</span><span>Impact</span><span>Forecast</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="mx-land-cal-row">
              <span className="mx-land-cal-time">{r.time}</span>
              <span className="mx-land-cal-name">{r.name}</span>
              <span className="mx-land-cal-country">{r.flag} {r.country}</span>
              <span className={`mx-land-cal-impact mx-land-cal-impact--${r.impact}`}>{r.impact}</span>
              <span className="mx-land-cal-forecast">{r.forecast || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   CTA / FOOTER
   ──────────────────────────────────────────────────────────── */
function CTASection({ onEnter }) {
  return (
    <section className="mx-land-section mx-land-cta" id="pricing">
      <div className="mx-land-section-inner">
        <h2 className="mx-land-section-title">Start trading smarter today</h2>
        <p className="mx-land-section-sub">Join 10,000+ futures traders using Meridex to stay ahead of the market.</p>
        <button className="mx-land-btn mx-land-btn--primary mx-land-btn--arrow mx-land-btn--hero" onClick={onEnter}>
          Enter Meridex <ArrowRight size={15} className="mx-land-btn-arrow-icon" />
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-land-footer">
      <div className="mx-land-footer-inner">
        <div className="mx-land-footer-brand">
          <Globe2 size={18} />
          <span>Meridex</span>
        </div>
        <div className="mx-land-footer-links">
          <a href="#features">Features</a>
          <a href="#calendar">Calendar</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="mx-land-footer-copy">© 2025 Meridex. All rights reserved.</div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────────────────── */
export default function HomePage({ onEnter }) {
  const [popupMarker, setPopupMarker] = useState(null);
  const handleMarkerClick = useCallback((d) => setPopupMarker(d), []);
  const handlePopupClose = useCallback(() => setPopupMarker(null), []);

  return (
    <div className="mx-land-page">
      <Navbar />
      <CountdownBanner />
      <div className="mx-land-globe-wrapper">
        <Globe3D
          onMarkerClick={handleMarkerClick}
          popupMarker={popupMarker}
          onPopupClose={handlePopupClose}
          onEnter={onEnter}
        />
      </div>
      <HeroSection
        onEnter={onEnter}
        onMarkerClick={handleMarkerClick}
        popupMarker={popupMarker}
        onPopupClose={handlePopupClose}
      />
      <FeaturesSection />
      <CalendarSection />
      <CTASection onEnter={onEnter} />
      <Footer />
    </div>
  );
}
