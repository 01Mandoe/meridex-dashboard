import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Globe as GlobeIcon, Activity, Bell, Zap, ArrowRight, CircleCheck as CheckCircle, TrendingUp, TrendingDown, Clock, MapPin, Target, Landmark, ChartBar as BarChart3 } from "lucide-react";
import { EVENTS, IC, IB, allEvents } from "../data";

const STATS = [
  { value: "10000", label: "Active traders", suffix: "+" },
  { value: "195", label: "Countries tracked", suffix: "" },
  { value: "98.7", label: "Event accuracy", suffix: "%" },
  { value: "24/7", label: "Live coverage", suffix: "" }
];

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
  clouds: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png",
  spec: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
};

const dayNightVertex = `
  varying vec2 vUv;
  varying vec3 vObjectNormal;
  void main() {
    vUv = uv;
    vObjectNormal = normalize(normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const dayNightFragment = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform vec3 sunDirection;
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

    vec3 night = texture2D(nightMap, vUv).rgb * 2.6;
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

    const loadTexture = (THREE, url) => new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(url, (tex) => {
        if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 16;
        resolve(tex);
      }, undefined, reject);
    });

    const buildMarker = (d, onClick) => {
      const root = document.createElement("div");
      root.className = `mx-marker mx-marker-${d.impact}`;
      root.style.cursor = "pointer";
      root.style.pointerEvents = "auto";

      const pulse = document.createElement("div");
      pulse.className = "mx-marker-pulse";
      root.appendChild(pulse);

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
      meta.innerHTML = `<div class="mx-marker-name">${d.name}</div><div class="mx-marker-count">${d.count} event${d.count > 1 ? "s" : ""}</div>`;
      tip.appendChild(meta);
      root.appendChild(tip);

      root.addEventListener("click", () => onClick(d.code));

      return root;
    };

    const init = async () => {
      const [Globe, THREE] = await Promise.all([
        import("globe.gl").then((m) => m.default),
        import("three"),
      ]);
      if (disposed) return;

      const [dayTex, nightTex, specTex, cloudsTex] = await Promise.all([
        loadTexture(THREE, TEX.day),
        loadTexture(THREE, TEX.night),
        loadTexture(THREE, TEX.spec),
        loadTexture(THREE, TEX.clouds),
      ]);
      if (disposed) return;

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

      const sunCoords = getSunCoords();
      const sun = latLngToWorldVec(sunCoords.lat, sunCoords.lng);

      const customMaterial = new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayTex },
          nightMap: { value: nightTex },
          specMap: { value: specTex },
          sunDirection: { value: new THREE.Vector3(sun[0], sun[1], sun[2]) },
        },
        vertexShader: dayNightVertex,
        fragmentShader: dayNightFragment,
      });

      const g = Globe()(node)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor("#00E5C7")
        .atmosphereAltitude(0.25)
        .htmlElementsData(markers)
        .htmlElement((d) => buildMarker(d, () => {}))
        .htmlAltitude(0.01)
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
      cloudMesh = new THREE.Mesh(
        new THREE.SphereGeometry(100 * 1.015, 96, 96),
        new THREE.MeshPhongMaterial({ map: cloudsTex, transparent: true, opacity: 0.18, depthWrite: false })
      );
      scene.add(cloudMesh);

      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.6;
      g.controls().enableZoom = false;
      g.controls().enablePan = false;
      g.pointOfView({ lat: 20, lng: -40, altitude: 2.6 }, 0);

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

      node.addEventListener("mouseenter", () => {
        if (globeInstance) globeInstance.controls().autoRotateSpeed = 0.15;
      });
      node.addEventListener("mouseleave", () => {
        if (globeInstance) globeInstance.controls().autoRotateSpeed = 0.6;
      });

      setLoaded(true);
    };

    init();

    return () => {
      disposed = true;
      if (sunInterval) clearInterval(sunInterval);
      if (cloudRAF) cancelAnimationFrame(cloudRAF);
    };
  }, []);

  return (
    <div className="mx-hero-globe-wrap">
      <div ref={containerRef} className="mx-hero-globe-canvas" data-testid="hero-globe" />
      {!loaded && (
        <div className="mx-hero-globe-loader">
          <div className="mx-loader-text">Meri<span style={{ color: "#00E5C7" }}>dex</span></div>
          <div className="mx-loader-sub">Loading globe...</div>
        </div>
      )}
      <div className="mx-hero-pulse" />
      <div className="mx-hero-pulse mx-hero-pulse-2" />
      <div className="mx-hero-pulse mx-hero-pulse-3" />
      <div className="mx-hero-legend">
        <div className="mx-legend-item"><span className="mx-legend-dot" style={{ background: IC.high }} />High</div>
        <div className="mx-legend-item"><span className="mx-legend-dot" style={{ background: IC.medium }} />Medium</div>
        <div className="mx-legend-item"><span className="mx-legend-dot" style={{ background: IC.low }} />Low</div>
      </div>
    </div>
  );
}

function EventTicker() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setOffset((o) => o + 1), 30);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(() => {
    const upcoming = allEvents.slice(0, 8);
    return [...upcoming, ...upcoming];
  }, []);

  return (
    <div className="mx-ticker-wrap" data-testid="event-ticker">
      <div className="mx-ticker" style={{ transform: `translateX(-${offset % 3200}px)` }}>
        {items.map((e, i) => (
          <div key={`${e.id}-${i}`} className="mx-ticker-item">
            <span className="mx-ticker-time" style={{ color: IC[e.impact] }}>{e.time}</span>
            <span className="mx-ticker-flag">{e.flag}</span>
            <span className="mx-ticker-name">{e.name}</span>
            <span className="mx-ticker-pill" style={{ background: IB[e.impact], color: IC[e.impact] }}>
              {e.impact}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedNumber({ value, duration = 2000, suffix = "" }) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(num)) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(num * eased * 10) / 10;
      setDisplay(current.toLocaleString() + suffix);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration, suffix]);

  return <span>{display}</span>;
}

function GlobePreviewCard() {
  return (
    <div className="mx-bento-card mx-bento-globe" data-testid="bento-globe">
      <div className="mx-bento-header">
        <GlobeIcon size={16} />
        <span>Interactive Globe</span>
      </div>
      <div className="mx-bento-globe-preview">
        <div className="mx-bento-marker-group">
          <div className="mx-bento-ring" style={{ borderColor: IC.high }} />
          <div className="mx-bento-ring mx-bento-ring-2" style={{ borderColor: IC.medium }} />
          <div className="mx-bento-ring mx-bento-ring-3" style={{ borderColor: IC.low }} />
        </div>
      </div>
      <p className="mx-bento-desc">Click any country to see detailed event briefings and NQ/ES guidance</p>
    </div>
  );
}

function CalendarSnippetCard() {
  const next3 = allEvents.slice(0, 3);
  return (
    <div className="mx-bento-card mx-bento-tall" data-testid="bento-calendar">
      <div className="mx-bento-header">
        <Clock size={16} />
        <span>Upcoming Events</span>
      </div>
      <div className="mx-bento-events">
        {next3.map((e) => (
          <div key={e.id} className="mx-bento-event">
            <div className="mx-bento-event-left">
              <span className="mx-bento-event-flag">{e.flag}</span>
              <div>
                <div className="mx-bento-event-name">{e.name}</div>
                <div className="mx-bento-event-time">{e.time} GMT</div>
              </div>
            </div>
            <span className="mx-bento-event-impact" style={{ background: IB[e.impact], color: IC[e.impact] }}>
              {e.impact}
            </span>
          </div>
        ))}
      </div>
      <Link to="/calendar" className="mx-bento-link">View full calendar</Link>
    </div>
  );
}

function BriefingsPreviewCard() {
  return (
    <div className="mx-bento-card mx-bento-wide" data-testid="bento-briefings">
      <div className="mx-bento-header">
        <Target size={16} />
        <span>NQ/ES Pre-event Briefings</span>
      </div>
      <div className="mx-bento-briefings">
        <div className="mx-bento-briefing-item">
          <div className="mx-bento-briefing-scenario bullish">
            <TrendingUp size={14} />
            <span>Bullish Scenario</span>
          </div>
          <div className="mx-bento-briefing-levels">NQ: 18150-18250 | ES: 5250-5300</div>
        </div>
        <div className="mx-bento-briefing-item">
          <div className="mx-bento-briefing-scenario bearish">
            <TrendingDown size={14} />
            <span>Bearish Scenario</span>
          </div>
          <div className="mx-bento-briefing-levels">NQ: 17800-17900 | ES: 5150-5200</div>
        </div>
      </div>
      <p className="mx-bento-desc">Get specific price levels and exact time windows to avoid trading</p>
    </div>
  );
}

function CentralBankCard() {
  const banks = [
    { name: "Fed", rate: "5.25%", stance: "hawkish", next: "Jun 12" },
    { name: "BOE", rate: "5.00%", stance: "hawkish", next: "Jun 20" },
    { name: "ECB", rate: "4.25%", stance: "neutral", next: "Jul 18" },
    { name: "BOJ", rate: "0.10%", stance: "dovish", next: "Jun 14" },
  ];

  const stanceColor = (s) => s === "hawkish" ? IC.high : s === "dovish" ? IC.low : IC.medium;

  return (
    <div className="mx-bento-card" data-testid="bento-central-bank">
      <div className="mx-bento-header">
        <Landmark size={16} />
        <span>Central Bank Tracker</span>
      </div>
      <div className="mx-bento-banks">
        {banks.map((b) => (
          <div key={b.name} className="mx-bento-bank">
            <div className="mx-bento-bank-name">{b.name}</div>
            <div className="mx-bento-bank-rate">{b.rate}</div>
            <div className="mx-bento-bank-stance" style={{ color: stanceColor(b.stance) }}>
              <span className={`mx-bento-stance-dot ${b.stance}`} style={{ background: stanceColor(b.stance) }} />
              {b.stance}
            </div>
            <div className="mx-bento-bank-next">Next: {b.next}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SurpriseIndexCard() {
  const regions = [
    { name: "US", score: 72, label: "Beating" },
    { name: "UK", score: 45, label: "Mixed" },
    { name: "EZ", score: 38, label: "Missing" },
    { name: "CN", score: 55, label: "Mixed" },
    { name: "JP", score: 61, label: "Beating" },
  ];

  const scoreColor = (s) => s > 60 ? IC.low : s > 40 ? IC.medium : IC.high;

  return (
    <div className="mx-bento-card" data-testid="bento-surprise">
      <div className="mx-bento-header">
        <BarChart3 size={16} />
        <span>Economic Surprise Index</span>
      </div>
      <div className="mx-bento-surprise">
        {regions.map((r) => (
          <div key={r.name} className="mx-bento-surprise-row">
            <span className="mx-bento-surprise-name">{r.name}</span>
            <div className="mx-bento-surprise-bar">
              <div className="mx-bento-surprise-fill" style={{ width: `${r.score}%`, background: scoreColor(r.score) }} />
            </div>
            <span className="mx-bento-surprise-score" style={{ color: scoreColor(r.score) }}>{r.score}</span>
          </div>
        ))}
      </div>
      <p className="mx-bento-desc">Which regions are beating or missing expectations</p>
    </div>
  );
}

function HeatmapCard() {
  const assets = [
    { sym: "NQ", change: "+1.2%", up: true },
    { sym: "ES", change: "+0.8%", up: true },
    { sym: "EUR", change: "-0.3%", up: false },
    { sym: "XAU", change: "+0.5%", up: true },
    { sym: "BTC", change: "-1.1%", up: false },
    { sym: "OIL", change: "+2.1%", up: true },
  ];

  return (
    <div className="mx-bento-card mx-bento-heatmap" data-testid="bento-heatmap">
      <div className="mx-bento-header">
        <Activity size={16} />
        <span>Market Heatmap</span>
      </div>
      <div className="mx-bento-heatmap-grid">
        {assets.map((a) => (
          <div key={a.sym} className={`mx-bento-heatmap-cell ${a.up ? "up" : "down"}`}>
            <div className="mx-bento-heatmap-sym">{a.sym}</div>
            <div className="mx-bento-heatmap-chg">{a.change}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <section className="mx-page mx-home-page" data-testid="page-home">
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
            Meridex fuses live economic calendars, global event visualization, and instant alerts
            into a single command center. Know what moves markets—before it happens.
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

      <EventTicker />

      <div className="mx-stats-bar">
        {STATS.map((s, i) => (
          <div key={i} className="mx-stat-item">
            <div className="mx-stat-value-hero"><AnimatedNumber value={s.value} suffix={s.suffix} /></div>
            <div className="mx-stat-label-hero">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mx-bento-section">
        <div className="mx-section-header">
          <h2 className="mx-section-title">Everything you need to stay ahead</h2>
        </div>
        <div className="mx-bento-grid" data-testid="bento-grid">
          <GlobePreviewCard />
          <CalendarSnippetCard />
          <BriefingsPreviewCard />
          <CentralBankCard />
          <SurpriseIndexCard />
          <HeatmapCard />
        </div>
      </div>

      <div className="mx-how-section">
        <div className="mx-section-header">
          <h2 className="mx-section-title">How it works</h2>
        </div>
        <div className="mx-how-grid">
          <div className="mx-how-step">
            <div className="mx-how-num">1</div>
            <div className="mx-how-content">
              <div className="mx-how-icon"><MapPin size={20} /></div>
              <h3>Visualize</h3>
              <p>The globe shows you where economic events are happening globally in real-time. Color-coded markers indicate impact level.</p>
            </div>
          </div>
          <div className="mx-how-step">
            <div className="mx-how-num">2</div>
            <div className="mx-how-content">
              <div className="mx-how-icon"><Target size={20} /></div>
              <h3>Investigate</h3>
              <p>Click any country to see detailed event briefings with bullish/bearish scenarios and NQ/ES guidance.</p>
            </div>
          </div>
          <div className="mx-how-step">
            <div className="mx-how-num">3</div>
            <div className="mx-how-content">
              <div className="mx-how-icon"><Bell size={20} /></div>
              <h3>Act</h3>
              <p>Get alerted before high-impact events so you never get caught off guard. Know exactly when to avoid trading.</p>
            </div>
          </div>
        </div>
      </div>

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
            <li><CheckCircle size={14} /> Free to use</li>
            <li><CheckCircle size={14} /> No credit card required</li>
            <li><CheckCircle size={14} /> Instant access</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
