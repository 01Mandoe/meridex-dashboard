import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useScroll,
  useTransform,
  useSpring,
  motion,
} from "framer-motion";
import { Zap, Radar, Landmark, ArrowRight, ChevronDown } from "lucide-react";
import { EVENTS, IC } from "../data";
import { AnimatedCounter } from "../components/AnimatedCounter";

const ACCENT = "#00e5c7";
const ACCENT_DARK = "#1aa994";

/* ================================================================ */
/*  GLOBE  UTILS                                                    */
/* ================================================================ */
function getSunCoords() {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
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
  bump: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
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
/*  SCROLL  GLOBE  — single persistent globe.gl driven by scroll    */
/* ================================================================ */
function ScrollGlobe({ scrollYProgress, mouseRef }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const materialRef = useRef(null);
  const cloudMeshRef = useRef(null);
  const starsRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const altitude = useSpring(
    useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [2.8, 1.8, 1.5, 2.2, 3.5]),
    { stiffness: 60, damping: 20, mass: 0.8 },
  );
  const lat = useSpring(
    useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [20, 10, 5, 15, 30]),
    { stiffness: 50, damping: 18 },
  );
  const lng = useSpring(
    useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [-40, -20, 0, -30, -60]),
    { stiffness: 50, damping: 18 },
  );
  const autoRotateSpeed = useTransform(scrollYProgress, [0, 0.5, 1], [0.35, 1.2, 0.5]);

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

      const [dayTex, nightTex, specTex, , cloudsTex] = await Promise.all([
        loadTexture(THREE, TEX.day),
        loadTexture(THREE, TEX.night),
        loadTexture(THREE, TEX.spec),
        loadTexture(THREE, TEX.bump),
        loadTexture(THREE, TEX.clouds),
      ]);
      if (disposed) return;

      const sunCoords = getSunCoords();
      const sun = latLngToWorldVec(sunCoords.lat, sunCoords.lng);

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
      materialRef.current = material;

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

      const g = Globe()(node)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor(ACCENT)
        .atmosphereAltitude(0.22)
        .globeMaterial(material)
        .htmlElementsData(markers)
        .htmlElement((d) => {
          const el = document.createElement("div");
          el.className = `mx-scroll-marker mx-scroll-marker-${d.impact}`;
          el.innerHTML = `<div class="mx-scroll-marker-dot"></div><div class="mx-scroll-marker-pulse"></div>`;
          return el;
        })
        .htmlAltitude(0.01)
        .ringsData(rings)
        .ringColor((d) => (t) => `${d.color}${Math.floor((1 - t) * 110).toString(16).padStart(2, "0")}`)
        .ringMaxRadius("maxR")
        .ringPropagationSpeed("propSpeed")
        .ringRepeatPeriod("repeatPeriod")
        .arcsData([])
        .arcColor("color")
        .arcAltitude(0.3)
        .arcStroke(0.5)
        .arcDashLength(0.4)
        .arcDashGap(0.6)
        .arcDashAnimateTime(2000)
        .width(node.clientWidth)
        .height(node.clientHeight);

      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.35;
      g.controls().enableZoom = false;
      g.controls().enablePan = false;
      g.pointOfView({ lat: 20, lng: -40, altitude: 2.8 }, 0);
      globeRef.current = g;

      // Real cloud layer using actual cloud texture
      const scene = g.scene();
      const globeRadius = 100;
      const cloudMesh = new THREE.Mesh(
        new THREE.SphereGeometry(globeRadius * 1.015, 96, 96),
        new THREE.MeshPhongMaterial({
          map: cloudsTex,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
        }),
      );
      scene.add(cloudMesh);
      cloudMeshRef.current = cloudMesh;

      // Starfield
      const starGeo = new THREE.BufferGeometry();
      const starCount = 4000;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 800 + Math.random() * 400;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i * 3 + 2] = r * Math.cos(phi);
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
        color: 0xffffff, size: 1.2, transparent: true, opacity: 0.7, sizeAttenuation: true,
      }));
      scene.add(stars);
      starsRef.current = stars;

      const sunInterval = setInterval(() => {
        const c = getSunCoords();
        const v = latLngToWorldVec(c.lat, c.lng);
        if (materialRef.current) materialRef.current.uniforms.sunDirection.value.set(v[0], v[1], v[2]);
      }, 30000);

      const onResize = () => {
        if (globeRef.current && node) {
          globeRef.current.width(node.clientWidth).height(node.clientHeight);
        }
      };
      window.addEventListener("resize", onResize);

      setLoaded(true);

      node._cleanup = () => {
        window.removeEventListener("resize", onResize);
        clearInterval(sunInterval);
      };
    };
    init();

    return () => {
      disposed = true;
      if (node && node._cleanup) node._cleanup();
    };
  }, []);

  // Drive globe POV from scroll + mouse parallax
  useEffect(() => {
    let raf = null;
    const update = () => {
      const g = globeRef.current;
      if (g && loaded) {
        const baseLat = lat.get();
        const baseLng = lng.get();
        const baseAlt = altitude.get();
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        g.pointOfView({
          lat: baseLat - my * 6,
          lng: baseLng - mx * 10,
          altitude: baseAlt,
        }, 0);
        g.controls().autoRotateSpeed = autoRotateSpeed.get();

        // Real cloud opacity — ramps in Scene 2, stays through Scene 4
        if (cloudMeshRef.current) {
          const p = scrollYProgress.get();
          let cloudOp = 0;
          if (p > 0.12 && p < 0.5) cloudOp = ((p - 0.12) / 0.38) * 0.45;
          else if (p >= 0.5 && p < 0.88) cloudOp = 0.45;
          else if (p >= 0.88) cloudOp = Math.max(0, 0.45 - (p - 0.88) * 4);
          cloudMeshRef.current.material.opacity = cloudOp;
          cloudMeshRef.current.rotation.y += 0.0003 + p * 0.001;
        }

        // Stars fade out entering atmosphere
        if (starsRef.current) {
          const p = scrollYProgress.get();
          starsRef.current.material.opacity = Math.max(0, 0.7 - p * 1.4);
        }
      }
      raf = requestAnimationFrame(update);
    };
    update();
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [loaded, scrollYProgress, lat, lng, altitude, autoRotateSpeed, mouseRef]);

  // Toggle arcs at Scene 4
  useEffect(() => {
    if (!loaded) return undefined;
    const buildArcs = () => {
      const entries = Object.entries(EVENTS);
      const arcs = [];
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const [, evA] = entries[i];
          const [, evB] = entries[j];
          if (evA.impact !== "low" || evB.impact !== "low") {
            arcs.push({
              startLat: evA.lat, startLng: evA.lon,
              endLat: evB.lat, endLng: evB.lon,
              color: [`${ACCENT}00`, ACCENT, `${ACCENT}00`],
            });
          }
        }
      }
      return arcs;
    };

    const unsub = scrollYProgress.on("change", (p) => {
      const g = globeRef.current;
      if (!g) return;
      if (p > 0.65 && p < 0.92) {
        g.arcsData(buildArcs());
      } else {
        g.arcsData([]);
      }
    });
    return () => unsub();
  }, [loaded, scrollYProgress]);

  return (
    <div
      ref={containerRef}
      className="mx-scroll-globe-container"
      style={{ opacity: loaded ? 1 : 0, transition: "opacity 1.2s ease" }}
    />
  );
}

/* ================================================================ */
/*  STARFIELD  OVERLAY  — CSS stars that fade out entering atmo    */
/* ================================================================ */
function StarfieldOverlay({ scrollYProgress }) {
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.35], [0.4, 0.2, 0]);
  const stars = useRef(
    Array.from({ length: 100 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.5 + Math.random() * 1.5,
      delay: Math.random() * 3,
    })),
  ).current;
  return (
    <motion.div className="mx-scroll-stars" style={{ opacity }}>
      {stars.map((s, i) => (
        <div
          key={i}
          className="mx-scroll-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </motion.div>
  );
}

/* ================================================================ */
/*  BRAND  LOGO  — top-left, matches sidebar logo                   */
/* ================================================================ */
function BrandLogo() {
  return (
    <div className="mx-scroll-brand">
      <div className="mx-scroll-brand-mark">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <ellipse cx="8" cy="8" rx="2.8" ry="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M1.5 8h13" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </div>
      <span className="mx-scroll-brand-text">Meri<span>dex</span></span>
    </div>
  );
}

/* ================================================================ */
/*  SCROLL  INDICATOR  — cinematic animated mouse/arrow             */
/* ================================================================ */
function ScrollIndicator({ scrollYProgress }) {
  const opacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);
  return (
    <motion.div className="mx-scroll-indicator" style={{ opacity }}>
      <span>Scroll</span>
      <div className="mx-scroll-indicator-track">
        <motion.div
          className="mx-scroll-indicator-dot"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

/* ================================================================ */
/*  SCENE  1  — THE OPENING                                         */
/* ================================================================ */
function Scene1({ scrollYProgress, onEnter }) {
  const contentOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.08], [0, -30]);

  return (
    <section className="mx-scroll-scene mx-scroll-scene1">
      <motion.div
        className="mx-scroll-hero-content"
        style={{ opacity: contentOpacity, y: contentY }}
      >
        <div className="mx-scroll-hero-eyebrow">
          <span className="mx-scroll-hero-eyebrow-dot" />
          Global Economic Intelligence
        </div>
        <h1 className="mx-scroll-headline">
          Markets move fast.
          <br />
          <span className="mx-scroll-headline-accent">We move faster.</span>
        </h1>
        <p className="mx-scroll-subtitle">
          Real-time global economic intelligence built for serious futures traders.
        </p>
        <div className="mx-scroll-btns">
          <button className="mx-scroll-btn mx-scroll-btn--primary" onClick={onEnter}>
            Enter Meridex
            <ArrowRight size={15} />
          </button>
          <button className="mx-scroll-btn mx-scroll-btn--ghost">
            See how it works
          </button>
        </div>
      </motion.div>

      <ScrollIndicator scrollYProgress={scrollYProgress} />
    </section>
  );
}

/* ================================================================ */
/*  SCENE  2  — FLYING THROUGH THE ATMOSPHERE                       */
/* ================================================================ */
function Scene2({ scrollYProgress }) {
  const opacity = useTransform(scrollYProgress, [0.15, 0.25, 0.4, 0.5], [0, 1, 1, 0]);
  const x = useSpring(
    useTransform(scrollYProgress, [0.15, 0.3], [-40, 0]),
    { stiffness: 60, damping: 20 },
  );

  return (
    <motion.section
      className="mx-scroll-scene mx-scroll-scene2"
      style={{ opacity }}
    >
      <motion.div className="mx-scroll-scene2-text" style={{ x }}>
        <h2 className="mx-scroll-scene2-headline">See the world differently.</h2>
        <p className="mx-scroll-scene2-sub">
          Every economic event on the planet. Visualised in real time.
        </p>
      </motion.div>
    </motion.section>
  );
}

/* ================================================================ */
/*  SCENE  3  — ABOVE THE EARTH                                      */
/* ================================================================ */
function Scene3({ scrollYProgress }) {
  const opacity = useTransform(scrollYProgress, [0.4, 0.5, 0.65, 0.75], [0, 1, 1, 0]);

  const cards = [
    { icon: Zap, title: "Pre-Event NQ/ES Briefings", desc: "Know the exact price levels to watch before every high impact release. Not signals. Intelligence." },
    { icon: Radar, title: "Global Impact Radar", desc: "See which regions are beating expectations and which are missing. The surprise index that hedge funds use, built for retail." },
    { icon: Landmark, title: "Central Bank Intelligence", desc: "Fed, BOE, ECB, BOJ — their current stance, next meeting, and what it means for your trades. All in one place." },
  ];

  return (
    <motion.section
      className="mx-scroll-scene mx-scroll-scene3"
      style={{ opacity }}
    >
      <div className="mx-scroll-cards">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            className="mx-scroll-card"
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mx-scroll-card-icon">
              <card.icon size={20} />
            </div>
            <h3 className="mx-scroll-card-title">{card.title}</h3>
            <p className="mx-scroll-card-desc">{card.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ================================================================ */
/*  SCENE  4  — THE DATA LAYER                                       */
/* ================================================================ */
function Scene4({ scrollYProgress }) {
  const opacity = useTransform(scrollYProgress, [0.65, 0.75, 0.9, 0.95], [0, 1, 1, 0]);
  const titleY = useSpring(
    useTransform(scrollYProgress, [0.65, 0.8], [30, 0]),
    { stiffness: 60, damping: 20 },
  );

  const stats = [
    { value: 195, suffix: "+", label: "Countries" },
    { value: 500, suffix: "+", label: "Monthly Events" },
    { value: 14, suffix: "", label: "Asset Classes" },
    { value: 0, suffix: "", label: "Real-time Updates", isText: true },
  ];

  return (
    <motion.section
      className="mx-scroll-scene mx-scroll-scene4"
      style={{ opacity }}
    >
      <div className="mx-scroll-grid-bg" />
      <motion.h2 className="mx-scroll-scene4-title" style={{ y: titleY }}>
        The intelligence layer.
      </motion.h2>
      <div className="mx-scroll-stats">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            className="mx-scroll-stat"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mx-scroll-stat-num">
              {s.isText ? (
                <span className="mx-scroll-stat-live">Real-time</span>
              ) : (
                <AnimatedCounter target={s.value} suffix={s.suffix} />
              )}
            </div>
            <div className="mx-scroll-stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ================================================================ */
/*  SCENE  5  — THE CALL TO ACTION                                   */
/* ================================================================ */
function Scene5({ scrollYProgress, onEnter }) {
  const opacity = useTransform(scrollYProgress, [0.9, 1], [0, 1]);

  return (
    <motion.section
      className="mx-scroll-scene mx-scroll-scene5"
      style={{ opacity }}
    >
      <div className="mx-scroll-final-glow" />
      <motion.div
        className="mx-scroll-final-content"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="mx-scroll-final-headline">Stop reacting. Start preparing.</h2>
        <p className="mx-scroll-final-sub">
          Join 10,000 traders who see what is coming before it arrives.
        </p>
        <button className="mx-scroll-btn mx-scroll-btn--primary mx-scroll-btn--lg" onClick={onEnter}>
          Enter Meridex
          <ArrowRight size={18} />
        </button>
      </motion.div>
    </motion.section>
  );
}

/* ================================================================ */
/*  SCROLL  PROGRESS  BAR                                            */
/* ================================================================ */
function ScrollProgressBar({ scrollYProgress }) {
  const scaleY = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return <motion.div className="mx-scroll-progress-bar" style={{ scaleY }} />;
}

/* ================================================================ */
/*  MAIN  HOME  PAGE                                                 */
/* ================================================================ */
export function HomePage() {
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [fading, setFading] = useState(false);
  const navigate = useNavigate();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

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
    <div className="mx-scroll-root" ref={containerRef}>
      {fading && <div className="mx-scroll-fade-to-black" />}

      {/* Ambient background glows matching dashboard */}
      <div className="mx-scroll-ambient" />

      {/* Persistent fixed globe */}
      <div className="mx-scroll-globe-fixed">
        <ScrollGlobe scrollYProgress={scrollYProgress} mouseRef={mouseRef} />
      </div>

      {/* Starfield (pointer-events: none, won't block scroll) */}
      <StarfieldOverlay scrollYProgress={scrollYProgress} />

      {/* Vignette */}
      <div className="mx-scroll-vignette" />

      {/* Brand logo top-left */}
      <BrandLogo />

      {/* Scroll progress bar */}
      <ScrollProgressBar scrollYProgress={scrollYProgress} />

      {/* Scene overlays */}
      <Scene1 scrollYProgress={scrollYProgress} onEnter={handleEnter} />
      <Scene2 scrollYProgress={scrollYProgress} />
      <Scene3 scrollYProgress={scrollYProgress} />
      <Scene4 scrollYProgress={scrollYProgress} />
      <Scene5 scrollYProgress={scrollYProgress} onEnter={handleEnter} />
    </div>
  );
}
