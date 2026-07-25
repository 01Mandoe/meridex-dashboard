import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { MARKERS, IMPACT_COLORS } from "../data.js";

const CONTINENTS = {
  northAmerica: [
    [-168, 65], [-155, 70], [-140, 72], [-125, 70], [-110, 60], [-100, 55],
    [-95, 50], [-85, 45], [-80, 40], [-75, 35], [-80, 25], [-90, 18], [-100, 15],
    [-105, 22], [-115, 30], [-125, 35], [-130, 45], [-135, 55], [-150, 60], [-165, 62],
  ],
  southAmerica: [
    [-80, 10], [-75, 5], [-70, 0], [-65, -5], [-60, -15], [-55, -25],
    [-55, -35], [-60, -45], [-70, -55], [-75, -50], [-80, -40], [-82, -30],
    [-80, -20], [-78, -10], [-80, 0], [-82, 8],
  ],
  europe: [
    [-10, 60], [0, 65], [10, 68], [20, 65], [30, 60], [35, 55], [40, 50],
    [35, 45], [25, 40], [15, 38], [5, 42], [-5, 45], [-10, 50],
  ],
  africa: [
    [-15, 35], [-5, 30], [5, 28], [15, 30], [25, 32], [35, 30], [40, 22],
    [45, 15], [48, 5], [45, -5], [40, -15], [35, -25], [30, -34], [25, -34],
    [20, -30], [15, -20], [10, -10], [5, 0], [0, 5], [-5, 10], [-12, 20], [-15, 28],
  ],
  asia: [
    [35, 45], [45, 50], [55, 55], [65, 60], [75, 65], [85, 70], [100, 72],
    [115, 70], [130, 65], [140, 55], [145, 50], [140, 40], [135, 35], [130, 25],
    [120, 20], [110, 18], [105, 10], [100, 5], [95, 15], [85, 20], [75, 25],
    [65, 30], [55, 35], [45, 38], [38, 42],
  ],
  australia: [
    [115, -20], [125, -18], [135, -15], [145, -18], [150, -25], [148, -35],
    [140, -38], [130, -35], [120, -33], [115, -28],
  ],
};

function latLonToVec3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function makeGlowSprite(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.2, color);
  grad.addColorStop(0.5, color.replace(")", ",0.3)").replace("rgb", "rgba"));
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r},${g},${b})`;
}

export default function DigitalGlobe({ onMarkerClick }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const getWidth = () => mount.clientWidth || 600;
    const getHeight = () => mount.clientHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, getWidth() / getHeight(), 0.1, 1000);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(getWidth(), getHeight());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const R = 2;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Dark sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x0a1a1e, transparent: true, opacity: 0.92, shininess: 8 })
    );
    globeGroup.add(sphere);

    // Wireframe
    globeGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(R + 0.01, 36, 24),
      new THREE.MeshBasicMaterial({ color: 0x00c9a7, wireframe: true, transparent: true, opacity: 0.08 })
    ));

    // Continent dots
    const dotGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00c9a7 });
    Object.values(CONTINENTS).forEach((polygon) => {
      const minLon = Math.min(...polygon.map(([lon]) => lon));
      const maxLon = Math.max(...polygon.map(([lon]) => lon));
      const minLat = Math.min(...polygon.map(([, lat]) => lat));
      const maxLat = Math.max(...polygon.map(([, lat]) => lat));
      for (let lat = maxLat; lat >= minLat; lat -= 2.5) {
        for (let lon = minLon; lon <= maxLon; lon += 2.5) {
          if (pointInPolygon([lon, lat], polygon)) {
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.copy(latLonToVec3(lat, lon, R + 0.005));
            globeGroup.add(dot);
          }
        }
      }
    });

    // Lat/lon rings
    const ringMat = new THREE.LineBasicMaterial({ color: 0x00c9a7, transparent: true, opacity: 0.06 });
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = 0; lon <= 360; lon += 5) pts.push(latLonToVec3(lat, lon - 180, R + 0.01));
      globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    }
    for (let lon = 0; lon < 360; lon += 30) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 5) pts.push(latLonToVec3(lat, lon - 180, R + 0.01));
      globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    }

    // Atmosphere glow
    const glowMat = new THREE.ShaderMaterial({
      uniforms: { c: { value: 0.4 }, p: { value: 4.0 }, glowColor: { value: new THREE.Color(0x00c9a7) } },
      vertexShader: `varying vec3 vNormal; varying vec3 vPos; void main(){ vNormal=normalize(normalMatrix*normal); vPos=(modelViewMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 glowColor; uniform float c; uniform float p; varying vec3 vNormal; varying vec3 vPos; void main(){ vec3 v=normalize(-vPos); float i=pow(c-dot(vNormal,v),p); gl_FragColor=vec4(glowColor,i*0.7); }`,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.15, 32, 32), glowMat));

    // Markers + pulses
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    const markers = [];

    MARKERS.forEach((m) => {
      const hex = IMPACT_COLORS[m.impact];
      const color = new THREE.Color(hex);
      const pos = latLonToVec3(m.lat, m.lon, R + 0.05);

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 12, 12),
        new THREE.MeshBasicMaterial({ color })
      );
      core.position.copy(pos);
      core.userData = { marker: m, isMarker: true };
      markerGroup.add(core);

      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowSprite(hexToRgb(hex)),
        color, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      sprite.position.copy(pos);
      sprite.scale.set(0.3, 0.3, 1);
      sprite.userData = { phase: Math.random() * Math.PI * 2 };
      markerGroup.add(sprite);
      markers.push({ core, sprite, data: m });
    });

    // Arcs
    const arcGroup = new THREE.Group();
    scene.add(arcGroup);
    const arcs = [];
    for (let i = 0; i < MARKERS.length; i++) {
      for (let j = i + 1; j < MARKERS.length; j++) {
        if (MARKERS[i].impact === "low" && MARKERS[j].impact === "low") continue;
        const start = latLonToVec3(MARKERS[i].lat, MARKERS[i].lon, R + 0.05);
        const end = latLonToVec3(MARKERS[j].lat, MARKERS[j].lon, R + 0.05);
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(R + 0.8);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const points = curve.getPoints(40);
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: 0x00c9a7, transparent: true, opacity: 0.1 + Math.random() * 0.15 })
        );
        arcGroup.add(line);
        arcs.push({ line, phase: Math.random() * Math.PI * 2 });
      }
    }

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0x00c9a7, 0.6); dir.position.set(5, 3, 5); scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3); fill.position.set(-5, -2, -3); scene.add(fill);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const r = 30 + Math.random() * 20;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(p) * Math.cos(t);
      starPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      starPos[i * 3 + 2] = r * Math.cos(p);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.5 }));
    scene.add(stars);

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handleClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markerGroup.children.filter(c => c.userData.isMarker));
      if (hits.length > 0) onMarkerClick(hits[0].object.userData.marker);
    };
    renderer.domElement.addEventListener("click", handleClick);

    // Scroll-driven zoom
    let scrollProgress = 0;
    const onScroll = () => { scrollProgress = Math.min(1, window.scrollY / (window.innerHeight * 2.5)); };
    window.addEventListener("scroll", onScroll, { passive: true });

    const clock = new THREE.Clock();
    let animId;
    const animate = () => {
      const t = clock.getElapsedTime();
      animId = requestAnimationFrame(animate);
      globeGroup.rotation.y = t * 0.08;
      markerGroup.rotation.y = t * 0.08;
      arcGroup.rotation.y = t * 0.08;
      camera.position.z += (8 - scrollProgress * 3 - camera.position.z) * 0.05;
      markers.forEach((m) => {
        const phase = (t + m.sprite.userData.phase) % 2.5;
        const s = 0.2 + (phase / 2.5) * 1.2;
        m.sprite.scale.set(s, s, 1);
        m.sprite.material.opacity = Math.max(0, 0.6 - (phase / 2.5) * 0.6);
      });
      arcs.forEach((a) => { a.line.material.opacity = 0.08 + Math.sin(t * 0.5 + a.phase) * 0.06 + 0.06; });
      stars.rotation.y = t * 0.005;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = getWidth() / getHeight();
      camera.updateProjectionMatrix();
      renderer.setSize(getWidth(), getHeight());
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", handleClick);
      if (mount && renderer.domElement) mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [onMarkerClick]);

  return <div className="mx-globe-canvas" ref={mountRef} />;
}
