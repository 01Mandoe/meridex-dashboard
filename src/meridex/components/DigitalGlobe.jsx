import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { MARKERS, IMPACT_COLORS } from "../data.js";

const GEO_POINTS = [
  [1.5, 75, 0], [3, 70, 0], [5, 65, 0], [7, 60, 0], [8, 55, 0], [9, 50, 0],
  [10, 45, 0], [11, 40, 0], [12, 35, 0], [13, 30, 0], [14, 25, 0], [15, 20, 0],
  [16, 15, 0], [17, 10, 0], [18, 5, 0], [19, 0, 0], [20, -5, 0], [21, -10, 0],
  [22, -15, 0], [23, -20, 0], [24, -25, 0], [25, -30, 0], [26, -35, 0], [27, -40, 0],
  [28, -45, 0], [29, -50, 0], [30, -55, 0], [31, -60, 0], [32, -65, 0], [33, -70, 0],
];

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
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

function createDotTexture(size, color, glowColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color);
  grad.addColorStop(0.5, glowColor || color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function DigitalGlobe({ onMarkerClick, focusMarker }) {
  const mountRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const globeRadius = 2;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Main globe sphere (dark, semi-transparent)
    const sphereGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x0a1a1e,
      transparent: true,
      opacity: 0.92,
      shininess: 8,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(sphere);

    // Wireframe overlay (grid lines)
    const wireGeo = new THREE.SphereGeometry(globeRadius + 0.01, 36, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00c9a7,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    globeGroup.add(wire);

    // Continent dots (procedural)
    const dotGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00c9a7 });
    const continentMeshes = [];

    Object.values(CONTINENTS).forEach((polygon) => {
      const points = [];
      for (let i = 0; i < polygon.length; i++) {
        const [lon, lat] = polygon[i];
        points.push(latLonToVec3(lat, lon, globeRadius + 0.005));
      }
      // Fill the polygon with dots
      const minLat = Math.min(...points.map(p => 90 - Math.acos(p.y / globeRadius) * 180 / Math.PI));
      const maxLat = Math.max(...points.map(p => 90 - Math.acos(p.y / globeRadius) * 180 / Math.PI));
      const minLon = Math.min(...polygon.map(([lon]) => lon));
      const maxLon = Math.max(...polygon.map(([lon]) => lon));

      const step = 2.5;
      for (let lat = maxLat; lat >= minLat; lat -= step) {
        for (let lon = minLon; lon <= maxLon; lon += step) {
          if (pointInPolygon([lon, lat], polygon)) {
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.copy(latLonToVec3(lat, lon, globeRadius + 0.005));
            globeGroup.add(dot);
            continentMeshes.push(dot);
          }
        }
      }
    });

    // Latitude/longitude rings
    const ringMat = new THREE.LineBasicMaterial({ color: 0x00c9a7, transparent: true, opacity: 0.06 });
    for (let lat = -60; lat <= 60; lat += 30) {
      const ringPts = [];
      for (let lon = 0; lon <= 360; lon += 5) {
        ringPts.push(latLonToVec3(lat, lon - 180, globeRadius + 0.01));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      globeGroup.add(new THREE.Line(ringGeo, ringMat));
    }
    for (let lon = 0; lon < 360; lon += 30) {
      const ringPts = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        ringPts.push(latLonToVec3(lat, lon - 180, globeRadius + 0.01));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      globeGroup.add(new THREE.Line(ringGeo, ringMat));
    }

    // Atmosphere glow
    const glowGeo = new THREE.SphereGeometry(globeRadius * 1.15, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: { c: { value: 0.4 }, p: { value: 4.0 }, glowColor: { value: new THREE.Color(0x00c9a7) } },
      vertexShader: `
        varying vec3 vNormal; varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor; uniform float c; uniform float p;
        varying vec3 vNormal; varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float intensity = pow(c - dot(vNormal, viewDir), p);
          gl_FragColor = vec4(glowColor, intensity * 0.7);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    // Event markers with pulse
    const markers = [];
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    MARKERS.forEach((m) => {
      const color = IMPACT_COLORS[m.impact];
      const hexColor = new THREE.Color(color);

      // Core dot
      const coreGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const coreMat = new THREE.MeshBasicMaterial({ color: hexColor });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.copy(latLonToVec3(m.lat, m.lon, globeRadius + 0.05));
      core.userData = { marker: m, isMarker: true };
      markerGroup.add(core);
      markers.push({ mesh: core, data: m, pulsePhase: Math.random() * Math.PI * 2 });

      // Pulse ring (sprite)
      const pulseTex = createDotTexture(64, "rgba(255,255,255,0)", color.replace("#", "rgba(") );
      const spriteMat = new THREE.SpriteMaterial({
        map: pulseTex,
        color: hexColor,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(core.position);
      sprite.scale.set(0.3, 0.3, 1);
      sprite.userData = { isPulse: true, phase: Math.random() * Math.PI * 2, color: hexColor };
      markerGroup.add(sprite);
      markers[markers.length - 1].pulse = sprite;
    });
    markersRef.current = markers;

    // Arcs between high/medium impact markers
    const arcGroup = new THREE.Group();
    scene.add(arcGroup);
    const arcs = [];
    const arcMat = new THREE.LineBasicMaterial({
      color: 0x00c9a7, transparent: true, opacity: 0.25,
    });
    for (let i = 0; i < MARKERS.length; i++) {
      for (let j = i + 1; j < MARKERS.length; j++) {
        if (MARKERS[i].impact === "low" && MARKERS[j].impact === "low") continue;
        const start = latLonToVec3(MARKERS[i].lat, MARKERS[i].lon, globeRadius + 0.05);
        const end = latLonToVec3(MARKERS[j].lat, MARKERS[j].lon, globeRadius + 0.05);
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(globeRadius + 0.8);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const points = curve.getPoints(40);
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, arcMat.clone());
        line.material.opacity = 0.1 + Math.random() * 0.15;
        arcGroup.add(line);
        arcs.push({ line, phase: Math.random() * Math.PI * 2 });
      }
    }

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0x00c9a7, 0.6);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, -2, -3);
    scene.add(fillLight);

    // Starfield background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 30 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.5 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(markerGroup.children.filter(c => c.userData.isMarker));
      if (intersects.length > 0) {
        onMarkerClick(intersects[0].object.userData.marker);
      }
    };
    renderer.domElement.addEventListener("click", handleClick);

    // Auto-rotation + scroll-based camera
    let scrollProgress = 0;
    const onScroll = () => {
      scrollProgress = Math.min(1, window.scrollY / (window.innerHeight * 2.5));
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      animId = requestAnimationFrame(animate);

      // Globe rotation
      globeGroup.rotation.y = elapsed * 0.08;
      markerGroup.rotation.y = elapsed * 0.08;
      arcGroup.rotation.y = elapsed * 0.08;

      // Scroll-driven camera zoom
      const targetZ = 8 - scrollProgress * 3;
      camera.position.z += (targetZ - camera.position.z) * 0.05;

      // Pulse markers
      markers.forEach((m) => {
        if (m.pulse) {
          const t = (elapsed + m.pulse.userData.phase) % 2.5;
          const scale = 0.2 + (t / 2.5) * 1.2;
          m.pulse.scale.set(scale, scale, 1);
          m.pulse.material.opacity = Math.max(0, 0.6 - (t / 2.5) * 0.6);
        }
      });

      // Animate arcs opacity
      arcs.forEach((a) => {
        a.line.material.opacity = 0.08 + Math.sin(elapsed * 0.5 + a.phase) * 0.06 + 0.06;
      });

      // Starfield slow rotation
      stars.rotation.y = elapsed * 0.005;

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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

  // Focus on a marker when selected
  useEffect(() => {
    if (!focusMarker) return;
    // Could animate camera to marker — keeping simple for now
  }, [focusMarker]);

  return <div className="mx-globe-canvas" ref={mountRef} />;
}

function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
