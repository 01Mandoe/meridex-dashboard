import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Globe as Globe2, Activity, Bell, ChartLine as LineChart, Zap, ArrowRight, CircleCheck as CheckCircle } from "lucide-react";
import { EVENTS, IC } from "../data";

const FEATURES = [
  {
    icon: Globe2,
    title: "Global Event Tracking",
    desc: "Real-time economic calendar with 195+ countries. Visualize market-moving events on an interactive 3D globe.",
  },
  {
    icon: Activity,
    title: "Live Market Data",
    desc: "Stream live prices for major forex pairs, gold, and Bitcoin with millisecond precision.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Set price thresholds or event-based alerts. Get notified via in-app toasts or Discord webhooks.",
  },
  {
    icon: LineChart,
    title: "Impact Analysis",
    desc: "See which assets are affected by each event. Make informed decisions before the market moves.",
  },
];

const STATS = [
  { value: "195+", label: "Countries monitored" },
  { value: "24/7", label: "Real-time coverage" },
  { value: "98.7%", label: "Event accuracy" },
  { value: "10K+", label: "Active traders" },
];

// Realtime sub-solar point
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

const TEX = {
  day: "https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/2_no_clouds_4k.jpg",
  night: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png",
  clouds: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png",
  bump: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
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

function buildMarker(d) {
  const root = document.createElement("div");
  root.className = `mx-marker mx-marker-${d.impact}`;
  root.style.pointerEvents = "none";

  const pulse = document.createElement("div");
  pulse.className = "mx-marker-pulse";
  root.appendChild(pulse);

  const ring = document.createElement("div");
  ring.className = "mx-marker-ring";
  root.appendChild(ring);

  const dot = document.createElement("div");
  dot.className = "mx-marker-dot";
  root.appendChild(dot);

  const tip = document.createElement("div");
  tip.className = "mx-marker-tip";

  const flag = document.createElement("span");
  flag.className = "mx-marker-flag";
  flag.textContent = d.flag;
  tip.appendChild(flag);

  const meta = document.createElement("div");
  meta.className = "mx-marker-meta";

  const name = document.createElement("div");
  name.className = "mx-marker-name";
  name.textContent = d.name;
  meta.appendChild(name);

  const count = document.createElement("div");
  count.className = "mx-marker-count";
  count.textContent = `${d.count} event${d.count > 1 ? "s" : ""} today`;
  meta.appendChild(count);

  tip.appendChild(meta);
  root.appendChild(tip);

  return root;
}

function HeroGlobe() {
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    let disposed = false;
    let cloudMesh = null;
    let materialRef = null;
    let sunInterval = null;
    let cloudRAF = null;
    let globeInstance = null;

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
        .width(node.clientWidth)
        .height(node.clientHeight);

      g.globeMaterial(customMaterial);
      materialRef = customMaterial;
      globeInstance = g;

      const scene = g.scene();
      const globeRadius = 100;
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

      bumpTex.colorSpace = THREE.NoColorSpace || THREE.LinearSRGBColorSpace;

      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.5;
      g.controls().enableZoom = false;
      g.controls().enablePan = false;
      g.pointOfView({ lat: 20, lng: -40, altitude: 2.8 }, 0);

      const driftClouds = () => {
        if (cloudMesh) cloudMesh.rotation.y += 0.00015;
        cloudRAF = requestAnimationFrame(driftClouds);
      };
      driftClouds();

      const updateSun = () => {
        const c = getSunCoords();
        const v = latLngToWorldVec(c.lat, c.lng);
        if (materialRef) materialRef.uniforms.sunDirection.value.set(v[0], v[1], v[2]);
      };
      sunInterval = setInterval(updateSun, 30000);

      setLoaded(true);
    };

    const handleResize = () => {
      if (globeInstance && node) {
        globeInstance.width(node.clientWidth).height(node.clientHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    init();

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      if (sunInterval) clearInterval(sunInterval);
      if (cloudRAF) cancelAnimationFrame(cloudRAF);
    };
  }, []);

  return (
    <div className="mx-hero-globe-wrap">
      <div ref={containerRef} className="mx-hero-globe-canvas" data-testid="hero-globe" />
      {!loaded && (
        <div className="mx-hero-globe-loader">
          <div className="mx-loader-text">
            Meri<span style={{ color: "#00E5C7" }}>dex</span>
          </div>
        </div>
      )}
      <div className="mx-hero-pulse" />
      <div className="mx-hero-pulse mx-hero-pulse-2" />
      <div className="mx-hero-pulse mx-hero-pulse-3" />
      <div className="mx-hero-legend">
        <div className="mx-legend-item">
          <span className="mx-legend-dot" style={{ background: IC.high }} />
          High
        </div>
        <div className="mx-legend-item">
          <span className="mx-legend-dot" style={{ background: IC.medium }} />
          Medium
        </div>
        <div className="mx-legend-item">
          <span className="mx-legend-dot" style={{ background: IC.low }} />
          Low
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <section className="mx-page" data-testid="page-home">
      {/* Hero */}
      <div className="mx-hero">
        <div className="mx-hero-glow" />
        <div className="mx-hero-content">
          <div className="mx-hero-badge">
            <Zap size={12} />
            <span>Real-time trading intelligence</span>
          </div>
          <h1 className="mx-hero-title">
            Navigate markets with
            <span className="mx-hero-title-accent"> precision</span>
          </h1>
          <p className="mx-hero-desc">
            Meridex fuses live economic calendars, global event visualization, and instant alerts into a single command
            center for traders. Know what moves markets — before it happens.
          </p>
          <div className="mx-hero-ctas">
            <Link to="/dashboard" className="mx-cta-primary mx-cta-lg">
              Open Dashboard
              <ArrowRight size={16} />
            </Link>
            <Link to="/calendar" className="mx-cta-secondary mx-cta-lg">
              View Calendar
            </Link>
          </div>
        </div>
        <div className="mx-hero-visual">
          <HeroGlobe />
        </div>
      </div>

      {/* Stats */}
      <div className="mx-stats-bar">
        {STATS.map((s, i) => (
          <div key={i} className="mx-stat-item">
            <div className="mx-stat-value-hero">{s.value}</div>
            <div className="mx-stat-label-hero">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="mx-features-section">
        <div className="mx-section-header">
          <h2 className="mx-section-title">Everything you need to stay ahead</h2>
          <p className="mx-section-desc">
            From macroeconomic events to real-time price alerts, Meridex gives you the edge.
          </p>
        </div>
        <div className="mx-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="mx-feature-card">
              <div className="mx-feature-icon">
                <f.icon size={20} />
              </div>
              <h3 className="mx-feature-title">{f.title}</h3>
              <p className="mx-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mx-how-section">
        <div className="mx-section-header">
          <h2 className="mx-section-title">How it works</h2>
        </div>
        <div className="mx-how-grid">
          <div className="mx-how-step">
            <div className="mx-how-num">1</div>
            <div className="mx-how-content">
              <h3>Connect</h3>
              <p>Sign in and access the live dashboard instantly. No complex setup.</p>
            </div>
          </div>
          <div className="mx-how-step">
            <div className="mx-how-num">2</div>
            <div className="mx-how-content">
              <h3>Configure</h3>
              <p>Pin assets to your watchlist. Set alerts for price thresholds or upcoming events.</p>
            </div>
          </div>
          <div className="mx-how-step">
            <div className="mx-how-num">3</div>
            <div className="mx-how-content">
              <h3>Act</h3>
              <p>Get notified instantly when your conditions trigger. Stay ahead of the market.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-final-cta">
        <div className="mx-final-cta-card">
          <h2>Ready to trade smarter?</h2>
          <p>Join thousands of traders who use Meridex to stay informed.</p>
          <div className="mx-final-cta-actions">
            <Link to="/dashboard" className="mx-cta-primary mx-cta-lg">
              Get Started
              <ArrowRight size={16} />
            </Link>
          </div>
          <ul className="mx-final-cta-perks">
            <li>
              <CheckCircle size={14} /> Free to use
            </li>
            <li>
              <CheckCircle size={14} /> No credit card required
            </li>
            <li>
              <CheckCircle size={14} /> Instant access
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
