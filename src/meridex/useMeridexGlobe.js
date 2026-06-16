import { useEffect, useRef, useState } from "react";
import { EVENTS, IC } from "./data";

// Realtime sub-solar point (where the sun is overhead right now, in UTC)
function getSunCoords() {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const dayOfYear = Math.floor(
    (now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000
  );
  // Solar declination (axial tilt) — degrees
  const declination = 23.44 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
  // Sub-solar longitude — sun crosses Greenwich at UTC noon
  const lng = -(hours - 12) * 15;
  return { lat: declination, lng };
}

// Convert lat/lng of the sub-solar point into a unit vector that matches
// three-globe's world-space orientation. three-globe uses:
//   x = -sin(phi)*cos(theta), y = cos(phi), z = sin(phi)*sin(theta)
//   where phi = (90 - lat)*deg, theta = (lng + 180)*deg
function latLngToWorldVec(lat, lng) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  const x = -Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

// XSS-safe marker DOM builder
function buildMarker(d, onClick) {
  const root = document.createElement("div");
  root.className = `mx-marker mx-marker-${d.impact}`;
  root.dataset.code = d.code; // used by the pinned-watchlist effect
  root.style.cursor = "pointer";
  root.style.pointerEvents = "auto";

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

  root.addEventListener("click", () => onClick(d.code));
  return root;
}

// Earth textures — all sourced from three.js examples (NASA-derived, perfectly aligned).
// Day map from turban (4K) for crispness, but night/spec/clouds use three.js's matched
// set so projection seams line up exactly.
const TEX = {
  day:    "https://cdn.jsdelivr.net/gh/turban/webgl-earth@master/images/2_no_clouds_4k.jpg",
  night:  "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png",
  clouds: "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png",
  bump:   "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
  spec:   "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
};

// Custom day/night shader — boosts city lights, soft terminator, atmospheric rim.
// NOTE: we use OBJECT-space normals here. three-globe applies an internal Y
// rotation to the globe mesh to align textures, so working in object space
// keeps `sunDirection` (computed via latLngToWorldVec) in the same frame as
// the surface normals.
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

    // Polar mask — fades textures completely to deep ocean tone near the poles
    // to hide the equirectangular pinch artifacts where Greenland/Antarctica
    // wrap around the apex of the sphere.
    // vUv.y == 0.5 is the equator. Past lat ±80° we fade hard.
    float latFromEquator = abs(vUv.y - 0.5) * 2.0; // 0 at equator, 1 at pole
    float polarFactor = 1.0 - smoothstep(0.78, 0.96, latFromEquator);
    vec3 polarTint = vec3(0.02, 0.04, 0.06); // deep dark navy

    // Soft day/night terminator
    float dayMix = smoothstep(-0.10, 0.25, cosAngle);

    // Day side with directional lighting + ocean specular highlight
    vec3 day = texture2D(dayMap, vUv).rgb;
    float waterMask = texture2D(specMap, vUv).r;
    vec3 litDay = day * (0.38 + 0.85 * max(cosAngle, 0.0));
    float spec = pow(max(cosAngle, 0.0), 32.0) * waterMask * 0.55;
    litDay += vec3(spec * 1.1, spec * 1.05, spec * 0.95);

    // Night side: boosted, warm-tinted city lights
    vec3 night = texture2D(nightMap, vUv).rgb;
    night = night * nightBoost;
    night *= vec3(1.22, 1.02, 0.74);
    night += vec3(0.012, 0.018, 0.030); // faint moonlit ambient

    vec3 color = mix(night, litDay, dayMix);

    // Atmospheric teal rim at the terminator
    float terminator = 1.0 - abs(cosAngle);
    float rim = pow(terminator, 4.0) * smoothstep(-0.25, 0.05, cosAngle);
    color += vec3(0.0, 0.45, 0.55) * rim * 0.30;

    // Apply polar masking — fade to deep navy so the texture pinch
    // is fully hidden under a believable "polar twilight"
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
      reject
    );
  });
}

/**
 * Initialises the globe.gl scene on the supplied container ref.
 * Real-time day/night shader, high-res textures, drifting cloud layer.
 * Emits radiating impact arcs whenever `selectedCode` changes.
 */
export function useMeridexGlobe(onMarkerClick, selectedCode, pinnedCountries = []) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const baseArcsRef = useRef([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    let disposed = false;
    let cloudMesh = null;
    let materialRef = null;
    let sunInterval = null;
    let cloudRAF = null;

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
        lat: ev.lat, lng: ev.lon, code,
        impact: ev.impact, name: ev.name, flag: ev.flag, count: ev.items.length,
      }));

      const arcs = Object.entries(EVENTS)
        .filter(([, ev]) => ev.impact !== "low")
        .map(([code, ev]) => ({
          id: `${code}-arc`,
          startLat: ev.lat, startLng: ev.lon,
          endLat: ev.lat + (Math.random() - 0.5) * 40,
          endLng: ev.lon + (Math.random() - 0.5) * 40,
          color: [IC[ev.impact] + "00", IC[ev.impact], IC[ev.impact] + "00"],
        }));
      baseArcsRef.current = arcs;

      const rings = Object.entries(EVENTS).map(([, ev]) => ({
        lat: ev.lat, lng: ev.lon, color: IC[ev.impact],
        maxR: ev.impact === "high" ? 4.5 : ev.impact === "medium" ? 3 : 2,
        propSpeed: ev.impact === "high" ? 2.5 : 1.8,
        repeatPeriod: ev.impact === "high" ? 1400 : 2200,
      }));

      const g = Globe()(node)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .atmosphereColor("#00E5C7")
        .atmosphereAltitude(0.22)
        .htmlElementsData(markers)
        .htmlElement((d) => buildMarker(d, onMarkerClick))
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

      // ── Custom day/night shader material ───────────────────────────────
      const sunCoords = getSunCoords();
      const sun = latLngToWorldVec(sunCoords.lat, sunCoords.lng);

      const customMaterial = new THREE.ShaderMaterial({
        uniforms: {
          dayMap:   { value: dayTex },
          nightMap: { value: nightTex },
          specMap:  { value: specTex },
          sunDirection: { value: new THREE.Vector3(sun[0], sun[1], sun[2]) },
          nightBoost: { value: 2.6 },
        },
        vertexShader: dayNightVertex,
        fragmentShader: dayNightFragment,
      });
      g.globeMaterial(customMaterial);
      materialRef = customMaterial;

      // ── Cloud layer (slightly larger transparent sphere, lighter density) ──
      const scene = g.scene();
      const globeRadius = 100; // three-globe constant
      cloudMesh = new THREE.Mesh(
        new THREE.SphereGeometry(globeRadius * 1.015, 96, 96),
        new THREE.MeshPhongMaterial({
          map: cloudsTex,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        })
      );
      scene.add(cloudMesh);

      // Bump map adds subtle relief (mountain highlights at terminator)
      bumpTex.colorSpace = THREE.NoColorSpace || THREE.LinearSRGBColorSpace;

      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.35;
      g.controls().enableZoom = true;
      g.controls().minDistance = 220;
      g.controls().maxDistance = 500;
      g.pointOfView({ lat: 20, lng: -40, altitude: 2.4 }, 0);

      // Animate cloud drift
      const driftClouds = () => {
        if (cloudMesh) cloudMesh.rotation.y += 0.00015;
        cloudRAF = requestAnimationFrame(driftClouds);
      };
      driftClouds();

      // Update sun direction every 30s (covers daylight drift cleanly)
      const updateSun = () => {
        const c = getSunCoords();
        const v = latLngToWorldVec(c.lat, c.lng);
        if (materialRef) materialRef.uniforms.sunDirection.value.set(v[0], v[1], v[2]);
      };
      sunInterval = setInterval(updateSun, 30000);

      instanceRef.current = g;
      setLoaded(true);
    };

    init();

    const handleResize = () => {
      if (instanceRef.current && containerRef.current) {
        instanceRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      if (sunInterval) clearInterval(sunInterval);
      if (cloudRAF) cancelAnimationFrame(cloudRAF);
    };
  }, [onMarkerClick]);

  // Emit radiating "impact" arcs whenever a country is selected.
  // Arcs sweep outward from the marker, then fade after ~4 seconds.
  useEffect(() => {
    const g = instanceRef.current;
    if (!g || !selectedCode || !EVENTS[selectedCode]) return undefined;
    const ev = EVENTS[selectedCode];
    const base = baseArcsRef.current;

    // Generate 8 arcs radiating outward + targeted arcs toward each affected asset
    // (asset arcs end at deterministic far-away coords representing trading hubs)
    const ASSET_HUBS = {
      EURUSD: { lat: 50, lng: 8 },     // Frankfurt
      GBPUSD: { lat: 51, lng: -0.1 },  // London
      USDJPY: { lat: 35, lng: 139 },   // Tokyo
      XAUUSD: { lat: 1, lng: 103 },    // Singapore (gold hub)
      BTCUSD: { lat: 40, lng: -74 },   // New York
    };

    const impactArcs = [];
    // Radial arcs (8 outward bursts)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      impactArcs.push({
        id: `impact-${selectedCode}-radial-${i}-${Date.now()}`,
        startLat: ev.lat,
        startLng: ev.lon,
        endLat: Math.max(-80, Math.min(80, ev.lat + Math.sin(angle) * 28)),
        endLng: ev.lon + Math.cos(angle) * 45,
        color: [IC[ev.impact] + "00", IC[ev.impact], IC[ev.impact] + "00"],
        __impact: true,
      });
    }
    // Targeted arcs from the country → each affected asset hub
    (ev.affects || []).forEach((assetId, i) => {
      const hub = ASSET_HUBS[assetId];
      if (!hub) return;
      impactArcs.push({
        id: `impact-${selectedCode}-asset-${assetId}-${Date.now()}`,
        startLat: ev.lat,
        startLng: ev.lon,
        endLat: hub.lat,
        endLng: hub.lng,
        color: ["#ffffff00", IC[ev.impact], "#ffffff00"],
        __impact: true,
      });
    });

    g.arcsData([...base, ...impactArcs]);

    const timer = setTimeout(() => {
      if (instanceRef.current) instanceRef.current.arcsData(baseArcsRef.current);
    }, 4500);

    return () => clearTimeout(timer);
  }, [selectedCode]);

  // Toggle a "pinned" class on every marker when the watchlist changes.
  // (Markers are DOM elements managed by globe.gl — we mutate them directly
  // because rebuilding all markers on every watchlist change would be wasteful.)
  useEffect(() => {
    if (!loaded || !containerRef.current) return undefined;
    const pinned = new Set(pinnedCountries);
    const markers = containerRef.current.querySelectorAll(".mx-marker");
    markers.forEach((el) => {
      el.classList.toggle("mx-marker-pinned", pinned.has(el.dataset.code));
    });
  }, [loaded, pinnedCountries]);

  return { containerRef, loaded };
}
