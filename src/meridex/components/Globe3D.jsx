import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EVENTS } from "../data.js";

const FRAG = `uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D specMap; uniform vec3 sunDirection; uniform float nightBoost; varying vec2 vUv; varying vec3 vObjectNormal; void main(){ vec3 N=normalize(vObjectNormal); vec3 L=normalize(sunDirection); float cosAngle=dot(N,L); float dayMix=smoothstep(-0.15,0.30,cosAngle); vec3 day=texture2D(dayMap,vUv).rgb; float waterMask=texture2D(specMap,vUv).r; vec3 litDay=day*(0.38+0.85*max(cosAngle,0.0)); float spec=pow(max(cosAngle,0.0),32.0)*waterMask*0.55; litDay+=vec3(spec*1.1,spec*1.05,spec*0.95); vec3 nightTex=texture2D(nightMap,vUv).rgb; vec3 night=nightTex*nightBoost*vec3(1.5,1.15,0.75)+vec3(0.006,0.010,0.020); float cityGlow=nightTex.r*nightTex.r*nightBoost*0.6; night+=vec3(cityGlow*1.0,cityGlow*0.65,cityGlow*0.3); vec3 color=mix(night,litDay,dayMix); float rim=pow(1.0-abs(cosAngle),4.0)*smoothstep(-0.25,0.05,cosAngle); color+=vec3(0.0,0.45,0.55)*rim*0.30; gl_FragColor=vec4(color,1.0); }`;

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
          arcs.push({
            startLat: entries[i][1].lat, startLng: entries[i][1].lon,
            endLat: entries[j][1].lat, endLng: entries[j][1].lon,
            color: ["rgba(0,201,167,0)", "rgba(0,201,167,0.5)", "rgba(0,201,167,0)"],
            stroke: 0.4,
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
        arcs.push({
          startLat: euNa[i][1].lat, startLng: euNa[i][1].lon,
          endLat: euNa[j][1].lat, endLng: euNa[j][1].lon,
          color: ["rgba(0,201,167,0)", "rgba(0,201,167,0.5)", "rgba(0,201,167,0)"],
          stroke: 0.4,
          dashAnimateTime: 1500 + Math.random() * 2500,
        });
      }
    }
  }
  return arcs;
}

function GlobePopup({ marker, onClose, onEnter }) {
  return (
    <motion.div
      className="mx-land-globe-popup"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mx-land-popup-header">
        <span className="mx-land-popup-flag">{marker.flag}</span>
        <span className="mx-land-popup-name">{marker.name}</span>
        <span className={`mx-land-popup-impact mx-land-popup-impact--${marker.impact}`}>
          {marker.impact}
        </span>
        <button className="mx-land-popup-close" onClick={onClose}>×</button>
      </div>
      <div className="mx-land-popup-events">
        {marker.items.map((item, i) => (
          <div key={i} className="mx-land-popup-event">
            <span className="mx-land-popup-time">{item.time}</span>
            <span className="mx-land-popup-event-name">{item.name}</span>
            <span className={`mx-land-popup-event-impact mx-land-popup-event-impact--${item.impact}`}>
              {item.impact}
            </span>
          </div>
        ))}
      </div>
      <div className="mx-land-popup-affects">
        <span>Affects:</span>
        {marker.affects.map((s) => (
          <span key={s} className="mx-land-popup-affect-pill">{s}</span>
        ))}
      </div>
      <button className="mx-land-btn mx-land-btn--primary mx-land-btn--sm" onClick={onEnter}>
        View in Meridex <ArrowRight size={13} />
      </button>
    </motion.div>
  );
}

export default function Globe3D({ onMarkerClick, popupMarker, onPopupClose, onEnter }) {
  const outerRef = useRef(null);
  const globeRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // Load globe.gl + three dynamically so they can never break the page
  useEffect(() => {
    let disposed = false;
    const node = outerRef.current;
    if (!node) return;

    Promise.all([
      import("globe.gl"),
      import("three"),
    ])
      .then(([GlobeModule, THREE]) => {
        if (disposed) return;
        const Globe = GlobeModule.default || GlobeModule;

        const TEX = {
          day: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
          night: "https://unpkg.com/three-globe/example/img/earth-night.jpg",
          spec: "https://unpkg.com/three-globe/example/img/earth-water.png",
        };

        const loader = new THREE.TextureLoader();
        let loadedCount = 0;
        const onTex = () => {
          loadedCount++;
          if (loadedCount === 3 && !disposed) setLoaded(true);
        };
        const dayTex = loader.load(TEX.day, onTex);
        const nightTex = loader.load(TEX.night, onTex);
        const specTex = loader.load(TEX.spec, onTex);

        const sunDirection = new THREE.Vector3(-0.5, 0.5, 1).normalize();

        const g = Globe()(node)
          .globeMaterial(new THREE.ShaderMaterial({
            uniforms: {
              dayMap: { value: dayTex },
              nightMap: { value: nightTex },
              specMap: { value: specTex },
              sunDirection: { value: sunDirection },
              nightBoost: { value: 3.5 },
            },
            vertexShader: `
              varying vec2 vUv;
              varying vec3 vObjectNormal;
              void main() {
                vUv = uv;
                vObjectNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: FRAG,
          }))
          .showGlobe(true)
          .showAtmosphere(true)
          .atmosphereColor("#00C9A7")
          .atmosphereAltitude(0.15)
          .htmlElementsData(Object.entries(EVENTS).map(([code, e]) => ({ code, ...e })))
          .htmlLat("lat")
          .htmlLng("lon")
          .htmlAltitude(0.01)
          .htmlElement((d) => {
            const el = document.createElement("div");
            el.className = `mx-land-marker mx-land-marker-${d.impact}`;
            el.innerHTML = `<div class="mx-land-marker-pulse mx-land-marker-pulse--1"></div><div class="mx-land-marker-pulse mx-land-marker-pulse--2"></div><div class="mx-land-marker-pulse mx-land-marker-pulse--3"></div><div class="mx-land-marker-dot"></div>`;
            el.style.cursor = "pointer";
            el.addEventListener("click", () => onMarkerClick(d));
            return el;
          })
          .arcsData([])
          .arcColor("color")
          .arcAltitude(0.3)
          .arcStroke(0.4)
          .arcDashLength(0.4)
          .arcDashGap(0.6)
          .arcDashAnimateTime(2000)
          .width(node.clientWidth)
          .height(node.clientHeight);

        globeRef.current = g;
        g.pointOfView({ lat: 20, lng: -40, altitude: 2.5 }, 0);

        const onResize = () => {
          if (globeRef.current && node) {
            globeRef.current.width(node.clientWidth).height(node.clientHeight);
          }
        };
        window.addEventListener("resize", onResize);
        node._onResize = onResize;
      })
      .catch((err) => {
        console.warn("Globe.gl failed to load:", err);
      });

    return () => {
      disposed = true;
      if (node && node._onResize) {
        window.removeEventListener("resize", node._onResize);
      }
    };
  }, [onMarkerClick]);

  // Scroll-driven camera + transform
  useEffect(() => {
    const node = outerRef.current;
    if (!node) return;
    let raf;

    const update = () => {
      const g = globeRef.current;
      if (!g) { raf = requestAnimationFrame(update); return; }
      const rect = node.getBoundingClientRect();
      const winH = window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / (winH * 2.5)));
      const idx = Math.min(GLOBE_STATES.length - 1, Math.floor(progress * GLOBE_STATES.length));
      const s = GLOBE_STATES[idx];

      node.style.transform = `translateX(${s.tx}%) scale(${s.scale})`;
      node.style.opacity = String(s.opacity);

      g.pointOfView({ lat: s.lat, lng: s.lng, altitude: s.altitude }, 0);

      if (s.arcs !== node._lastArcMode) {
        node._lastArcMode = s.arcs;
        if (s.arcs === "none") {
          g.arcsData([]);
        } else {
          const arcs = buildArcs(s.arcs);
          g.arcsData(arcs);
          g.arcDashAnimateTime((d) => d.dashAnimateTime || 2000);
          g.arcStroke((d) => d.stroke || 0.4);
        }
      }
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="mx-land-globe-outer" ref={outerRef}>
      <div className="mx-land-globe-inner" style={{ opacity: loaded ? 1 : 0 }}>
        <div className="mx-land-globe-vignette" />
      </div>
      {!loaded && <div className="mx-land-globe-skeleton" />}
      <AnimatePresence>
        {popupMarker && (
          <GlobePopup marker={popupMarker} onClose={onPopupClose} onEnter={onEnter} />
        )}
      </AnimatePresence>
    </div>
  );
}
