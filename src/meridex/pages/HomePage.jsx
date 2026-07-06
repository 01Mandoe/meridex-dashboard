import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Landmark, ArrowRight, Activity, Clock, TrendingUp, Shield, ChartBar as BarChart3, Globe as Globe2, ChevronRight } from "lucide-react";
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

const SECTION_COUNT = 5;

/* ── Globe transform states per section ── */
// S1: right, large, full opacity, all markers + arcs
// S2: right, zoomed to EU/NA, arcs EU-NA
// S3: center background, all arcs firing rapidly
// S4: center behind cards, smaller, subtle
// S5: center, fading out
const GLOBE_STATES = [
  { tx: 35, scale: 1.0, opacity: 1.0, lat: 20, lng: -40, altitude: 2.5, arcs: "all" },
  { tx: 35, scale: 1.15, opacity: 1.0, lat: 30, lng: -30, altitude: 1.8, arcs: "eu_na" },
  { tx: 12, scale: 1.35, opacity: 0.8, lat: 15, lng: -20, altitude: 2.2, arcs: "all" },
  { tx: 12, scale: 1.1, opacity: 0.5, lat: 20, lng: -40, altitude: 2.8, arcs: "none" },
  { tx: 12, scale: 1.5, opacity: 0.0, lat: 20, lng: -40, altitude: 3.2, arcs: "none" },
];

function buildArcs(mode) {
  const entries = Object.entries(EVENTS);
  const arcs = [];
  if (mode === "all") {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[i][1].impact !== "low" || entries[j][1].impact !== "low") {
          arcs.push({ startLat: entries[i][1].lat, startLng: entries[i][1].lon, endLat: entries[j][1].lat, endLng: entries[j][1].lon, color: ["#00C9A700", "#00C9A7", "#00C9A700"] });
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
        arcs.push({ startLat: euNa[i][1].lat, startLng: euNa[i][1].lon, endLat: euNa[j][1].lat, endLng: euNa[j][1].lon, color: ["#00C9A700", "#00C9A7", "#00C9A700"] });
      }
    }
  }
  return arcs;
}

/* ── Persistent Globe ── */
function PersistentGlobe({ scrollContainerRef, mouseRef }) {
  const wrapRef = useRef(null);
  const globeRef = useRef(null);
  const cloudRef = useRef(null);
  const starsRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

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
        lat: ev.lat, lng: ev.lon, impact: ev.impact, name: ev.name,
      }));
      const rings = markers.map((m) => ({
        lat: m.lat, lng: m.lng, color: IC[m.impact],
        maxR: m.impact === "high" ? 4.5 : m.impact === "medium" ? 3 : 2,
        propSpeed: m.impact === "high" ? 2.5 : 1.8,
        repeatPeriod: m.impact === "high" ? 1400 : 2200,
      }));

      const g = Globe()(node)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true).atmosphereColor("#00C9A7").atmosphereAltitude(0.22)
        .globeMaterial(material)
        .htmlElementsData(markers)
        .htmlElement((d) => {
          const el = document.createElement("div");
          el.className = `mx-land-marker mx-land-marker-${d.impact}`;
          el.innerHTML = `<div class="mx-land-marker-dot"></div>`;
          return el;
        })
        .htmlAltitude(0.01)
        .ringsData(rings)
        .ringColor((d) => (t) => `${d.color}${Math.floor((1 - t) * 110).toString(16).padStart(2, "0")}`)
        .ringMaxRadius("maxR").ringPropagationSpeed("propSpeed").ringRepeatPeriod("repeatPeriod")
        .arcsData([])
        .arcColor("color").arcAltitude(0.3).arcStroke(0.5)
        .arcDashLength(0.4).arcDashGap(0.6).arcDashAnimateTime(2000)
        .width(node.clientWidth).height(node.clientHeight);

      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.4;
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
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0.6, sizeAttenuation: true }));
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

  // rAF loop — reads scroll via getBoundingClientRect, applies CSS transforms
  useEffect(() => {
    let raf;
    let lastArcMode = "";
    const update = () => {
      const container = scrollContainerRef.current;
      const wrap = wrapRef.current;
      const g = globeRef.current;

      if (container && wrap) {
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

        wrap.style.transform = `translateX(${tx}vw) scale(${scale})`;
        wrap.style.opacity = opacity;

        if (g && loaded) {
          const lat = lerp(s0.lat, s1.lat, frac) - my * 4;
          const lng = lerp(s0.lng, s1.lng, frac) - mx * 6;
          const alt = lerp(s0.altitude, s1.altitude, frac);
          g.pointOfView({ lat, lng, altitude: alt }, 0);
          g.controls().autoRotateSpeed = 0.4 + progress * 0.4;

          if (cloudRef.current) {
            cloudRef.current.material.opacity = Math.min(0.35, Math.max(0, (progress - 0.1) * 2));
            cloudRef.current.rotation.y += 0.0004;
          }
          if (starsRef.current) {
            starsRef.current.material.opacity = Math.max(0, 0.5 - progress * 1.0);
          }

          // Arc mode
          const sectionIdx = Math.round(sectionF);
          const arcMode = GLOBE_STATES[sectionIdx].arcs;
          if (arcMode !== lastArcMode) {
            lastArcMode = arcMode;
            if (arcMode === "none") {
              g.arcsData([]);
            } else {
              g.arcsData(buildArcs(arcMode));
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
    <div className="mx-land-globe-outer" ref={wrapRef}>
      <div className="mx-land-globe-inner" style={{ opacity: loaded ? 1 : 0, transition: "opacity 1.5s ease" }} />
    </div>
  );
}

/* ── useInView hook ── */
function useInView(threshold = 0.2) {
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
        <button className="mx-land-btn mx-land-btn--primary mx-land-btn--sm">Get Started</button>
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

/* ── Section 1: Hero ── */
function HeroSection({ onEnter }) {
  return (
    <section className="mx-land-section" data-section="0">
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
          <div className="mx-land-btns">
            <button className="mx-land-btn mx-land-btn--primary" onClick={onEnter}>
              Enter Meridex <ArrowRight size={15} />
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
            <div className="mx-land-trust-item">
              <Shield size={13} />
              Used by 10K+ traders
            </div>
            <div className="mx-land-trust-item">
              <BarChart3 size={13} />
              195 countries tracked
            </div>
          </div>
        </motion.div>
      </div>
      <ScrollCue />
    </section>
  );
}

/* ── Section 2: Features (bento grid) ── */
function FeaturesSection() {
  const [ref, inView] = useInView(0.15);

  const cards = [
    { icon: Zap, border: "#ff3d5a", title: "Pre-Event NQ/ES Briefings", desc: "Exact price levels and directional bias before every high impact release. Not signals. Pure intelligence." },
    { icon: Globe2, border: "#00C9A7", title: "Global Impact Radar", desc: "See which regions are beating expectations and which are missing. The surprise index built for retail." },
    { icon: Landmark, border: "#ff9f0a", title: "Central Bank Intelligence", desc: "Fed, BOE, ECB, BOJ — their stance, next meeting date, and exactly what it means for your trades." },
    { icon: BarChart3, border: "#a78bfa", title: "Event Volatility History", desc: "How did NQ react to the last 12 CPI releases? Average move, direction, maximum range." },
  ];

  return (
    <section className="mx-land-section" data-section="1" ref={ref} id="features">
      <div className="mx-land-features-inner">
        <div className={`mx-land-anim ${inView ? "mx-land-anim--in" : ""}`}>
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
              className={`mx-land-bento-card mx-land-anim ${inView ? "mx-land-anim--in" : ""}`}
              style={{ transitionDelay: `${200 + i * 120}ms`, borderLeftColor: c.border }}
            >
              <div className="mx-land-bento-icon" style={{ color: c.border, background: `${c.border}15`, borderColor: `${c.border}30` }}>
                <c.icon size={20} />
              </div>
              <h3 className="mx-land-bento-title">{c.title}</h3>
              <p className="mx-land-bento-desc">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 3: Stats ── */
function StatsSection() {
  const [ref, inView] = useInView(0.15);

  const stats = [
    { icon: Globe2, value: 195, suffix: "+", label: "Countries Tracked" },
    { icon: Zap, value: 500, suffix: "+", label: "Monthly Events" },
    { icon: BarChart3, value: 14, suffix: "", label: "Asset Classes" },
    { icon: TrendingUp, value: 99, suffix: "%", label: "Uptime" },
    { icon: Activity, value: 0, suffix: "", label: "Real-time Updates", isText: true },
  ];

  return (
    <section className="mx-land-section" data-section="2" ref={ref}>
      <div className="mx-land-stats-card">
        <div className="mx-land-stats-grid-bg" />
        <div className={`mx-land-anim ${inView ? "mx-land-anim--in" : ""}`} style={{ textAlign: "center" }}>
          <div className="mx-land-section-label" style={{ justifyContent: "center" }}>
            <span className="mx-land-section-label-line" />
            By the numbers
          </div>
          <h2 className="mx-land-section-title" style={{ textAlign: "center", marginBottom: "12px" }}>Built different.</h2>
          <p className="mx-land-section-sub" style={{ textAlign: "center", marginBottom: "48px" }}>The numbers behind the platform.</p>
        </div>
        <div className="mx-land-stats-row">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`mx-land-stat-card mx-land-anim ${inView ? "mx-land-anim--in" : ""}`}
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
              <div className="mx-land-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mx-land-ticker-section">
          <div className="mx-land-ticker-bar mx-land-ticker-bar--lg">
            <div className="mx-land-ticker-label">LIVE</div>
            <div className="mx-land-ticker-wrap">
              <div className="mx-land-ticker-fade-l" />
              <div className="mx-land-ticker-fade-r" />
              <div className="mx-land-ticker-track">
                {allEvents.concat(allEvents).map((ev, i) => (
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
        </div>
      </div>
    </section>
  );
}

/* ── Section 4: How It Works ── */
function HowItWorksSection() {
  const [ref, inView] = useInView(0.15);

  const steps = [
    { num: "1", title: "See the globe", desc: "The globe shows you where events are happening. Every country, every impact level, in real time." },
    { num: "2", title: "Click any country", desc: "Click any country to see specific NQ and ES briefings with exact price levels before the event drops." },
    { num: "3", title: "Set your alerts", desc: "Set alerts for high impact events so you are never trading blind when the numbers hit." },
  ];

  return (
    <section className="mx-land-section" data-section="3" ref={ref} id="intelligence">
      <div className="mx-land-how-inner">
        <div className={`mx-land-anim ${inView ? "mx-land-anim--in" : ""}`} style={{ textAlign: "center" }}>
          <div className="mx-land-section-label" style={{ justifyContent: "center" }}>
            <span className="mx-land-section-label-line" />
            How it works
          </div>
          <h2 className="mx-land-section-title" style={{ textAlign: "center" }}>Three steps to an edge.</h2>
        </div>
        <div className="mx-land-steps-row">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div
                className={`mx-land-step-card mx-land-anim ${inView ? "mx-land-anim--in" : ""}`}
                style={{ transitionDelay: `${200 + i * 150}ms` }}
              >
                <div className="mx-land-step-num">{s.num}</div>
                <h3 className="mx-land-step-title">{s.title}</h3>
                <p className="mx-land-step-desc">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-land-step-arrow mx-land-anim ${inView ? "mx-land-anim--in" : ""}`} style={{ transitionDelay: `${300 + i * 150}ms` }}>
                  <ChevronRight size={20} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 5: Final CTA ── */
function FinalSection({ onEnter }) {
  const [ref, inView] = useInView(0.2);

  return (
    <section className="mx-land-section" data-section="4" ref={ref} id="pricing">
      <div className="mx-land-final-glow" />
      <div className={`mx-land-final-content mx-land-anim ${inView ? "mx-land-anim--in" : ""}`}>
        <h2 className="mx-land-final-headline">Stop reacting.<br />Start preparing.</h2>
        <p className="mx-land-final-sub">
          Join 10,000 traders who see what is coming before it arrives.
          Meridex gives you the intelligence layer that was previously only
          available to institutional desks.
        </p>
        <button className="mx-land-btn mx-land-btn--primary mx-land-btn--xl" onClick={onEnter}>
          Enter Meridex <ArrowRight size={18} />
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

/* ── Main ── */
export function HomePage() {
  const scrollContainerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [fading, setFading] = useState(false);
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

  return (
    <div className="mx-land-page">
      {fading && <div className="mx-land-fade-white" />}
      <div className="mx-land-ambient" />
      <PersistentGlobe scrollContainerRef={scrollContainerRef} mouseRef={mouseRef} />
      <div className="mx-land-vignette" />
      <Navbar />
      <Ticker />
      <div className="mx-land-scroll" ref={scrollContainerRef}>
        <HeroSection onEnter={handleEnter} />
        <FeaturesSection />
        <StatsSection />
        <HowItWorksSection />
        <FinalSection onEnter={handleEnter} />
      </div>
    </div>
  );
}
