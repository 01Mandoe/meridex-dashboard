import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Globe as Globe2, Shield, ArrowRight } from "lucide-react";
import { EVENTS, IC, allEvents } from "../data";
import { useParticleSystem } from "../hooks/useParticleSystem";
import { useInView } from "../hooks/useInView";
import { NetworkGraph } from "../components/NetworkGraph";
import { AnimatedCounter } from "../components/AnimatedCounter";

const TEAL = "#00C9A7";

/* ================================================================ */
/*  OPENING SCENE                                                   */
/* ================================================================ */
function OpeningScene({ onDone }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState("particles"); // particles -> typing -> done

  useParticleSystem(canvasRef, { count: 80, speed: 0.6, color: "rgba(0, 201, 167, 0.5)" });

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("typing"), 1200);
    const t2 = setTimeout(() => setPhase("done"), 4000);
    const t3 = setTimeout(() => onDone(), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (phase !== "typing") return;
    const text = "The edge is in the intelligence.";
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <div className={`mx-open ${phase === "done" ? "mx-open--fade" : ""}`}>
      <canvas ref={canvasRef} className="mx-open-canvas" />
      <div className={`mx-open-logo ${phase !== "particles" ? "mx-open-logo--in" : ""}`}>
        Meri<span style={{ color: TEAL }}>dex</span>
      </div>
      {phase === "typing" && (
        <div className="mx-open-typeline">
          {typed}
          <span className="mx-open-cursor" />
        </div>
      )}
    </div>
  );
}

/* ================================================================ */
/*  HERO SECTION                                                    */
/* ================================================================ */
function HeroSection({ onEnter }) {
  const canvasRef = useRef(null);
  useParticleSystem(canvasRef, { count: 100, speed: 0.8, color: "rgba(0, 201, 167, 0.45)" });

  return (
    <section className="mx-land-hero" data-testid="hero-section">
      <canvas ref={canvasRef} className="mx-land-hero-particles" />
      <div className="mx-land-hero-inner">
        <div className="mx-land-hero-left">
          <h1 className="mx-land-hero-headline">
            Markets move fast.
            <br />
            <span style={{ color: TEAL }}>We move faster.</span>
          </h1>
          <p className="mx-land-hero-sub">
            Real-time global economic intelligence built for serious futures traders.
          </p>
          <div className="mx-land-hero-btns">
            <button className="mx-land-btn mx-land-btn--primary" onClick={onEnter}>
              Enter Meridex
              <ArrowRight size={16} />
            </button>
            <button className="mx-land-btn mx-land-btn--ghost">
              See how it works
            </button>
          </div>
        </div>
        <div className="mx-land-hero-right">
          <NetworkGraph />
        </div>
      </div>
      <div className="mx-land-scroll-indicator">
        <span>Scroll</span>
        <div className="mx-land-scroll-line" />
      </div>
    </section>
  );
}

/* ================================================================ */
/*  GLOBE ASSEMBLY SECTION                                          */
/* ================================================================ */
function GlobeAssemblySection() {
  const containerRef = useRef(null);
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [textRevealed, setTextRevealed] = useState(false);
  const [, setMarkerCount] = useState(0);
  const globeRef = useRef(null);

  // Track scroll progress within this section
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when section top hits viewport top, 1 when section bottom hits viewport bottom
      const total = rect.height - vh;
      const scrolled = Math.max(0, -rect.top);
      const p = Math.min(1, Math.max(0, scrolled / total));
      setProgress(p);

      // Reveal markers progressively
      const markers = Object.keys(EVENTS).length;
      const show = Math.floor(p * markers * 1.5);
      setMarkerCount(Math.min(markers, show));

      // Globe rotation speed based on scroll velocity
      if (globeRef.current) {
        const g = globeRef.current;
        g.controls().autoRotateSpeed = 0.3 + p * 2;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reveal text when section enters viewport
  const [textRef, textInView] = useInView(0.3);
  useEffect(() => {
    if (textInView) setTextRevealed(true);
  }, [textInView]);

  // Init globe
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    let disposed = false;
    let globe = null;

    const init = async () => {
      const [Globe, THREE] = await Promise.all([
        import("globe.gl").then((m) => m.default),
        import("three"),
      ]);
      if (disposed) return;

      const sunCoords = getSunCoords();
      const sun = latLngToWorldVec(sunCoords.lat, sunCoords.lng);

      const [dayTex, nightTex, specTex] = await Promise.all([
        loadTexture(THREE, TEX.day),
        loadTexture(THREE, TEX.night),
        loadTexture(THREE, TEX.spec),
      ]);
      if (disposed) return;

      const material = new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayTex },
          nightMap: { value: nightTex },
          specMap: { value: specTex },
          sunDirection: { value: new THREE.Vector3(sun[0], sun[1], sun[2]) },
          nightBoost: { value: 2.6 },
        },
        vertexShader: dayNightVertex,
        fragmentShader: dayNightFragment,
      });

      const markers = Object.entries(EVENTS).map(([code, ev]) => ({
        lat: ev.lat, lng: ev.lon, code,
        impact: ev.impact, name: ev.name, flag: ev.flag, count: ev.items.length,
      }));

      const rings = markers.map((m) => ({
        lat: m.lat, lng: m.lng, color: IC[m.impact],
        maxR: m.impact === "high" ? 4.5 : m.impact === "medium" ? 3 : 2,
        propSpeed: m.impact === "high" ? 2.5 : 1.8,
        repeatPeriod: m.impact === "high" ? 1400 : 2200,
      }));

      globe = Globe()(node)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor(TEAL)
        .atmosphereAltitude(0.22)
        .globeMaterial(material)
        .ringsData(rings)
        .ringColor((d) => (t) => `${d.color}${Math.floor((1 - t) * 110).toString(16).padStart(2, "0")}`)
        .ringMaxRadius("maxR")
        .ringPropagationSpeed("propSpeed")
        .ringRepeatPeriod("repeatPeriod")
        .width(node.clientWidth)
        .height(node.clientHeight);

      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.3;
      globe.controls().enableZoom = false;
      globe.controls().enablePan = false;
      globe.pointOfView({ lat: 20, lng: -40, altitude: 2.5 }, 0);
      globeRef.current = globe;

      // Add markers progressively
      const allMarkers = markers;
      globe.htmlElementsData([])
        .htmlElement((d) => {
          const el = document.createElement("div");
          el.className = `mx-land-marker mx-land-marker-${d.impact} mx-land-marker-pop`;
          el.innerHTML = `<div class="mx-land-marker-dot"></div>`;
          return el;
        })
        .htmlAltitude(0.01);

      // Progressive marker reveal
      let shown = 0;
      const revealInterval = setInterval(() => {
        shown++;
        if (shown > allMarkers.length) {
          clearInterval(revealInterval);
          return;
        }
        globe.htmlElementsData(allMarkers.slice(0, shown));
      }, 200);

      const onResize = () => {
        if (globeRef.current && node) {
          globeRef.current.width(node.clientWidth).height(node.clientHeight);
        }
      };
      window.addEventListener("resize", onResize);

      // Cleanup
      node._cleanup = () => {
        window.removeEventListener("resize", onResize);
        clearInterval(revealInterval);
      };
    };
    init();

    return () => {
      disposed = true;
      if (node && node._cleanup) node._cleanup();
    };
  }, []);

  return (
    <section className="mx-land-globe-section" ref={sectionRef}>
      <div className="mx-land-globe-wrap" ref={containerRef} />
      <div
        className="mx-land-globe-overlay"
        style={{ opacity: 1 - progress * 0.3 }}
      />
      <div
        ref={textRef}
        className={`mx-land-globe-text ${textRevealed ? "mx-land-globe-text--in" : ""}`}
      >
        <h2>Every economic event. Every country. One view.</h2>
        <p>
          Our interactive globe tracks 195 countries and 500 monthly events so you
          always know what is moving the markets.
        </p>
      </div>
      <div className="mx-land-progress-bar">
        <div className="mx-land-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>
    </section>
  );
}

/* ================================================================ */
/*  FEATURE CARDS SECTION                                           */
/* ================================================================ */
function FeatureCardsSection() {
  const cards = [
    {
      icon: Zap,
      title: "Pre-Event NQ/ES Briefings",
      desc: "Know the exact price levels to watch before every high impact release. Not signals. Intelligence.",
    },
    {
      icon: Globe2,
      title: "Global Impact Radar",
      desc: "See which regions are beating expectations and which are missing. The surprise index that hedge funds use, built for retail.",
    },
    {
      icon: Shield,
      title: "Central Bank Intelligence",
      desc: "Fed, BOE, ECB, BOJ — their current stance, next meeting, and what it means for your trades. All in one place.",
    },
  ];

  return (
    <section className="mx-land-features">
      <div className="mx-land-features-inner">
        {cards.map((card, i) => (
          <FeatureCard key={i} card={card} index={i} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ card, index }) {
  const [ref, inView] = useInView(0.2);
  return (
    <div
      ref={ref}
      className={`mx-land-feature-card ${inView ? "mx-land-feature-card--in" : ""}`}
      style={{ transitionDelay: `${index * 0.15}s` }}
    >
      <div className="mx-land-feature-icon">
        <card.icon size={22} />
      </div>
      <h3 className="mx-land-feature-title">{card.title}</h3>
      <p className="mx-land-feature-desc">{card.desc}</p>
    </div>
  );
}

/* ================================================================ */
/*  STATS SECTION                                                   */
/* ================================================================ */
function StatsSection() {
  const stats = [
    { value: 195, suffix: "+", label: "Countries" },
    { value: 500, suffix: "+", label: "Monthly Events" },
    { value: 14, suffix: "", label: "Asset Classes" },
    { value: 0, suffix: "", label: "Real-time Data", isText: true },
  ];

  return (
    <section className="mx-land-stats">
      <div className="mx-land-stats-grid-bg" />
      <h2 className="mx-land-stats-title">Built different.</h2>
      <div className="mx-land-stats-row">
        {stats.map((s, i) => (
          <div key={i} className="mx-land-stat">
            <div className="mx-land-stat-num">
              {s.isText ? (
                <span className="mx-land-stat-live">Real-time</span>
              ) : (
                <AnimatedCounter target={s.value} suffix={s.suffix} />
              )}
            </div>
            <div className="mx-land-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <ScrollingTicker />
    </section>
  );
}

function ScrollingTicker() {
  const items = allEvents;
  return (
    <div className="mx-land-ticker-wrap">
      <div className="mx-land-ticker-track">
        {items.map((ev) => (
          <div key={`a-${ev.id}`} className="mx-land-ticker-item">
            <span className="mx-land-ticker-flag">{ev.flag}</span>
            <span className="mx-land-ticker-name">{ev.name}</span>
            <span className="mx-land-ticker-time">{ev.time} GMT</span>
            <span
              className="mx-land-ticker-impact"
              style={{ background: IC[ev.impact], boxShadow: `0 0 6px ${IC[ev.impact]}` }}
            />
          </div>
        ))}
        {items.map((ev) => (
          <div key={`b-${ev.id}`} className="mx-land-ticker-item">
            <span className="mx-land-ticker-flag">{ev.flag}</span>
            <span className="mx-land-ticker-name">{ev.name}</span>
            <span className="mx-land-ticker-time">{ev.time} GMT</span>
            <span
              className="mx-land-ticker-impact"
              style={{ background: IC[ev.impact], boxShadow: `0 0 6px ${IC[ev.impact]}` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================ */
/*  PHONE MOCKUP SECTION                                            */
/* ================================================================ */
function PhoneMockupSection({ onEnter }) {
  const [ref, inView] = useInView(0.2);
  const bullets = [
    "A volatility verdict for the day",
    "Exact windows to avoid trading",
    "NQ/ES setups for every major release",
  ];

  return (
    <section className="mx-land-phone-section" ref={ref}>
      <div className="mx-land-phone-left">
        <div className={`mx-land-phone-mockup ${inView ? "mx-land-phone-mockup--in" : ""}`}>
          <div className="mx-land-phone-screen">
            <div className="mx-land-phone-header">
              <div className="mx-land-phone-logo">Meri<span>dex</span></div>
            </div>
            <div className="mx-land-phone-body">
              <div className="mx-land-phone-card">
                <div className="mx-land-phone-card-title">Today's Verdict</div>
                <div className="mx-land-phone-card-val">High Volatility</div>
                <div className="mx-land-phone-card-bar">
                  <div className="mx-land-phone-card-bar-fill" style={{ width: "78%" }} />
                </div>
              </div>
              <div className="mx-land-phone-card">
                <div className="mx-land-phone-card-title">Key Events</div>
                <div className="mx-land-phone-event-row">
                  <span>🇺🇸</span>
                  <span>CPI m/m</span>
                  <span className="mx-land-phone-event-time">08:30</span>
                </div>
                <div className="mx-land-phone-event-row">
                  <span>🇬🇧</span>
                  <span>GDP m/m</span>
                  <span className="mx-land-phone-event-time">07:00</span>
                </div>
                <div className="mx-land-phone-event-row">
                  <span>🇨🇳</span>
                  <span>CPI y/y</span>
                  <span className="mx-land-phone-event-time">02:00</span>
                </div>
              </div>
              <div className="mx-land-phone-card">
                <div className="mx-land-phone-card-title">NQ/ES Setup</div>
                <div className="mx-land-phone-setup-val">Long bias above 18,200</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-land-phone-right">
        <h2 className={`mx-land-phone-headline ${inView ? "mx-land-phone-headline--in" : ""}`}>
          Your morning briefing.
          <br />
          Before the market opens.
        </h2>
        <ul className="mx-land-phone-bullets">
          {bullets.map((b, i) => (
            <li
              key={i}
              className={`mx-land-phone-bullet ${inView ? "mx-land-phone-bullet--in" : ""}`}
              style={{ transitionDelay: `${0.2 + i * 0.15}s` }}
            >
              <span className="mx-land-phone-bullet-dot" />
              {b}
            </li>
          ))}
        </ul>
        <div className={`mx-land-phone-cta ${inView ? "mx-land-phone-cta--in" : ""}`}>
          Join 10,000 traders already using Meridex
        </div>
        <button className="mx-land-btn mx-land-btn--primary" onClick={onEnter}>
          Start Free
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

/* ================================================================ */
/*  FINAL SECTION                                                   */
/* ================================================================ */
function FinalSection({ onEnter }) {
  const [ref, inView] = useInView(0.3);
  return (
    <section className="mx-land-final" ref={ref}>
      <div className="mx-land-final-glow" />
      <div className={`mx-land-final-content ${inView ? "mx-land-final-content--in" : ""}`}>
        <h2 className="mx-land-final-headline">Stop reacting. Start preparing.</h2>
        <p className="mx-land-final-sub">
          Meridex gives you the intelligence layer that was previously only available
          to institutional traders.
        </p>
        <button className="mx-land-btn mx-land-btn--primary mx-land-btn--lg" onClick={onEnter}>
          Enter the Platform
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

/* ================================================================ */
/*  SCROLL PROGRESS INDICATOR                                      */
/* ================================================================ */
function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="mx-land-scroll-progress">
      <div className="mx-land-scroll-progress-fill" style={{ scaleY: progress }} />
    </div>
  );
}

/* ================================================================ */
/*  SHARED GLOBE UTILS (duplicated from useMeridexGlobe for independence) */
/* ================================================================ */
function getSunCoords() {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const dayOfYear = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000);
  const declination = 23.44 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
  const lng = -(hours - 12) * 15;
  return { lat: declination, lng };
}

function latLngToWorldVec(lat, lng) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
}

const TEX = {
  day: "https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/2_no_clouds_4k.jpg",
  night: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png",
  spec: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
};

const dayNightVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vObjectNormal;
  void main() {
    vUv = uv;
    vObjectNormal = normalize(normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const dayNightFragment = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform vec3 sunDirection;
  uniform float nightBoost;
  varying vec2 vUv;
  varying vec3 vObjectNormal;
  void main() {
    vec3 N = normalize(vObjectNormal);
    vec3 L = normalize(sunDirection);
    float cosAngle = dot(N, L);
    float latFromEquator = abs(vUv.y - 0.5) * 2.0;
    float polarFactor = 1.0 - smoothstep(0.78, 0.96, latFromEquator);
    vec3 polarTint = vec3(0.02, 0.04, 0.06);
    float dayMix = smoothstep(-0.10, 0.25, cosAngle);
    vec3 day = texture2D(dayMap, vUv).rgb;
    float waterMask = texture2D(specMap, vUv).r;
    vec3 litDay = day * (0.38 + 0.85 * max(cosAngle, 0.0));
    float spec = pow(max(cosAngle, 0.0), 32.0) * waterMask * 0.55;
    litDay += vec3(spec * 1.1, spec * 1.05, spec * 0.95);
    vec3 night = texture2D(nightMap, vUv).rgb;
    night = night * nightBoost;
    night *= vec3(1.22, 1.02, 0.74);
    night += vec3(0.012, 0.018, 0.030);
    vec3 color = mix(night, litDay, dayMix);
    float terminator = 1.0 - abs(cosAngle);
    float rim = pow(terminator, 4.0) * smoothstep(-0.25, 0.05, cosAngle);
    color += vec3(0.0, 0.45, 0.55) * rim * 0.30;
    color = mix(polarTint, color, polarFactor);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function loadTexture(THREE, url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (tex) => {
      if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      resolve(tex);
    }, undefined, reject);
  });
}

/* ================================================================ */
/*  MAIN HOME PAGE                                                  */
/* ================================================================ */
export function HomePage() {
  const [opening, setOpening] = useState(true);
  const [flashing, setFlashing] = useState(false);
  const navigate = useNavigate();

  const handleEnter = useCallback(() => {
    setFlashing(true);
    setTimeout(() => navigate("/dashboard"), 600);
  }, [navigate]);

  if (opening) {
    return (
      <>
        <OpeningScene onDone={() => setOpening(false)} />
        {flashing && <div className="mx-land-flash" />}
      </>
    );
  }

  return (
    <div className="mx-land-root">
      {flashing && <div className="mx-land-flash" />}
      <ScrollProgress />
      <HeroSection onEnter={handleEnter} />
      <GlobeAssemblySection />
      <FeatureCardsSection />
      <StatsSection />
      <PhoneMockupSection onEnter={handleEnter} />
      <FinalSection onEnter={handleEnter} />
    </div>
  );
}
