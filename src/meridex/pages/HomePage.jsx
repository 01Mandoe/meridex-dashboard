import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Radar, Landmark, ArrowRight, Activity, Clock, TrendingUp } from "lucide-react";
import { EVENTS, IC, allEvents } from "../data";
import { AnimatedCounter } from "../components/AnimatedCounter";

const ACCENT = "#00e5c7";

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

/* ── Section configs: how globe transforms per section ── */
// Each section defines the globe's CSS transform state.
// The globe wrapper interpolates between these based on scroll position.
const SECTION_COUNT = 5;

/* ── Persistent Globe — fixed, transforms driven by rAF ── */
function PersistentGlobe({ scrollContainerRef, activeSection, mouseRef }) {
  const wrapRef = useRef(null);
  const globeRef = useRef(null);
  const cloudRef = useRef(null);
  const starsRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // Init globe once
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
        .showAtmosphere(true).atmosphereColor(ACCENT).atmosphereAltitude(0.22)
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

      // Clouds
      const scene = g.scene();
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(101.5, 96, 96),
        new THREE.MeshPhongMaterial({ map: cloudsTex, transparent: true, opacity: 0.0, depthWrite: false }),
      );
      scene.add(clouds);
      cloudRef.current = clouds;

      // Stars
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

  // rAF loop: read scroll position via getBoundingClientRect (no scroll listeners)
  // and apply CSS transforms to the globe wrapper. Also drive globe POV + mouse parallax.
  useEffect(() => {
    let raf;
    const update = () => {
      const container = scrollContainerRef.current;
      const wrap = wrapRef.current;
      const g = globeRef.current;

      if (container && wrap) {
        // Compute scroll progress 0..1 across all sections
        const rect = container.getBoundingClientRect();
        const scrollable = container.scrollHeight - window.innerHeight;
        const progress = Math.max(0, Math.min(1, -rect.top / scrollable));

        // Map progress to section index (0..4)
        const sectionF = progress * (SECTION_COUNT - 1);
        const sectionIdx = Math.round(sectionF);

        // Globe transform states per section:
        // S1: right 40%, scale 1, opacity 1
        // S2: right 40%, scale 1.1, opacity 1
        // S3: center, scale 1.3, opacity 0.85
        // S4: center, scale 1.4, opacity 0.7
        // S5: center, scale 1.6, opacity 0
        const states = [
          { tx: 38, ty: 0, scale: 1.0, opacity: 1.0 },
          { tx: 38, ty: 0, scale: 1.1, opacity: 1.0 },
          { tx: 15, ty: 0, scale: 1.3, opacity: 0.85 },
          { tx: 15, ty: 0, scale: 1.4, opacity: 0.7 },
          { tx: 15, ty: 0, scale: 1.6, opacity: 0.0 },
        ];

        // Interpolate between current and next state
        const idx0 = Math.floor(sectionF);
        const idx1 = Math.min(idx0 + 1, SECTION_COUNT - 1);
        const frac = sectionF - idx0;
        const s0 = states[idx0];
        const s1 = states[idx1];
        const lerp = (a, b, t) => a + (b - a) * t;

        const tx = lerp(s0.tx, s1.tx, frac);
        const scale = lerp(s0.scale, s1.scale, frac);
        const opacity = lerp(s0.opacity, s1.opacity, frac);

        // Mouse parallax
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        wrap.style.transform = `translateX(${tx}vw) scale(${scale})`;
        wrap.style.opacity = opacity;

        // Drive globe POV
        if (g && loaded) {
          const altitude = lerp(2.5, 2.0, Math.min(1, progress * 2));
          g.pointOfView({ lat: 20 - my * 5, lng: -40 - mx * 8, altitude }, 0);
          g.controls().autoRotateSpeed = 0.4 + progress * 0.6;

          // Clouds ramp in after section 1
          if (cloudRef.current) {
            cloudRef.current.material.opacity = Math.min(0.4, Math.max(0, (progress - 0.15) * 2));
            cloudRef.current.rotation.y += 0.0004;
          }

          // Stars fade out
          if (starsRef.current) {
            starsRef.current.material.opacity = Math.max(0, 0.6 - progress * 1.2);
          }

          // Arcs in section 4 (index 3)
          const shouldShowArcs = sectionIdx === 3;
          if (shouldShowArcs && !g._arcsOn) {
            g._arcsOn = true;
            const entries = Object.entries(EVENTS);
            const arcs = [];
            for (let i = 0; i < entries.length; i++) {
              for (let j = i + 1; j < entries.length; j++) {
                if (entries[i][1].impact !== "low" || entries[j][1].impact !== "low") {
                  arcs.push({ startLat: entries[i][1].lat, startLng: entries[i][1].lon, endLat: entries[j][1].lat, endLng: entries[j][1].lon, color: [`${ACCENT}00`, ACCENT, `${ACCENT}00`] });
                }
              }
            }
            g.arcsData(arcs);
          } else if (!shouldShowArcs && g._arcsOn) {
            g._arcsOn = false;
            g.arcsData([]);
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

/* ── useInView hook via Intersection Observer ── */
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold: 0.3, ...options });
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView];
}

/* ── Brand logo ── */
function BrandLogo() {
  return (
    <div className="mx-land-brand">
      <div className="mx-land-brand-mark">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <ellipse cx="8" cy="8" rx="2.8" ry="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M1.5 8h13" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </div>
      <span className="mx-land-brand-text">Meri<span>dex</span></span>
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
    <section className="mx-land-section mx-land-snap" data-section="0">
      <motion.div
        className="mx-land-hero-content"
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
          Real-time global economic intelligence built for serious futures traders.
          Track 195 countries, 500 monthly events, and every central bank decision
          that moves the tape.
        </p>
        <div className="mx-land-btns">
          <button className="mx-land-btn mx-land-btn--primary" onClick={onEnter}>
            Enter Meridex <ArrowRight size={15} />
          </button>
          <button className="mx-land-btn mx-land-btn--ghost">
            See how it works
          </button>
        </div>
      </motion.div>
      <ScrollCue />
    </section>
  );
}

/* ── Section 2: What We Do ── */
function FeaturesSection() {
  const [ref, inView] = useInView({ threshold: 0.25 });

  const features = [
    {
      icon: Zap,
      title: "Pre-Event NQ/ES Briefings",
      desc: "Know the exact price levels to watch before every high-impact release. Not signals — intelligence. Each briefing includes expected ranges, key technical levels, and the scenario that flips the trade.",
      tag: "Before the bell",
    },
    {
      icon: Radar,
      title: "Global Impact Radar",
      desc: "See which regions are beating expectations and which are missing. The surprise index that hedge funds use to position ahead of data, built for retail. Updated the second data drops.",
      tag: "Real-time",
    },
    {
      icon: Landmark,
      title: "Central Bank Intelligence",
      desc: "Fed, BOE, ECB, BOJ — their current stance, next meeting, market-implied odds, and what it means for your trades. Every central bank, one dashboard, zero noise.",
      tag: "Always on",
    },
  ];

  return (
    <section className="mx-land-section mx-land-snap" data-section="1" ref={ref}>
      <div className="mx-land-features-inner">
        <div className={`mx-land-anim ${inView ? "mx-land-anim--in" : ""}`} style={{ transitionDelay: "0ms" }}>
          <div className="mx-land-section-label">
            <span className="mx-land-section-label-line" />
            What we do
          </div>
          <h2 className="mx-land-section-title">
            The intelligence layer for
            <br />
            <span className="mx-land-title-accent">futures traders.</span>
          </h2>
        </div>
        <div className="mx-land-feature-grid">
          {features.map((f, i) => (
            <div
              key={i}
              className={`mx-land-feature-card mx-land-anim ${inView ? "mx-land-anim--in" : ""}`}
              style={{ transitionDelay: `${200 + i * 150}ms` }}
            >
              <div className="mx-land-feature-top">
                <div className="mx-land-feature-icon"><f.icon size={20} /></div>
                <span className="mx-land-feature-tag">{f.tag}</span>
              </div>
              <h3 className="mx-land-feature-title">{f.title}</h3>
              <p className="mx-land-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 3: Stats + Ticker ── */
function StatsSection() {
  const [ref, inView] = useInView({ threshold: 0.25 });

  const stats = [
    { value: 195, suffix: "+", label: "Countries Tracked" },
    { value: 500, suffix: "+", label: "Monthly Events" },
    { value: 14, suffix: "", label: "Asset Classes" },
    { value: 0, suffix: "", label: "Real-time Updates", isText: true },
  ];

  return (
    <section className="mx-land-section mx-land-snap" data-section="2" ref={ref}>
      <div className="mx-land-stats-grid-bg" />
      <div className="mx-land-stats-inner">
        <div className={`mx-land-anim ${inView ? "mx-land-anim--in" : ""}`}>
          <div className="mx-land-section-label" style={{ justifyContent: "center" }}>
            <span className="mx-land-section-label-line" />
            By the numbers
          </div>
          <h2 className="mx-land-section-title" style={{ textAlign: "center" }}>Built different.</h2>
        </div>
        <div className="mx-land-stats-row">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`mx-land-stat mx-land-anim ${inView ? "mx-land-anim--in" : ""}`}
              style={{ transitionDelay: `${200 + i * 100}ms` }}
            >
              <div className="mx-land-stat-num">
                {s.isText ? (
                  <span className="mx-land-stat-live">
                    <Activity size={18} /> Real-time
                  </span>
                ) : (
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                )}
              </div>
              <div className="mx-land-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <LiveTicker />
      </div>
    </section>
  );
}

function LiveTicker() {
  const items = allEvents;
  return (
    <div className="mx-land-ticker">
      <div className="mx-land-ticker-label">LIVE</div>
      <div className="mx-land-ticker-wrap">
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

/* ── Section 4: Final CTA ── */
function FinalSection({ onEnter }) {
  const [ref, inView] = useInView({ threshold: 0.3 });

  return (
    <section className="mx-land-section mx-land-snap" data-section="3" ref={ref}>
      <div className="mx-land-final-glow" />
      <div className={`mx-land-final-content mx-land-anim ${inView ? "mx-land-anim--in" : ""}`}>
        <h2 className="mx-land-final-headline">Stop reacting.<br />Start preparing.</h2>
        <p className="mx-land-final-sub">
          Join 10,000 traders who see what is coming before it arrives.
          Meridex gives you the intelligence layer that was previously only
          available to institutional desks.
        </p>
        <button className="mx-land-btn mx-land-btn--primary mx-land-btn--lg" onClick={onEnter}>
          Enter Meridex <ArrowRight size={18} />
        </button>
        <div className="mx-land-final-meta">
          <span><Clock size={12} /> No credit card required</span>
          <span><TrendingUp size={12} /> Free during beta</span>
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
      {fading && <div className="mx-land-fade-black" />}
      <div className="mx-land-ambient" />
      <PersistentGlobe scrollContainerRef={scrollContainerRef} mouseRef={mouseRef} />
      <div className="mx-land-vignette" />
      <BrandLogo />

      <div className="mx-land-scroll" ref={scrollContainerRef}>
        <HeroSection onEnter={handleEnter} />
        <FeaturesSection />
        <StatsSection />
        <FinalSection onEnter={handleEnter} />
      </div>
    </div>
  );
}
