import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { EVENTS, IC } from "../data";

/* ------------------------------------------------------------------ */
/*  SUN  MATH  (shared with useMeridexGlobe)                          */
/* ------------------------------------------------------------------ */
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
  const x = -Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

/* ------------------------------------------------------------------ */
/*  TEXTURES                                                          */
/* ------------------------------------------------------------------ */
const TEX = {
  day:    "https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/2_no_clouds_4k.jpg",
  night:  "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png",
  clouds: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png",
  bump:   "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
  spec:   "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
};

/* ------------------------------------------------------------------ */
/*  SHADERS                                                           */
/* ------------------------------------------------------------------ */
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
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 16;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

/* ------------------------------------------------------------------ */
/*  MARKER  BUILDER                                                   */
/* ------------------------------------------------------------------ */
function buildMarker(d) {
  const root = document.createElement("div");
  root.className = `mx-cine-marker mx-cine-marker-${d.impact}`;
  root.dataset.code = d.code;
  root.style.cursor = "pointer";
  root.style.pointerEvents = "auto";

  const pulse = document.createElement("div");
  pulse.className = "mx-cine-marker-pulse";
  root.appendChild(pulse);

  const dot = document.createElement("div");
  dot.className = "mx-cine-marker-dot";
  root.appendChild(dot);

  return root;
}

/* ------------------------------------------------------------------ */
/*  STARFIELD  (Three.js points)                                      */
/* ------------------------------------------------------------------ */
function createStarfield(THREE, count = 6000) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = 800 + Math.random() * 400;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const tint = Math.random();
    colors[i * 3]     = 0.6 + tint * 0.4;
    colors[i * 3 + 1] = 0.7 + tint * 0.3;
    colors[i * 3 + 2] = 1.0;

    sizes[i] = 0.5 + Math.random() * 1.5;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("size",     new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  return new THREE.Points(geo, mat);
}

/* ------------------------------------------------------------------ */
/*  LIVE  CLOCK                                                       */
/* ------------------------------------------------------------------ */
function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, "0");
      const m = String(now.getUTCMinutes()).padStart(2, "0");
      const s = String(now.getUTCSeconds()).padStart(2, "0");
      setTime(`${h}:${m}:${s} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="mx-cine-clock">{time}</span>;
}

/* ------------------------------------------------------------------ */
/*  EVENT  COUNTER                                                    */
/* ------------------------------------------------------------------ */
function EventCounter() {
  const count = Object.values(EVENTS).reduce((sum, ev) => sum + ev.items.length, 0);
  return (
    <div className="mx-cine-counter">
      <span className="mx-cine-counter-dot" />
      <span>{count} events today</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LEGEND                                                            */
/* ------------------------------------------------------------------ */
function Legend() {
  return (
    <div className="mx-cine-legend">
      <div className="mx-cine-legend-row">
        <span className="mx-cine-legend-dot" style={{ background: IC.high, boxShadow: `0 0 8px ${IC.high}` }} />
        <span>High</span>
      </div>
      <div className="mx-cine-legend-row">
        <span className="mx-cine-legend-dot" style={{ background: IC.medium, boxShadow: `0 0 8px ${IC.medium}` }} />
        <span>Medium</span>
      </div>
      <div className="mx-cine-legend-row">
        <span className="mx-cine-legend-dot" style={{ background: IC.low, boxShadow: `0 0 8px ${IC.low}` }} />
        <span>Low</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  COUNTRY  PANEL  (glassmorphism slide-in)                          */
/* ------------------------------------------------------------------ */
function CountryPanel({ code, onClose }) {
  const ev = EVENTS[code];
  if (!ev) return null;

  const highest = ev.items.reduce((max, item) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return rank[item.impact] > rank[max.impact] ? item : max;
  }, ev.items[0]);

  return (
    <div className="mx-cine-panel-overlay" onClick={onClose}>
      <div className="mx-cine-panel" onClick={(e) => e.stopPropagation()}>
        <button className="mx-cine-panel-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="mx-cine-panel-header">
          <span className="mx-cine-panel-flag">{ev.flag}</span>
          <div>
            <h2 className="mx-cine-panel-title">{ev.name}</h2>
            <p className="mx-cine-panel-sub">{ev.items.length} event{ev.items.length > 1 ? "s" : ""} today</p>
          </div>
        </div>

        <div className="mx-cine-panel-events">
          {ev.items.map((item, i) => (
            <div key={i} className="mx-cine-panel-event">
              <div className="mx-cine-panel-event-top">
                <span className="mx-cine-panel-time">{item.time} GMT</span>
                <span
                  className="mx-cine-panel-badge"
                  style={{
                    background: IC[item.impact] + "20",
                    color: IC[item.impact],
                    border: `1px solid ${IC[item.impact]}40`,
                  }}
                >
                  {item.impact}
                </span>
              </div>
              <div className="mx-cine-panel-event-name">{item.name}</div>
              <div className="mx-cine-panel-event-brief">{item.desc}</div>
              {(item.forecast || item.prev) && (
                <div className="mx-cine-panel-event-nums">
                  {item.forecast && <span>Forecast: {item.forecast}</span>}
                  {item.prev && <span>Previous: {item.prev}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mx-cine-panel-briefing">
          <div className="mx-cine-panel-briefing-label">Briefing</div>
          <p>
            {highest.name} at {highest.time} GMT is the key event. Markets pricing in{" "}
            {highest.forecast || "consensus"} vs prior {highest.prev || "N/A"}. Watch{" "}
            {ev.affects.slice(0, 3).join(", ")} for volatility.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HOVER  CARD                                                       */
/* ------------------------------------------------------------------ */
function HoverCard({ marker }) {
  if (!marker) return null;
  const ev = EVENTS[marker.code];
  if (!ev) return null;

  const highest = ev.items.reduce((max, item) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return rank[item.impact] > rank[max.impact] ? item : max;
  }, ev.items[0]);

  return (
    <div className="mx-cine-hover-card" style={{ opacity: 1 }}>
      <div className="mx-cine-hover-flag">{ev.flag}</div>
      <div className="mx-cine-hover-name">{ev.name}</div>
      <div className="mx-cine-hover-count">{ev.items.length} event{ev.items.length > 1 ? "s" : ""}</div>
      <div className="mx-cine-hover-key">
        <span
          className="mx-cine-hover-badge"
          style={{ color: IC[highest.impact] }}
        >
          {highest.name}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN  CINEMATIC  HOME  PAGE                                       */
/* ------------------------------------------------------------------ */
export function HomePage() {
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [hoveredCode, setHoveredCode] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const navigate = useNavigate();

  const globeInstanceRef = useRef(null);
  const cameraRef = useRef({ lat: 20, lng: -40, altitude: 2.8 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const isZoomedRef = useRef(false);
  const transitionRef = useRef({ active: false, t: 0, from: null, to: null, onDone: null });

  /* ── Globe init ─────────────────────────────────────────────── */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    let disposed = false;
    let cloudMesh = null;
    let materialRef = null;
    let sunInterval = null;
    let cloudRAF = null;
    let stars = null;
    let animFrame = null;

    const init = async () => {
      const [Globe, THREE] = await Promise.all([
        import("globe.gl").then((m) => m.default),
        import("three"),
      ]);
      if (disposed) return;

      const [dayTex, nightTex, specTex, bumpTex, cloudsTex] = await Promise.all([
        loadTexture(THREE, TEX.day),
        loadTexture(THREE, TEX.night),
        loadTexture(THREE, TEX.spec),
        loadTexture(THREE, TEX.bump),
        loadTexture(THREE, TEX.clouds),
      ]);
      if (disposed) return;

      const markers = Object.entries(EVENTS).map(([code, ev]) => ({
        lat: ev.lat,
        lng: ev.lon,
        code,
        impact: ev.impact,
        name: ev.name,
        flag: ev.flag,
        count: ev.items.length,
      }));

      const arcs = Object.entries(EVENTS)
        .filter(([, ev]) => ev.impact !== "low")
        .map(([code, ev]) => ({
          id: `${code}-arc`,
          startLat: ev.lat,
          startLng: ev.lon,
          endLat: ev.lat + (Math.random() - 0.5) * 40,
          endLng: ev.lon + (Math.random() - 0.5) * 40,
          color: [IC[ev.impact] + "00", IC[ev.impact], IC[ev.impact] + "00"],
        }));

      const rings = markers.map((m) => ({
        lat: m.lat,
        lng: m.lng,
        color: IC[m.impact],
        maxR: m.impact === "high" ? 4.5 : m.impact === "medium" ? 3 : 2,
        propSpeed: m.impact === "high" ? 2.5 : 1.8,
        repeatPeriod: m.impact === "high" ? 1400 : 2200,
      }));

      const sunCoords = getSunCoords();
      const sun = latLngToWorldVec(sunCoords.lat, sunCoords.lng);

      const customMaterial = new THREE.ShaderMaterial({
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

      const g = Globe()(node)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor("#00E5C7")
        .atmosphereAltitude(0.22)
        .htmlElementsData(markers)
        .htmlElement((d) => buildMarker(d))
        .htmlAltitude(0.01)
        .arcsData(arcs)
        .arcColor("color")
        .arcAltitude(0.25)
        .arcStroke(0.4)
        .arcDashLength(0.4)
        .arcDashGap(0.6)
        .arcDashAnimateTime(2200)
        .ringsData(rings)
        .ringColor((d) => (t) => `${d.color}${Math.floor((1 - t) * 110).toString(16).padStart(2, "0")}`)
        .ringMaxRadius("maxR")
        .ringPropagationSpeed("propSpeed")
        .ringRepeatPeriod("repeatPeriod")
        .width(window.innerWidth)
        .height(window.innerHeight);

      g.globeMaterial(customMaterial);
      materialRef = customMaterial;
      globeInstanceRef.current = g;

      const scene = g.scene();
      const globeRadius = 100;

      /* Clouds */
      cloudMesh = new THREE.Mesh(
        new THREE.SphereGeometry(globeRadius * 1.015, 96, 96),
        new THREE.MeshPhongMaterial({
          map: cloudsTex,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
      );
      scene.add(cloudMesh);

      /* Starfield */
      stars = createStarfield(THREE);
      scene.add(stars);

      bumpTex.colorSpace = THREE.NoColorSpace || THREE.LinearSRGBColorSpace;

      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.35;
      g.controls().enableZoom = false;
      g.controls().enablePan = false;
      g.pointOfView({ lat: 20, lng: -40, altitude: 2.8 }, 0);
      cameraRef.current = { lat: 20, lng: -40, altitude: 2.8 };

      /* Cloud drift */
      const driftClouds = () => {
        if (cloudMesh) cloudMesh.rotation.y += 0.00012;
        if (stars) stars.rotation.y += 0.00002;
        cloudRAF = requestAnimationFrame(driftClouds);
      };
      driftClouds();

      /* Sun update */
      const updateSun = () => {
        const c = getSunCoords();
        const v = latLngToWorldVec(c.lat, c.lng);
        if (materialRef) materialRef.uniforms.sunDirection.value.set(v[0], v[1], v[2]);
      };
      sunInterval = setInterval(updateSun, 30000);

      /* Marker click handler via delegation */
      const handleMarkerClick = (e) => {
        const marker = e.target.closest(".mx-cine-marker");
        if (!marker) return;
        const code = marker.dataset.code;
        if (code && EVENTS[code]) {
          handleCountryClick(code);
        }
      };
      node.addEventListener("click", handleMarkerClick);

      /* Marker hover via delegation */
      const handleMarkerOver = (e) => {
        const marker = e.target.closest(".mx-cine-marker");
        if (!marker) return;
        const code = marker.dataset.code;
        if (code && EVENTS[code] && !isZoomedRef.current) {
          setHoveredCode(code);
          /* Gently rotate to country */
          const ev = EVENTS[code];
          g.pointOfView({ lat: ev.lat, lng: ev.lon, altitude: 2.2 }, 1200);
        }
      };
      const handleMarkerOut = (e) => {
        const marker = e.target.closest(".mx-cine-marker");
        if (!marker) return;
        if (!isZoomedRef.current) {
          setHoveredCode(null);
          g.pointOfView({ lat: 20, lng: -40, altitude: 2.8 }, 1800);
        }
      };
      node.addEventListener("mouseover", handleMarkerOver);
      node.addEventListener("mouseout", handleMarkerOut);

      /* Cleanup refs */
      node._cleanup = () => {
        node.removeEventListener("click", handleMarkerClick);
        node.removeEventListener("mouseover", handleMarkerOver);
        node.removeEventListener("mouseout", handleMarkerOut);
      };

      setLoaded(true);
    };

    /* Mouse parallax + smooth camera */
    const onMouseMove = (e) => {
      targetMouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    const smoothLoop = () => {
      const g = globeInstanceRef.current;
      if (g && !isZoomedRef.current && !transitionRef.current.active) {
        /* Lerp mouse */
        mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.04;
        mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.04;

        /* Subtle tilt based on mouse position */
        const base = cameraRef.current;
        const tiltLat = base.lat - mouseRef.current.y * 8;
        const tiltLng = base.lng - mouseRef.current.x * 12;
        g.pointOfView({ lat: tiltLat, lng: tiltLng, altitude: base.altitude }, 0);
      }

      /* Transition animation */
      if (transitionRef.current.active) {
        const tr = transitionRef.current;
        tr.t += 0.012;
        if (tr.t >= 1) {
          tr.t = 1;
          tr.active = false;
          if (tr.onDone) tr.onDone();
        }
        const ease = 1 - Math.pow(1 - tr.t, 3); /* ease-out-cubic */
        const lat = tr.from.lat + (tr.to.lat - tr.from.lat) * ease;
        const lng = tr.from.lng + (tr.to.lng - tr.from.lng) * ease;
        const alt = tr.from.altitude + (tr.to.altitude - tr.from.altitude) * ease;
        g.pointOfView({ lat, lng, altitude: alt }, 0);
        cameraRef.current = { lat, lng, altitude: alt };
      }

      animFrame = requestAnimationFrame(smoothLoop);
    };
    smoothLoop();

    const onResize = () => {
      if (globeInstanceRef.current) {
        globeInstanceRef.current.width(window.innerWidth).height(window.innerHeight);
      }
    };
    window.addEventListener("resize", onResize);

    init();

    return () => {
      disposed = true;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      if (node && node._cleanup) node._cleanup();
      if (sunInterval) clearInterval(sunInterval);
      if (cloudRAF) cancelAnimationFrame(cloudRAF);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Country click: zoom in ───────────────────────────────────── */
  const handleCountryClick = useCallback((code) => {
    if (isZoomedRef.current) return;
    isZoomedRef.current = true;
    setHoveredCode(null);

    const ev = EVENTS[code];
    const g = globeInstanceRef.current;
    if (!g || !ev) return;

    /* Stop auto-rotate */
    g.controls().autoRotate = false;

    /* Cinematic zoom transition */
    const from = { ...cameraRef.current };
    const to = { lat: ev.lat, lng: ev.lon, altitude: 1.35 };
    transitionRef.current = { active: true, t: 0, from, to, onDone: () => setSelectedCode(code) };
  }, []);

  /* ── Close panel: zoom out ────────────────────────────────────── */
  const handleClosePanel = useCallback(() => {
    const g = globeInstanceRef.current;
    if (!g) return;

    setSelectedCode(null);

    const from = { ...cameraRef.current };
    const to = { lat: 20, lng: -40, altitude: 2.8 };
    transitionRef.current = {
      active: true,
      t: 0,
      from,
      to,
      onDone: () => {
        isZoomedRef.current = false;
        g.controls().autoRotate = true;
      },
    };
  }, []);

  /* ── Enter Platform transition ────────────────────────────────── */
  const handleEnter = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);

    const g = globeInstanceRef.current;
    if (!g) {
      navigate("/dashboard");
      return;
    }

    g.controls().autoRotate = false;
    const from = { ...cameraRef.current };
    const to = { lat: from.lat, lng: from.lng, altitude: 0.3 };
    transitionRef.current = {
      active: true,
      t: 0,
      from,
      to,
      onDone: () => {
        navigate("/dashboard");
      },
    };
  }, [navigate, transitioning]);

  return (
    <div className="mx-cine-root">
      {/* Globe canvas fills entire screen */}
      <div ref={containerRef} className="mx-cine-globe" data-testid="hero-globe" />

      {/* Loading overlay */}
      {!loaded && (
        <div className="mx-cine-loader">
          <div className="mx-cine-loader-text">
            Meri<span>dex</span>
          </div>
          <div className="mx-cine-loader-line" />
        </div>
      )}

      {/* Vignette overlay */}
      <div className="mx-cine-vignette" />

      {/* Center logo + tagline */}
      <div className={`mx-cine-center ${selectedCode ? "mx-cine-center--hidden" : ""}`}>
        <div className="mx-cine-logo">
          <div className="mx-cine-logo-mark">M</div>
          <h1 className="mx-cine-logo-text">
            Meri<span>dex</span>
          </h1>
        </div>
        <p className="mx-cine-tagline">Know what moves the markets. Before they move.</p>
        <div className="mx-cine-actions">
          <button className="mx-cine-btn mx-cine-btn--primary" onClick={handleEnter}>
            Enter Platform
          </button>
          <button
            className="mx-cine-btn mx-cine-btn--ghost"
            onClick={() => {
              const g = globeInstanceRef.current;
              if (g) g.controls().autoRotateSpeed = g.controls().autoRotateSpeed === 0 ? 0.35 : 0;
            }}
          >
            {globeInstanceRef.current?.controls?.autoRotateSpeed === 0 ? "Resume" : "Explore Globe"}
          </button>
        </div>
      </div>

      {/* Top-right: live event counter */}
      <div className="mx-cine-tr">
        <EventCounter />
      </div>

      {/* Bottom-left: UTC clock */}
      <div className="mx-cine-bl">
        <LiveClock />
      </div>

      {/* Bottom-right: legend */}
      <div className="mx-cine-br">
        <Legend />
      </div>

      {/* Hover card */}
      {hoveredCode && !selectedCode && (
        <HoverCard marker={{ code: hoveredCode }} />
      )}

      {/* Country detail panel */}
      {selectedCode && (
        <CountryPanel code={selectedCode} onClose={handleClosePanel} />
      )}

      {/* Cinematic transition overlay */}
      {transitioning && <div className="mx-cine-fade-overlay" />}
    </div>
  );
}
