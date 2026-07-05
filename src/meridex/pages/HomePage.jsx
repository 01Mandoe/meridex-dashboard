import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Zap, Radar, Landmark, ArrowRight, Activity, TrendingUp, Clock } from "lucide-react";
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

/* ── Persistent globe — fixed, driven by scroll progress ── */
function PersistentGlobe({ scrollYProgress, mouseRef }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const cloudRef = useRef(null);
  const starsRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // Globe moves right and shrinks as you scroll past hero
  const x = useSpring(useTransform(scrollYProgress, [0, 0.15, 0.3, 0.45], ["0%", "0%", "30%", "35%"]), { stiffness: 40, damping: 18 });
  const scale = useSpring(useTransform(scrollYProgress, [0, 0.15, 0.3, 0.45], [1, 1, 0.7, 0.65]), { stiffness: 40, damping: 18 });
  const opacity = useTransform(scrollYProgress, [0.72, 0.85], [1, 0]);
  const altitude = useSpring(useTransform(scrollYProgress, [0, 0.15, 0.3], [2.5, 2.0, 2.2]), { stiffness: 50, damping: 20 });
  const rotSpeed = useTransform(scrollYProgress, [0, 0.5], [0.4, 1.0]);

  useEffect(() => {
    const node = containerRef.current;
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

  // RAF loop: drive POV from scroll + mouse
  useEffect(() => {
    let raf;
    const update = () => {
      const g = globeRef.current;
      if (g && loaded) {
        const p = scrollYProgress.get();
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        g.pointOfView({ lat: 20 - my * 5, lng: -40 - mx * 8, altitude: altitude.get() }, 0);
        g.controls().autoRotateSpeed = rotSpeed.get();
        if (cloudRef.current) {
          cloudRef.current.material.opacity = p < 0.1 ? 0 : Math.min(0.4, (p - 0.1) * 2);
          cloudRef.current.rotation.y += 0.0004;
        }
        if (starsRef.current) starsRef.current.material.opacity = Math.max(0, 0.6 - p * 1.2);
        // Arcs in section 3
        if (p > 0.35 && p < 0.6) {
          if (!g._arcsOn) {
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
          }
        } else if (g._arcsOn) {
          g._arcsOn = false;
          g.arcsData([]);
        }
      }
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [loaded, scrollYProgress, altitude, rotSpeed, mouseRef]);

  return (
    <motion.div
      ref={containerRef}
      className="mx-land-globe-fixed"
      style={{ x, scale, opacity }}
    >
      <div style={{ opacity: loaded ? 1 : 0, transition: "opacity 1.5s ease", width: "100%", height: "100%" }} />
    </motion.div>
  );
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

/* ── Scroll indicator ── */
function ScrollCue() {
  return (
    <motion.div
      className="mx-land-scroll-cue"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5, duration: 1 }}
    >
      <span>Scroll</span>
      <div className="mx-land-scroll-cue-track">
        <motion.div
          className="mx-land-scroll-cue-dot"
          animate={{ y: [0, 18, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

/* ── Section 1: Hero ── */
function HeroSection({ onEnter }) {
  return (
    <section className="mx-land-section mx-land-hero">
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
    <section className="mx-land-section mx-land-features">
      <div className="mx-land-features-inner">
        <motion.div
          className="mx-land-section-label"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="mx-land-section-label-line" />
          What we do
        </motion.div>
        <motion.h2
          className="mx-land-section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          The intelligence layer for
          <br />
          <span className="mx-land-title-accent">futures traders.</span>
        </motion.h2>
        <div className="mx-land-feature-grid">
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="mx-land-feature-card"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mx-land-feature-top">
                <div className="mx-land-feature-icon"><f.icon size={20} /></div>
                <span className="mx-land-feature-tag">{f.tag}</span>
              </div>
              <h3 className="mx-land-feature-title">{f.title}</h3>
              <p className="mx-land-feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Section 3: Stats + Live Ticker ── */
function StatsSection() {
  const stats = [
    { value: 195, suffix: "+", label: "Countries Tracked" },
    { value: 500, suffix: "+", label: "Monthly Events" },
    { value: 14, suffix: "", label: "Asset Classes" },
    { value: 0, suffix: "", label: "Real-time Updates", isText: true },
  ];

  return (
    <section className="mx-land-section mx-land-stats-section">
      <div className="mx-land-stats-grid-bg" />
      <div className="mx-land-stats-inner">
        <motion.div
          className="mx-land-section-label"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="mx-land-section-label-line" />
          By the numbers
        </motion.div>
        <motion.h2
          className="mx-land-section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Built different.
        </motion.h2>
        <div className="mx-land-stats-row">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              className="mx-land-stat"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
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
            </motion.div>
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
    <motion.div
      className="mx-land-ticker"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.4 }}
    >
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
    </motion.div>
  );
}

/* ── Section 4: Final CTA ── */
function FinalSection({ onEnter }) {
  return (
    <section className="mx-land-section mx-land-final">
      <div className="mx-land-final-glow" />
      <motion.div
        className="mx-land-final-content"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
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
      </motion.div>
    </section>
  );
}

/* ── Scroll progress bar ── */
function ProgressBar({ scrollYProgress }) {
  const scaleY = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return <motion.div className="mx-land-progress" style={{ scaleY }} />;
}

/* ── Main ── */
export function HomePage() {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [fading, setFading] = useState(false);
  const navigate = useNavigate();

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

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
    <div className="mx-land-page" ref={containerRef}>
      {fading && <div className="mx-land-fade-black" />}
      <div className="mx-land-ambient" />
      <PersistentGlobe scrollYProgress={scrollYProgress} mouseRef={mouseRef} />
      <div className="mx-land-vignette" />
      <BrandLogo />
      <ProgressBar scrollYProgress={scrollYProgress} />
      <HeroSection onEnter={handleEnter} />
      <FeaturesSection />
      <StatsSection />
      <FinalSection onEnter={handleEnter} />
    </div>
  );
}
