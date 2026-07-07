import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Landmark, ArrowRight, Activity, Clock, TrendingUp, Shield, ChartBar as BarChart3, Globe as Globe2, ChevronRight, ChevronUp, Star, ArrowUpRight, Calendar, Bell, Eye, Users, TriangleAlert as AlertTriangle, Send, MessageCircle, GitBranch } from "lucide-react";
import { EVENTS, IC, allEvents } from "../data";
import { AnimatedCounter } from "../components/AnimatedCounter";

/* ── Globe utils ── */
function getSunCoords() {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const dayOfYear = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000);
  const declination = 23.44 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
  return { lat: declination, lng: -(hours - 12) * 15 };
}

function latLngToWorldVec(lat, lng) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
}

const TEX = {
  day: "https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/2_no_clouds_4k.jpg",
  night: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png",
  clouds: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png",
  spec: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
};

const VERT = `varying vec2 vUv; varying vec3 vObjectNormal; void main(){ vUv=uv; vObjectNormal=normalize(normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const FRAG = `uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D specMap; uniform vec3 sunDirection; uniform float nightBoost; varying vec2 vUv; varying vec3 vObjectNormal; void main(){ vec3 N=normalize(vObjectNormal); vec3 L=normalize(sunDirection); float cosAngle=dot(N,L); float dayMix=smoothstep(-0.10,0.25,cosAngle); vec3 day=texture2D(dayMap,vUv).rgb; float waterMask=texture2D(specMap,vUv).r; vec3 litDay=day*(0.38+0.85*max(cosAngle,0.0)); float spec=pow(max(cosAngle,0.0),32.0)*waterMask*0.55; litDay+=vec3(spec*1.1,spec*1.05,spec*0.95); vec3 night=texture2D(nightMap,vUv).rgb*nightBoost*vec3(1.22,1.02,0.74)+vec3(0.012,0.018,0.030); vec3 color=mix(night,litDay,dayMix); float rim=pow(1.0-abs(cosAngle),4.0)*smoothstep(-0.25,0.05,cosAngle); color+=vec3(0.0,0.45,0.55)*rim*0.30; gl_FragColor=vec4(color,1.0); }`;

function loadTexture(THREE, url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (tex) => {
      if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      resolve(tex);
    }, undefined, reject);
  });
}

const SECTION_COUNT = 11;

/* ── Globe transform states per section ── */
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

function buildArcs(mode) {
  const entries = Object.entries(EVENTS);
  const arcs = [];
  if (mode === "all") {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[i][1].impact !== "low" || entries[j][1].impact !== "low") {
          const opacity = 0.2 + Math.random() * 0.4;
          arcs.push({
            startLat: entries[i][1].lat, startLng: entries[i][1].lon,
            endLat: entries[j][1].lat, endLng: entries[j][1].lon,
            color: [`rgba(0,201,167,0)`, `rgba(0,201,167,${opacity})`, `rgba(0,201,167,0)`],
            stroke: 0.3,
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
        const opacity = 0.2 + Math.random() * 0.4;
        arcs.push({
          startLat: euNa[i][1].lat, startLng: euNa[i][1].lon,
          endLat: euNa[j][1].lat, endLng: euNa[j][1].lon,
          color: [`rgba(0,201,167,0)`, `rgba(0,201,167,${opacity})`, `rgba(0,201,167,0)`],
          stroke: 0.3,
          dashAnimateTime: 1500 + Math.random() * 2500,
        });
      }
    }
  }
  return arcs;
}

/* ── Persistent Globe ── */
function PersistentGlobe({ scrollContainerRef, mouseRef, onMarkerClick }) {
  const outerRef = useRef(null);
  const wrapRef = useRef(null);
  const globeRef = useRef(null);
  const cloudRef = useRef(null);
  const starsRef = useRef(null);
  const callbackRef = useRef(onMarkerClick);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { callbackRef.current = onMarkerClick; }, [onMarkerClick]);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
    let disposed = false;

    const init = async () => {
      const [Globe, THREE] = await Promise.all([
        import("globe.gl").then((m) => m.default),
        import("three"),
      ]);
      if (disposed) return;

      const [dayTex, nightTex, specTex, cloudsTex] = await Promise.all([
        loadTexture(THREE, TEX.day), loadTexture(THREE, TEX.night),
        loadTexture(THREE, TEX.spec), loadTexture(THREE, TEX.clouds),
      ]);
      if (disposed) return;

      const sun = latLngToWorldVec(...Object.values(getSunCoords()));
      const material = new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayTex }, nightMap: { value: nightTex },
          specMap: { value: specTex }, sunDirection: { value: new THREE.Vector3(sun[0], sun[1], sun[2]) },
          nightBoost: { value: 2.6 },
        },
        vertexShader: VERT, fragmentShader: FRAG,
      });

      const markers = Object.entries(EVENTS).map(([code, ev]) => ({
        lat: ev.lat, lng: ev.lon, impact: ev.impact, name: ev.name, code, flag: ev.flag,
      }));
      const rings = markers.map((m) => ({
        lat: m.lat, lng: m.lng, color: IC[m.impact],
        maxR: m.impact === "high" ? 4.5 : m.impact === "medium" ? 3 : 2,
        propSpeed: m.impact === "high" ? 2.5 : 1.8,
        repeatPeriod: m.impact === "high" ? 1400 : 2200,
      }));

      const g = Globe()(node)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor("#00C9A7")
        .atmosphereAltitude(0.12)
        .globeMaterial(material)
        .htmlElementsData(markers)
        .htmlElement((d) => {
          const el = document.createElement("div");
          el.className = `mx-land-marker mx-land-marker-${d.impact}`;
          el.innerHTML = `<div class="mx-land-marker-pulse"></div><div class="mx-land-marker-dot"></div>`;
          el.style.pointerEvents = "auto";
          el.style.cursor = "pointer";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (callbackRef.current) callbackRef.current(d);
          });
          return el;
        })
        .htmlAltitude(0.01)
        .ringsData(rings)
        .ringColor((d) => (t) => `${d.color}${Math.floor((1 - t) * 80).toString(16).padStart(2, "0")}`)
        .ringMaxRadius("maxR").ringPropagationSpeed("propSpeed").ringRepeatPeriod("repeatPeriod")
        .arcsData([])
        .arcColor("color").arcAltitude(0.3)
        .arcStroke(0.3).arcDashLength(0.4).arcDashGap(0.6)
        .arcDashAnimateTime(2000)
        .width(node.clientWidth).height(node.clientHeight);

      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.35;
      g.controls().enableZoom = false;
      g.controls().enablePan = false;
      g.pointOfView({ lat: 20, lng: -40, altitude: 2.5 }, 0);
      globeRef.current = g;

      const scene = g.scene();
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(101.5, 96, 96),
        new THREE.MeshPhongMaterial({ map: cloudsTex, transparent: true, opacity: 0.0, depthWrite: false }),
      );
      scene.add(clouds);
      cloudRef.current = clouds;

      const starGeo = new THREE.BufferGeometry();
      const pos = new Float32Array(3000 * 3);
      for (let i = 0; i < 3000; i++) {
        const r = 800 + Math.random() * 400;
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(p) * Math.cos(t);
        pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
        pos[i * 3 + 2] = r * Math.cos(p);
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.0, transparent: true, opacity: 0.4, sizeAttenuation: true }));
      scene.add(stars);
      starsRef.current = stars;

      const onResize = () => { if (globeRef.current && node) globeRef.current.width(node.clientWidth).height(node.clientHeight); };
      window.addEventListener("resize", onResize);
      setLoaded(true);
      node._cleanup = () => window.removeEventListener("resize", onResize);
    };
    init();
    return () => { disposed = true; if (node && node._cleanup) node._cleanup(); };
  }, []);

  // rAF loop
  useEffect(() => {
    let raf;
    let lastArcMode = "";
    const update = () => {
      const container = scrollContainerRef.current;
      const outer = outerRef.current;
      const g = globeRef.current;

      if (container && outer) {
        const rect = container.getBoundingClientRect();
        const scrollable = container.scrollHeight - window.innerHeight;
        const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
        const sectionF = progress * (SECTION_COUNT - 1);
        const idx0 = Math.floor(sectionF);
        const idx1 = Math.min(idx0 + 1, SECTION_COUNT - 1);
        const frac = sectionF - idx0;
        const s0 = GLOBE_STATES[idx0];
        const s1 = GLOBE_STATES[idx1];
        const lerp = (a, b, t) => a + (b - a) * t;

        const tx = lerp(s0.tx, s1.tx, frac);
        const scale = lerp(s0.scale, s1.scale, frac);
        const opacity = lerp(s0.opacity, s1.opacity, frac);

        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        outer.style.transform = `translateX(${tx}vw) scale(${scale})`;
        outer.style.opacity = opacity;

        if (g && loaded) {
          const lat = lerp(s0.lat, s1.lat, frac) - my * 3;
          const lng = lerp(s0.lng, s1.lng, frac) - mx * 5;
          const alt = lerp(s0.altitude, s1.altitude, frac);
          g.pointOfView({ lat, lng, altitude: alt }, 0);
          g.controls().autoRotateSpeed = 0.35 + progress * 0.3;

          if (cloudRef.current) {
            cloudRef.current.material.opacity = Math.min(0.25, Math.max(0, (progress - 0.1) * 1.5));
            cloudRef.current.rotation.y += 0.0003;
          }
          if (starsRef.current) {
            starsRef.current.material.opacity = Math.max(0, 0.4 - progress * 0.8);
          }

          const sectionIdx = Math.round(sectionF);
          const arcMode = GLOBE_STATES[sectionIdx].arcs;
          if (arcMode !== lastArcMode) {
            lastArcMode = arcMode;
            if (arcMode === "none") {
              g.arcsData([]);
            } else {
              const arcs = buildArcs(arcMode);
              g.arcsData(arcs);
              g.arcDashAnimateTime((d) => d.dashAnimateTime || 2000);
              g.arcStroke((d) => d.stroke || 0.3);
            }
          }
        }
      }
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [loaded, scrollContainerRef, mouseRef]);

  return (
    <div className="mx-land-globe-outer" ref={outerRef}>
      {!loaded && <div className="mx-land-globe-skeleton" />}
      <div className={`mx-land-globe-inner ${loaded ? "mx-land-globe-inner--loaded" : ""}`} ref={wrapRef} />
      <div className="mx-land-globe-vignette" />
    </div>
  );
}

/* ── useInView hook ── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold });
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView];
}

/* ── Scroll progress bar ── */
function ScrollProgress({ scrollContainerRef }) {
  const barRef = useRef(null);
  useEffect(() => {
    let raf;
    const update = () => {
      const container = scrollContainerRef.current;
      if (container && barRef.current) {
        const scrollable = container.scrollHeight - container.clientHeight;
        const progress = Math.max(0, Math.min(1, container.scrollTop / scrollable));
        barRef.current.style.transform = `scaleX(${progress})`;
      }
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [scrollContainerRef]);
  return <div className="mx-land-scroll-progress" ref={barRef} />;
}

/* ── Countdown hook ── */
function useCountdown(targetHours) {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = Date.now() + targetHours * 3600000;
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTime({
        h: Math.floor(diff / 3600000),
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

/* ── Navbar ── */
function Navbar() {
  return (
    <nav className="mx-land-nav">
      <div className="mx-land-nav-brand">
        <div className="mx-land-nav-mark">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <ellipse cx="8" cy="8" rx="2.8" ry="6.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1.5 8h13" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </div>
        <span className="mx-land-nav-text">Meri<span>dex</span></span>
      </div>
      <div className="mx-land-nav-links">
        <a href="#features">Features</a>
        <a href="#calendar">Calendar</a>
        <a href="#markets">Markets</a>
        <a href="#intelligence">Intelligence</a>
        <a href="#pricing">Pricing</a>
      </div>
      <div className="mx-land-nav-actions">
        <button className="mx-land-btn mx-land-btn--ghost mx-land-btn--sm">Login</button>
        <button className="mx-land-btn mx-land-btn--primary mx-land-btn--sm mx-land-btn--gradient-border">Get Started</button>
      </div>
    </nav>
  );
}

/* ── Ticker ── */
function Ticker() {
  const items = allEvents;
  return (
    <div className="mx-land-ticker-bar">
      <div className="mx-land-ticker-label">LIVE</div>
      <div className="mx-land-ticker-wrap">
        <div className="mx-land-ticker-fade-l" />
        <div className="mx-land-ticker-fade-r" />
        <div className="mx-land-ticker-track">
          {items.concat(items).map((ev, i) => (
            <div key={i} className="mx-land-ticker-item">
              <span className="mx-land-ticker-flag">{ev.flag}</span>
              <span className="mx-land-ticker-name">{ev.name}</span>
              <span className="mx-land-ticker-time">{ev.time}</span>
              <span className="mx-land-ticker-impact" style={{ background: IC[ev.impact], boxShadow: `0 0 5px ${IC[ev.impact]}` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Countdown Banner ── */
function CountdownBanner() {
  const t = useCountdown(3.23);
  return (
    <div className="mx-land-countdown-banner">
      <div className="mx-land-countdown-left">
        <AlertTriangle size={13} className="mx-land-countdown-icon" />
        <span>Next high impact event: <strong>US CPI m/m</strong> in</span>
        <span className="mx-land-countdown-timer">
          {String(t.h).padStart(2, "0")}:{String(t.m).padStart(2, "0")}:{String(t.s).padStart(2, "0")}
        </span>
      </div>
      <div className="mx-land-countdown-pill">Today: 5 High Impact Events</div>
    </div>
  );
}

/* ── Scroll cue ── */
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

/* ── Back to top ── */
function BackToTop({ scrollContainerRef }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf;
    const check = () => {
      const container = scrollContainerRef.current;
      if (container) setShow(container.scrollTop > 500);
      raf = requestAnimationFrame(check);
    };
    check();
    return () => cancelAnimationFrame(raf);
  }, [scrollContainerRef]);

  if (!show) return null;
  return (
    <button
      className="mx-land-back-top"
      onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ChevronUp size={18} />
    </button>
  );
}

/* ── Trader Activity Feed (hero only) ── */
function ActivityFeed() {
  const activities = [
    { icon: Eye, text: "A trader in London just checked US CPI briefing" },
    { icon: Users, text: "847 traders are viewing the dashboard right now" },
    { icon: Bell, text: "New high impact alert: Fed Chair Powell in 2h 14m" },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % activities.length), 4000);
    return () => clearInterval(id);
  }, [activities.length]);

  return (
    <div className="mx-land-activity-feed">
      <div className="mx-land-activity-header">
        <span className="mx-land-activity-dot" />
        Live activity
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          className="mx-land-activity-item"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4 }}
        >
          {(() => {
            const Icon = activities[idx].icon;
            return <Icon size={13} className="mx-land-activity-icon" />;
          })()}
          {activities[idx].text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Globe click popup ── */
function GlobePopup({ marker, onClose, onEnter }) {
  if (!marker) return null;
  const eventCount = Object.values(EVENTS).filter((e) => e.name === marker.name).length || 1;
  return (
    <motion.div
      className="mx-land-globe-popup"
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mx-land-globe-popup-header">
        <span className="mx-land-globe-popup-flag">{marker.flag}</span>
        <span className="mx-land-globe-popup-name">{marker.name}</span>
        <button className="mx-land-globe-popup-close" onClick={onClose}>✕</button>
      </div>
      <div className="mx-land-globe-popup-body">
        <div className="mx-land-globe-popup-stat">
          <span className="mx-land-globe-popup-stat-num">{eventCount}</span>
          <span className="mx-land-globe-popup-stat-label">Events today</span>
        </div>
        <div className="mx-land-globe-popup-event">
          <span className="mx-land-globe-popup-event-impact" style={{ background: IC[marker.impact] }} />
          <span>Highest impact: {marker.name} — 13:30 GMT</span>
        </div>
      </div>
      <button className="mx-land-globe-popup-link" onClick={onEnter}>
        See full briefing <ArrowRight size={12} />
      </button>
    </motion.div>
  );
}

/* ── Section 1: Hero ── */
function HeroSection({ onEnter, onMarkerClick, popupMarker, onPopupClose }) {
  return (
    <section className="mx-land-section mx-land-hero" data-section="0">
      <div className="mx-land-dot-grid" />
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
            <button className="mx-land-btn mx-land-btn--primary mx-land-btn--arrow" onClick={onEnter}>
              Enter Meridex <ArrowRight size={15} className="mx-land-btn-arrow-icon" />
            </button>
            <button className="mx-land-btn mx-land-btn--ghost">
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
      <AnimatePresence>
        {popupMarker && (
          <GlobePopup marker={popupMarker} onClose={onPopupClose} onEnter={onEnter} />
        )}
      </AnimatePresence>
      <ScrollCue />
    </section>
  );
}

/* ── Section 2: Features (bento grid) ── */
function FeaturesSection() {
  const [ref, inView] = useInView(0.12);

  const cards = [
    { icon: Zap, accent: "#ff3d5a", title: "Pre-Event NQ/ES Briefings", desc: "Exact price levels and directional bias before every high impact release. Not signals. Pure intelligence.", grad: "top-left" },
    { icon: Globe2, accent: "#00C9A7", title: "Global Impact Radar", desc: "See which regions are beating expectations and which are missing. The surprise index built for retail.", grad: "top-right" },
    { icon: Landmark, accent: "#ff9f0a", title: "Central Bank Intelligence", desc: "Fed, BOE, ECB, BOJ — their stance, next meeting date, and exactly what it means for your trades.", grad: "bottom-left" },
    { icon: BarChart3, accent: "#a78bfa", title: "Event Volatility History", desc: "How did NQ react to the last 12 CPI releases? Average move, direction, maximum range.", grad: "bottom-right" },
  ];

  return (
    <section className="mx-land-section" data-section="1" ref={ref} id="features">
      <div className="mx-land-features-inner">
        <div className={`mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`}>
          <div className="mx-land-section-label">
            <span className="mx-land-section-label-line" />
            What we do
          </div>
          <h2 className="mx-land-section-title">
            Everything you need.
            <br />
            <span className="mx-land-title-accent">Nothing you don't.</span>
          </h2>
          <p className="mx-land-section-sub">
            Meridex is the intelligence layer that was only available to institutional desks.
            Now built for serious retail traders.
          </p>
        </div>
        <div className="mx-land-bento-grid">
          {cards.map((c, i) => (
            <div
              key={i}
              className={`mx-land-bento-card mx-land-bento-grad-${c.grad} mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`}
              style={{ transitionDelay: `${200 + i * 120}ms`, "--card-accent": c.accent }}
            >
              <div className="mx-land-bento-shine" />
              <div className="mx-land-bento-icon" style={{ color: c.accent, background: `${c.accent}15`, borderColor: `${c.accent}30` }}>
                <c.icon size={24} />
              </div>
              <h3 className="mx-land-bento-title">{c.title}</h3>
              <p className="mx-land-bento-desc">{c.desc}</p>
              <div className="mx-land-bento-arrow">
                <ArrowUpRight size={18} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 3: Live Intelligence Preview ── */
function LivePreviewSection() {
  const [ref, inView] = useInView(0.12);
  const [tab, setTab] = useState("brief");
  const t = useCountdown(3.23);

  const calendarRows = allEvents.slice(0, 5);
  const banks = [
    { name: "Federal Reserve", short: "Fed", rate: "5.50%", stance: "Hawkish", color: "#ff3d5a" },
    { name: "Bank of England", short: "BOE", rate: "5.25%", stance: "Holding", color: "#ff9f0a" },
    { name: "European Central Bank", short: "ECB", rate: "4.50%", stance: "Dovish", color: "#00C9A7" },
    { name: "Bank of Japan", short: "BOJ", rate: "0.10%", stance: "Accommodative", color: "#00C9A7" },
  ];

  return (
    <section className="mx-land-section" data-section="2" ref={ref} id="calendar">
      <div className="mx-land-preview-inner">
        <div className={`mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`} style={{ textAlign: "center" }}>
          <div className="mx-land-section-label" style={{ justifyContent: "center" }}>
            <span className="mx-land-section-label-line" />
            Live preview
          </div>
          <h2 className="mx-land-section-title" style={{ textAlign: "center" }}>
            See what traders saw <span className="mx-land-title-accent">this morning.</span>
          </h2>
          <p className="mx-land-section-sub" style={{ textAlign: "center", margin: "0 auto 40px" }}>
            This is a live preview of today's Meridex intelligence brief.
          </p>
        </div>
        <div className={`mx-land-preview-card mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`} style={{ transitionDelay: "200ms" }}>
          <div className="mx-land-preview-tabs">
            <button className={`mx-land-preview-tab ${tab === "brief" ? "active" : ""}`} onClick={() => setTab("brief")}>Daily Brief</button>
            <button className={`mx-land-preview-tab ${tab === "calendar" ? "active" : ""}`} onClick={() => setTab("calendar")}>Event Calendar</button>
            <button className={`mx-land-preview-tab ${tab === "banks" ? "active" : ""}`} onClick={() => setTab("banks")}>Central Banks</button>
          </div>
          <div className="mx-land-preview-body">
            <AnimatePresence mode="wait">
              {tab === "brief" && (
                <motion.div
                  key="brief"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mx-land-preview-brief"
                >
                  <div className="mx-land-brief-top">
                    <div>
                      <div className="mx-land-brief-date">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
                      <div className="mx-land-brief-verdict">
                        <span className="mx-land-brief-badge">High Volatility Day</span>
                      </div>
                    </div>
                    <div className="mx-land-brief-countdown">
                      <span className="mx-land-brief-countdown-label">Next event in</span>
                      <span className="mx-land-brief-countdown-timer">
                        {String(t.h).padStart(2, "0")}:{String(t.m).padStart(2, "0")}:{String(t.s).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                  <ul className="mx-land-brief-list">
                    <li><span className="mx-land-brief-bullet" />US CPI m/m expected at 0.3% vs 0.4% prior — downside surprise likely bullish for NQ</li>
                    <li><span className="mx-land-brief-bullet" />Fed Chair Powell speaking at 18:00 GMT — watch for hawkish/dovish language shifts on inflation</li>
                    <li><span className="mx-land-brief-bullet" />ES key levels: support 5,410 / resistance 5,448 — range break determines direction</li>
                  </ul>
                </motion.div>
              )}
              {tab === "calendar" && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mx-land-preview-calendar"
                >
                  <div className="mx-land-cal-header">
                    <span>Time</span><span>Event</span><span>Impact</span><span>Forecast</span><span>Previous</span>
                  </div>
                  {calendarRows.map((ev, i) => (
                    <div key={i} className="mx-land-cal-row">
                      <span className="mx-land-cal-time">{ev.time}</span>
                      <span className="mx-land-cal-name"><span className="mx-land-cal-flag">{ev.flag}</span> {ev.name}</span>
                      <span className="mx-land-cal-impact" style={{ background: IC[ev.impact], boxShadow: `0 0 4px ${IC[ev.impact]}` }} />
                      <span className="mx-land-cal-forecast">0.3%</span>
                      <span className="mx-land-cal-prev">0.4%</span>
                    </div>
                  ))}
                </motion.div>
              )}
              {tab === "banks" && (
                <motion.div
                  key="banks"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mx-land-preview-banks"
                >
                  {banks.map((b, i) => (
                    <div key={i} className="mx-land-bank-row">
                      <div className="mx-land-bank-name">
                        <span className="mx-land-bank-short">{b.short}</span>
                        {b.name}
                      </div>
                      <div className="mx-land-bank-rate">{b.rate}</div>
                      <div className="mx-land-bank-stance" style={{ color: b.color, borderColor: `${b.color}40`, background: `${b.color}10` }}>
                        {b.stance}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Section 4: Stats ── */
function StatsSection() {
  const [ref, inView] = useInView(0.12);

  const stats = [
    { icon: Globe2, value: 195, suffix: "+", label: "Countries Tracked" },
    { icon: Zap, value: 500, suffix: "+", label: "Monthly Events" },
    { icon: BarChart3, value: 14, suffix: "", label: "Asset Classes" },
    { icon: TrendingUp, value: 99, suffix: "%", label: "Uptime" },
    { icon: Activity, value: 0, suffix: "", label: "Real-time Updates", isText: true },
  ];

  return (
    <section className="mx-land-section mx-land-stats-section" data-section="3" ref={ref}>
      <div className="mx-land-stats-bg" />
      <div className="mx-land-stats-inner">
        <div className={`mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`} style={{ textAlign: "center" }}>
          <div className="mx-land-section-label" style={{ justifyContent: "center" }}>
            <span className="mx-land-section-label-line" />
            By the numbers
          </div>
          <h2 className="mx-land-section-title" style={{ textAlign: "center", marginBottom: "12px" }}>
            <span className="mx-land-title-white">Built</span> <span className="mx-land-title-accent">different.</span>
          </h2>
          <p className="mx-land-section-sub" style={{ textAlign: "center", margin: "0 auto 56px" }}>The numbers behind the platform.</p>
        </div>
        <div className="mx-land-stats-row">
          {stats.map((s, i) => (
            <React.Fragment key={i}>
              <div
                className={`mx-land-stat-card mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`}
                style={{ transitionDelay: `${200 + i * 100}ms` }}
              >
                <div className="mx-land-stat-icon"><s.icon size={18} /></div>
                <div className="mx-land-stat-num">
                  {s.isText ? (
                    <span className="mx-land-stat-live">
                      <span className="mx-land-stat-live-dot" /> Real-time
                    </span>
                  ) : (
                    <AnimatedCounter target={s.value} suffix={s.suffix} />
                  )}
                </div>
                <div className="mx-land-stat-underline" />
                <div className="mx-land-stat-label">{s.label}</div>
              </div>
              {i < stats.length - 1 && <div className="mx-land-stat-sep" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 5: Social Proof ── */
function SocialProofSection() {
  const [ref, inView] = useInView(0.12);

  const testimonials = [
    { quote: "Meridex replaced three separate tools I was paying for. The pre-event briefings alone are worth it.", name: "James K.", focus: "NQ Futures", initials: "JK" },
    { quote: "I stopped getting caught off guard on CPI days. The daily verdict card is the first thing I check every morning.", name: "Sarah M.", focus: "ES Day Trading", initials: "SM" },
    { quote: "The central bank stance tracker saved me from a bad trade on the last BOE meeting.", name: "David L.", focus: "Macro Futures", initials: "DL" },
    { quote: "Historical reaction data for CPI is a game changer. I know the average NQ move before the number drops.", name: "Alex R.", focus: "Quant Trading", initials: "AR" },
    { quote: "Finally a platform that speaks the language of futures traders. Not crypto, not forex — NQ and ES.", name: "Mike T.", focus: "Prop Desk", initials: "MT" },
  ];

  return (
    <section className="mx-land-section" data-section="4" ref={ref}>
      <div className="mx-land-social-inner">
        <div className={`mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`} style={{ textAlign: "center" }}>
          <div className="mx-land-section-label" style={{ justifyContent: "center" }}>
            <span className="mx-land-section-label-line" />
            Social proof
          </div>
          <h2 className="mx-land-section-title" style={{ textAlign: "center" }}>
            Trusted by traders who take<br />their edge <span className="mx-land-title-accent">seriously.</span>
          </h2>
        </div>
        <div className="mx-land-testimonials">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`mx-land-testimonial mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`}
              style={{ transitionDelay: `${200 + i * 100}ms` }}
            >
              <div className="mx-land-stars">
                {[...Array(5)].map((_, s) => <Star key={s} size={13} fill="#00C9A7" className="mx-land-star" />)}
              </div>
              <p className="mx-land-testimonial-quote">"{t.quote}"</p>
              <div className="mx-land-testimonial-profile">
                <div className="mx-land-avatar">{t.initials}</div>
                <div>
                  <div className="mx-land-testimonial-name">{t.name}</div>
                  <div className="mx-land-testimonial-focus">{t.focus}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 6: Market Pulse Strip ── */
function MarketPulseSection() {
  const [ref, inView] = useInView(0.12);

  const [assets, setAssets] = useState([
    { name: "NQ", price: "18,245.50", change: "+0.84%", up: true, spark: [20, 18, 22, 19, 24, 21, 26, 23, 28] },
    { name: "ES", price: "5,432.25", change: "+0.42%", up: true, spark: [20, 22, 19, 24, 21, 25, 23, 27, 25] },
    { name: "Gold", price: "2,418.30", change: "-0.31%", up: false, spark: [28, 26, 27, 24, 25, 22, 23, 20, 21] },
    { name: "EUR/USD", price: "1.0842", change: "+0.12%", up: true, spark: [20, 21, 19, 22, 20, 23, 21, 24, 22] },
    { name: "GBP/USD", price: "1.2715", change: "-0.22%", up: false, spark: [24, 22, 25, 21, 23, 19, 21, 18, 20] },
    { name: "Oil", price: "82.45", change: "+1.05%", up: true, spark: [18, 20, 19, 23, 22, 26, 25, 29, 28] },
  ]);
  const [flashIdx, setFlashIdx] = useState(-1);
  const [flashUp, setFlashUp] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      const idx = Math.floor(Math.random() * assets.length);
      const up = Math.random() > 0.4;
      setAssets((prev) => prev.map((a, i) => {
        if (i !== idx) return a;
        const base = parseFloat(a.price.replace(/,/g, ""));
        const delta = (Math.random() * 0.005 + 0.001) * (up ? 1 : -1);
        const newPrice = (base * (1 + delta)).toFixed(a.name.includes("/") ? 4 : 2);
        return {
          ...a,
          price: newPrice.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
          change: `${up ? "+" : "-"}${(Math.abs(delta) * 100).toFixed(2)}%`,
          up,
        };
      }));
      setFlashIdx(idx);
      setFlashUp(up);
      setTimeout(() => setFlashIdx(-1), 600);
    }, 3000);
    return () => clearInterval(id);
  }, [assets.length]);

  function Sparkline({ data, up }) {
    const w = 80, h = 28;
    const max = Math.max(...data), min = Math.min(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
    const areaPts = `0,${h} ${pts} ${w},${h}`;
    return (
      <svg width={w} height={h} className="mx-land-spark">
        <polygon points={areaPts} fill={up ? "rgba(0,201,167,0.08)" : "rgba(255,61,90,0.08)"} />
        <polyline points={pts} fill="none" stroke={up ? "#00C9A7" : "#ff3d5a"} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <section className="mx-land-section mx-land-pulse-section" data-section="5" ref={ref} id="markets">
      <div className="mx-land-pulse-inner">
        <div className={`mx-land-pulse-card mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`}>
          {assets.map((a, i) => (
            <div
              key={i}
              className={`mx-land-pulse-item ${flashIdx === i ? (flashUp ? "mx-land-flash-up" : "mx-land-flash-down") : ""}`}
            >
              <div className="mx-land-pulse-name">{a.name}</div>
              <div className={`mx-land-pulse-price ${flashIdx === i ? (flashUp ? "mx-land-flash-up" : "mx-land-flash-down") : ""}`}>
                {a.price}
              </div>
              <div className={`mx-land-pulse-change ${a.up ? "up" : "down"}`}>
                {a.change}
              </div>
              <Sparkline data={a.spark} up={a.up} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 7: How It Works ── */
function HowItWorksSection() {
  const [ref, inView] = useInView(0.12);

  const steps = [
    { num: "01", title: "Monitor", desc: "The globe shows you where events are happening. Every country, every impact level, in real time." },
    { num: "02", title: "Prepare", desc: "Click any country to see specific NQ and ES briefings with exact price levels before the event drops." },
    { num: "03", title: "Execute", desc: "Set alerts for high impact events so you are never trading blind when the numbers hit." },
  ];

  return (
    <section className="mx-land-section" data-section="6" ref={ref} id="intelligence">
      <div className="mx-land-how-inner">
        <div className={`mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`} style={{ textAlign: "center" }}>
          <div className="mx-land-section-label" style={{ justifyContent: "center" }}>
            <span className="mx-land-section-label-line" />
            How it works
          </div>
          <h2 className="mx-land-section-title" style={{ textAlign: "center" }}>The intelligence loop.</h2>
        </div>
        <div className="mx-land-steps-row">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div
                className={`mx-land-step-card mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`}
                style={{ transitionDelay: `${200 + i * 150}ms` }}
              >
                <div className="mx-land-step-preview" />
                <div className="mx-land-step-num">{s.num}</div>
                <h3 className="mx-land-step-title">{s.title}</h3>
                <p className="mx-land-step-desc">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-land-step-arrow mx-land-anim ${inView ? "mx-land-anim--in" : ""}`} style={{ transitionDelay: `${300 + i * 150}ms` }}>
                  <motion.div
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ChevronRight size={20} />
                  </motion.div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 8: Platform Capabilities Wheel ── */
function CapabilitiesWheelSection() {
  const [ref, inView] = useInView(0.12);
  const [hovered, setHovered] = useState(null);

  const nodes = [
    { icon: Calendar, label: "Economic Calendar", desc: "500+ monthly events tracked across 195 countries." },
    { icon: Globe2, label: "Globe View", desc: "Interactive 3D globe with real-time event markers." },
    { icon: Zap, label: "NQ/ES Briefings", desc: "Pre-event price levels and directional bias for futures." },
    { icon: Landmark, label: "Central Banks", desc: "Stance tracking for Fed, BOE, ECB, BOJ and more." },
    { icon: TrendingUp, label: "Surprise Index", desc: "See which regions beat or miss expectations." },
    { icon: BarChart3, label: "Volatility History", desc: "How NQ and ES reacted to the last 12 releases." },
    { icon: Bell, label: "Smart Alerts", desc: "Never get caught off guard by high impact events." },
    { icon: Eye, label: "Watchlist", desc: "Track the countries and events that matter to you." },
  ];

  const radius = 200;

  return (
    <section className="mx-land-section" data-section="7" ref={ref}>
      <div className="mx-land-wheel-inner">
        <div className={`mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`} style={{ textAlign: "center" }}>
          <div className="mx-land-section-label" style={{ justifyContent: "center" }}>
            <span className="mx-land-section-label-line" />
            Capabilities
          </div>
          <h2 className="mx-land-section-title" style={{ textAlign: "center" }}>
            One platform. <span className="mx-land-title-accent">Every edge.</span>
          </h2>
        </div>
        <div className="mx-land-wheel-wrap">
          <div className="mx-land-wheel-hub">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <ellipse cx="8" cy="8" rx="2.8" ry="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1.5 8h13" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </div>
          {nodes.map((n, i) => {
            const angle = (i / nodes.length) * 360 - 90;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            return (
              <div
                key={i}
                className={`mx-land-wheel-node ${inView ? "mx-land-wheel-node--in" : ""}`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transitionDelay: `${300 + i * 100}ms`,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="mx-land-wheel-spoke" style={{ transform: `rotate(${angle + 90}deg)` }} />
                <div className="mx-land-wheel-pill">
                  <n.icon size={14} />
                  <span>{n.label}</span>
                </div>
                {hovered === i && (
                  <div className="mx-land-wheel-tooltip">{n.desc}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Section 9: Comparison ── */
function ComparisonSection() {
  const [ref, inView] = useInView(0.12);

  const rows = [
    { before: "Checking three different sites for economic data", after: "Everything in one command centre" },
    { before: "Getting blindsided by CPI because you missed the release", after: "Pre-event briefings the night before" },
    { before: "Not knowing if today is a tradeable day", after: "Daily verdict tells you exactly what to expect" },
    { before: "Guessing how NQ will react", after: "Historical reaction data for every event" },
    { before: "Missing central bank shifts", after: "Real time stance tracking for all major banks" },
    { before: "Trading with retail information", after: "Intelligence previously only available to institutions" },
  ];

  return (
    <section className="mx-land-section" data-section="8" ref={ref}>
      <div className="mx-land-compare-inner">
        <div className={`mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`} style={{ textAlign: "center" }}>
          <div className="mx-land-section-label" style={{ justifyContent: "center" }}>
            <span className="mx-land-section-label-line" />
            The difference
          </div>
          <h2 className="mx-land-section-title" style={{ textAlign: "center" }}>
            Why traders <span className="mx-land-title-accent">switch to Meridex.</span>
          </h2>
        </div>
        <div className={`mx-land-compare-table mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`} style={{ transitionDelay: "200ms" }}>
          <div className="mx-land-compare-header">
            <div className="mx-land-compare-col mx-land-compare-before">
              <div className="mx-land-compare-badge mx-land-compare-badge--red">Before Meridex</div>
            </div>
            <div className="mx-land-compare-col mx-land-compare-after">
              <div className="mx-land-compare-badge mx-land-compare-badge--teal">With Meridex</div>
            </div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="mx-land-compare-row">
              <div className="mx-land-compare-cell mx-land-compare-cell--before">
                <span className="mx-land-compare-x">✕</span>
                {r.before}
              </div>
              <div className="mx-land-compare-cell mx-land-compare-cell--after">
                <span className="mx-land-compare-check">✓</span>
                {r.after}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 10: Final CTA ── */
function FinalSection({ onEnter }) {
  const [ref, inView] = useInView(0.15);
  const [email, setEmail] = useState("");

  return (
    <section className="mx-land-section" data-section="9" ref={ref} id="pricing">
      <div className="mx-land-final-glow" />
      <div className={`mx-land-final-content mx-land-anim mx-land-clip ${inView ? "mx-land-anim--in" : ""}`}>
        <div className="mx-land-final-line" />
        <h2 className="mx-land-final-headline">Stop reacting.<br />Start preparing.</h2>
        <p className="mx-land-final-sub">
          Join 10,000 traders who see what is coming before it arrives.
          Meridex gives you the intelligence layer that was previously only
          available to institutional desks.
        </p>
        <div className="mx-land-waitlist">
          <input
            type="email"
            className="mx-land-waitlist-input"
            placeholder="Join 10,000+ traders"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="mx-land-btn mx-land-btn--primary mx-land-btn--arrow" onClick={onEnter}>
            Submit <ArrowRight size={15} className="mx-land-btn-arrow-icon" />
          </button>
        </div>
        <button className="mx-land-btn mx-land-btn--xl mx-land-btn--pulse mx-land-btn--arrow" onClick={onEnter}>
          Enter Meridex <ArrowRight size={18} className="mx-land-btn-arrow-icon" />
        </button>
        <div className="mx-land-final-meta">
          <span><Clock size={13} /> No credit card required</span>
          <span><TrendingUp size={13} /> Free during beta</span>
          <span><Shield size={13} /> Cancel anytime</span>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="mx-land-footer">
      <div className="mx-land-footer-inner">
        <div className="mx-land-footer-col">
          <div className="mx-land-footer-brand">
            <div className="mx-land-nav-mark">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                <ellipse cx="8" cy="8" rx="2.8" ry="6.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1.5 8h13" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </div>
            <span className="mx-land-nav-text">Meri<span>dex</span></span>
          </div>
          <p className="mx-land-footer-desc">Global economic intelligence built for serious NQ and ES futures traders.</p>
          <div className="mx-land-footer-social">
            <a href="#features"><Send size={16} /></a>
            <a href="#features"><MessageCircle size={16} /></a>
            <a href="#features"><GitBranch size={16} /></a>
          </div>
        </div>
        <div className="mx-land-footer-col">
          <div className="mx-land-footer-heading">Platform</div>
          <a href="#features">Features</a>
          <a href="#calendar">Calendar</a>
          <a href="#markets">Markets</a>
          <a href="#intelligence">Intelligence</a>
          <a href="#pricing">Pricing</a>
          <a href="#features">Changelog</a>
        </div>
        <div className="mx-land-footer-col">
          <div className="mx-land-footer-heading">Legal</div>
          <a href="#features">Privacy Policy</a>
          <a href="#features">Terms of Service</a>
          <a href="#features">Cookie Policy</a>
          <a href="#features">Contact</a>
        </div>
      </div>
      <div className="mx-land-footer-bottom">
        Meridex © 2025 · Built for serious traders · All times in GMT
      </div>
    </footer>
  );
}

/* ── Main ── */
export function HomePage() {
  const scrollContainerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [fading, setFading] = useState(false);
  const [popupMarker, setPopupMarker] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  const handleEnter = useCallback(() => {
    setFading(true);
    setTimeout(() => navigate("/dashboard"), 800);
  }, [navigate]);

  const handleMarkerClick = useCallback((marker) => {
    setPopupMarker(marker);
  }, []);

  return (
    <div className="mx-land-page">
      {fading && <div className="mx-land-fade-white" />}
      <div className="mx-land-ambient" />
      <PersistentGlobe scrollContainerRef={scrollContainerRef} mouseRef={mouseRef} onMarkerClick={handleMarkerClick} />
      <div className="mx-land-vignette" />
      <ScrollProgress scrollContainerRef={scrollContainerRef} />
      <Navbar />
      <Ticker />
      <CountdownBanner />
      <div className="mx-land-scroll" ref={scrollContainerRef}>
        <HeroSection onEnter={handleEnter} onMarkerClick={handleMarkerClick} popupMarker={popupMarker} onPopupClose={() => setPopupMarker(null)} />
        <FeaturesSection />
        <LivePreviewSection />
        <StatsSection />
        <SocialProofSection />
        <MarketPulseSection />
        <HowItWorksSection />
        <CapabilitiesWheelSection />
        <ComparisonSection />
        <FinalSection onEnter={handleEnter} />
        <Footer />
      </div>
      <BackToTop scrollContainerRef={scrollContainerRef} />
    </div>
  );
}
