import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { MARKERS, IMPACT_COLORS } from "../data.js";

/* Continent outline polygons [lon, lat] */
const CONTINENTS = {
  northAmerica: [[-168,65],[-155,70],[-140,72],[-125,70],[-110,60],[-100,55],[-95,50],[-85,45],[-80,40],[-75,35],[-80,25],[-90,18],[-100,15],[-105,22],[-115,30],[-125,35],[-130,45],[-135,55],[-150,60],[-165,62]],
  southAmerica: [[-80,10],[-75,5],[-70,0],[-65,-5],[-60,-15],[-55,-25],[-55,-35],[-60,-45],[-70,-55],[-75,-50],[-80,-40],[-82,-30],[-80,-20],[-78,-10],[-80,0],[-82,8]],
  europe: [[-10,60],[0,65],[10,68],[20,65],[30,60],[35,55],[40,50],[35,45],[25,40],[15,38],[5,42],[-5,45],[-10,50]],
  africa: [[-15,35],[-5,30],[5,28],[15,30],[25,32],[35,30],[40,22],[45,15],[48,5],[45,-5],[40,-15],[35,-25],[30,-34],[25,-34],[20,-30],[15,-20],[10,-10],[5,0],[0,5],[-5,10],[-12,20],[-15,28]],
  asia: [[35,45],[45,50],[55,55],[65,60],[75,65],[85,70],[100,72],[115,70],[130,65],[140,55],[145,50],[140,40],[135,35],[130,25],[120,20],[110,18],[105,10],[100,5],[95,15],[85,20],[75,25],[65,30],[55,35],[45,38],[38,42]],
  australia: [[115,-20],[125,-18],[135,-15],[145,-18],[150,-25],[148,-35],[140,-38],[130,-35],[120,-33],[115,-28]],
};

function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function makeRadialTexture(innerColor, outerAlpha) {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.4, innerColor);
  grad.addColorStop(1, `rgba(0,0,0,${outerAlpha !== undefined ? outerAlpha : 0})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function DigitalGlobe({ onMarkerClick, activeMarker }) {
  const mountRef = useRef(null);
  const apiRef = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = () => mount.clientWidth || 800;
    const H = () => mount.clientHeight || 800;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.1, 1000);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W(), H());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const R = 2.2;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    /* ── Core sphere (deep ocean) ── */
    const oceanMat = new THREE.MeshPhongMaterial({
      color: 0x061218, transparent: true, opacity: 0.95, shininess: 12,
    });
    globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(R, 72, 72), oceanMat));

    /* ── Wireframe grid ── */
    globeGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(R + 0.01, 40, 28),
      new THREE.MeshBasicMaterial({ color: 0x00c9a7, wireframe: true, transparent: true, opacity: 0.06 })
    ));

    /* ── Continent dot field ── */
    const dotGeo = new THREE.SphereGeometry(0.016, 6, 6);
    const landMat = new THREE.MeshBasicMaterial({ color: 0x00c9a7 });
    const landDimMat = new THREE.MeshBasicMaterial({ color: 0x007a66 });
    const allDots = [];

    Object.values(CONTINENTS).forEach((polygon) => {
      const lons = polygon.map(([lon]) => lon);
      const lats = polygon.map(([, lat]) => lat);
      const minLon = Math.min(...lons), maxLon = Math.max(...lons);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      for (let lat = maxLat; lat >= minLat; lat -= 2.2) {
        for (let lon = minLon; lon <= maxLon; lon += 2.2) {
          if (pointInPolygon(lon, lat, polygon)) {
            const isEdge = !pointInPolygon(lon + 2.2, lat, polygon) || !pointInPolygon(lon - 2.2, lat, polygon) || !pointInPolygon(lon, lat + 2.2, polygon) || !pointInPolygon(lon, lat - 2.2, polygon);
            const dot = new THREE.Mesh(dotGeo, isEdge ? landMat : landDimMat);
            dot.position.copy(latLonToVec3(lat, lon, R + 0.004));
            globeGroup.add(dot);
            allDots.push(dot);
          }
        }
      }
    });

    /* ── Lat/Lon rings ── */
    const ringMat = new THREE.LineBasicMaterial({ color: 0x00c9a7, transparent: true, opacity: 0.05 });
    for (let lat = -60; lat <= 60; lat += 20) {
      const pts = [];
      for (let lon = 0; lon <= 360; lon += 4) pts.push(latLonToVec3(lat, lon - 180, R + 0.012));
      globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    }
    for (let lon = 0; lon < 360; lon += 20) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 4) pts.push(latLonToVec3(lat, lon - 180, R + 0.012));
      globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    }

    /* ── Fresnel atmosphere ── */
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(0x00c9a7) } },
      vertexShader: `
        varying vec3 vNormal; varying vec3 vPos;
        void main(){ vNormal=normalize(normalMatrix*normal); vPos=(modelViewMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
      `,
      fragmentShader: `
        uniform vec3 glowColor; varying vec3 vNormal; varying vec3 vPos;
        void main(){ vec3 v=normalize(-vPos); float i=pow(0.65-dot(vNormal,v),3.5); gl_FragColor=vec4(glowColor,i*0.9); }
      `,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.18, 48, 48), atmoMat));

    /* ── Event markers with vertical beams + pulse sprites ── */
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    const markers = [];
    const beamMatCache = {};

    MARKERS.forEach((m) => {
      const hex = IMPACT_COLORS[m.impact];
      const color = new THREE.Color(hex);
      const pos = latLonToVec3(m.lat, m.lon, R + 0.04);
      const rgb = hexToRgb(hex);

      // Core sphere
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 14, 14),
        new THREE.MeshBasicMaterial({ color })
      );
      core.position.copy(pos);
      core.userData = { marker: m, isMarker: true };
      markerGroup.add(core);

      // Vertical beam (cylinder from surface outward)
      const beamHeight = m.impact === "high" ? 0.6 : m.impact === "medium" ? 0.4 : 0.25;
      const beamGeo = new THREE.CylinderGeometry(0.012, 0.004, beamHeight, 8, 1, true);
      if (!beamMatCache[hex]) {
        beamMatCache[hex] = new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false,
        });
      }
      const beam = new THREE.Mesh(beamGeo, beamMatCache[hex]);
      const beamPos = pos.clone().normalize().multiplyScalar(R + beamHeight / 2);
      beam.position.copy(beamPos);
      beam.lookAt(0, 0, 0);
      beam.rotateX(Math.PI / 2);
      markerGroup.add(beam);

      // Pulse sprite
      const pulseTex = makeRadialTexture(`rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`);
      const pulse = new THREE.Sprite(new THREE.SpriteMaterial({
        map: pulseTex, color, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      pulse.position.copy(pos);
      pulse.scale.set(0.35, 0.35, 1);
      markerGroup.add(pulse);

      markers.push({ core, beam, pulse, data: m, phase: Math.random() * Math.PI * 2 });
    });

    /* ── Arc connections with flowing particles ── */
    const arcGroup = new THREE.Group();
    scene.add(arcGroup);
    const arcs = [];
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);
    const particles = [];

    const particleTex = makeRadialTexture("rgba(255,255,255,0.9)");

    for (let i = 0; i < MARKERS.length; i++) {
      for (let j = i + 1; j < MARKERS.length; j++) {
        if (MARKERS[i].impact === "low" && MARKERS[j].impact === "low") continue;
        const start = latLonToVec3(MARKERS[i].lat, MARKERS[i].lon, R + 0.04);
        const end = latLonToVec3(MARKERS[j].lat, MARKERS[j].lon, R + 0.04);
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(R + 0.9);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

        const lineOpacity = 0.08 + Math.random() * 0.12;
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(50)),
          new THREE.LineBasicMaterial({ color: 0x00c9a7, transparent: true, opacity: lineOpacity })
        );
        arcGroup.add(line);
        arcs.push({ line, phase: Math.random() * Math.PI * 2, baseOpacity: lineOpacity });

        // Flowing particle along this arc
        const pCount = m_impact(i, j);
        for (let p = 0; p < pCount; p++) {
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: particleTex, color: 0x00c9a7, transparent: true,
            opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false,
          }));
          sprite.scale.set(0.08, 0.08, 1);
          particleGroup.add(sprite);
          particles.push({
            sprite, curve,
            t: p / pCount + Math.random() * 0.1,
            speed: 0.15 + Math.random() * 0.1,
          });
        }
      }
    }

    function m_impact(i, j) {
      const a = MARKERS[i].impact, b = MARKERS[j].impact;
      if (a === "high" && b === "high") return 2;
      return 1;
    }

    /* ── Lighting ── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const keyLight = new THREE.DirectionalLight(0x00e5c8, 0.7);
    keyLight.position.set(5, 3, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.25);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    /* ── Starfield ── */
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPos = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const r = 35 + Math.random() * 25;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(p) * Math.cos(t);
      starPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      starPos[i * 3 + 2] = r * Math.cos(p);
      starSizes[i] = Math.random() * 0.1 + 0.03;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.06, transparent: true, opacity: 0.6, sizeAttenuation: true,
    }));
    scene.add(stars);

    /* ── Raycaster for clicks ── */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const handleClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(markerGroup.children.filter(c => c.userData.isMarker));
      if (hits.length > 0 && onMarkerClick) onMarkerClick(hits[0].object.userData.marker);
    };
    let isDragging = false, dragStart = { x: 0, y: 0 };
    renderer.domElement.addEventListener("pointerdown", (e) => { isDragging = false; dragStart = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener("pointermove", (e) => {
      if (Math.abs(e.clientX - dragStart.x) > 5 || Math.abs(e.clientY - dragStart.y) > 5) isDragging = true;
    });
    renderer.domElement.addEventListener("pointerup", (e) => {
      if (!isDragging) handleClick(e);
    });

    /* ── Scroll + auto-rotation ── */
    let scrollProgress = 0;
    const onScroll = () => { scrollProgress = Math.min(1, window.scrollY / (window.innerHeight * 2)); };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Mouse drag rotation
    let dragRot = { x: 0, y: 0 };
    let targetDragRot = { x: 0, y: 0 };
    let isMouseDown = false, lastMouse = { x: 0, y: 0 };
    renderer.domElement.addEventListener("pointerdown", (e) => { isMouseDown = true; lastMouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener("pointerup", () => { isMouseDown = false; });
    window.addEventListener("pointermove", (e) => {
      if (isMouseDown) {
        targetDragRot.y += (e.clientX - lastMouse.x) * 0.005;
        targetDragRot.x += (e.clientY - lastMouse.y) * 0.005;
        targetDragRot.x = Math.max(-0.8, Math.min(0.8, targetDragRot.x));
        lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    /* ── Animation loop ── */
    const clock = new THREE.Clock();
    let animId;
    const animate = () => {
      const t = clock.getElapsedTime();
      animId = requestAnimationFrame(animate);

      // Smooth drag
      dragRot.x += (targetDragRot.x - dragRot.x) * 0.08;
      dragRot.y += (targetDragRot.y - dragRot.y) * 0.08;

      // Auto-rotate + drag
      globeGroup.rotation.y = t * 0.06 + dragRot.y;
      globeGroup.rotation.x = dragRot.x;
      markerGroup.rotation.y = t * 0.06 + dragRot.y;
      markerGroup.rotation.x = dragRot.x;
      arcGroup.rotation.y = t * 0.06 + dragRot.y;
      arcGroup.rotation.x = dragRot.x;
      particleGroup.rotation.y = t * 0.06 + dragRot.y;
      particleGroup.rotation.x = dragRot.x;

      // Scroll zoom
      const targetZ = 9 - scrollProgress * 3.5;
      camera.position.z += (targetZ - camera.position.z) * 0.04;

      // Pulse markers
      markers.forEach((m) => {
        const phase = (t * 0.8 + m.phase) % 2.5;
        const s = 0.25 + (phase / 2.5) * 1.0;
        m.pulse.scale.set(s, s, 1);
        m.pulse.material.opacity = Math.max(0, 0.5 - (phase / 2.5) * 0.5);
        // Beam subtle flicker
        if (m.beam.material) m.beam.material.opacity = 0.35 + Math.sin(t * 2 + m.phase) * 0.08;
      });

      // Arc opacity breathing
      arcs.forEach((a) => {
        a.line.material.opacity = a.baseOpacity + Math.sin(t * 0.4 + a.phase) * 0.04;
      });

      // Flowing particles
      particles.forEach((p) => {
        p.t += p.speed * 0.016;
        if (p.t > 1) p.t -= 1;
        const pt = p.curve.getPoint(p.t);
        p.sprite.position.copy(pt);
        p.sprite.material.opacity = 0.7 * Math.sin(p.t * Math.PI);
      });

      // Starfield
      stars.rotation.y = t * 0.003;

      renderer.render(scene, camera);
    };
    animate();

    /* ── Resize ── */
    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    };
    window.addEventListener("resize", onResize);

    apiRef.current = { camera, markers };

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", handleClick);
      if (mount && renderer.domElement) mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [onMarkerClick]);

  return <div className="mx-globe-canvas" ref={mountRef} />;
}
