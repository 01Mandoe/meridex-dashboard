import { useEffect, useRef } from "react";
import { EVENTS, IC } from "../data";

/**
 * Animated network graph canvas.
 * Nodes = countries, positioned in a loose circular layout.
 * Edges pulse with data traveling along them in teal.
 * High-impact nodes glow brighter.
 */
export function NetworkGraph() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");

    let w = 0;
    let h = 0;
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Build nodes from EVENTS
    const entries = Object.entries(EVENTS);
    const nodeCount = entries.length;
    const cx = () => w / 2;
    const cy = () => h / 2;
    const radius = () => Math.min(w, h) * 0.32;

    const nodes = entries.map(([code, ev], i) => {
      const angle = (i / nodeCount) * Math.PI * 2;
      return {
        code,
        name: ev.name,
        impact: ev.impact,
        flag: ev.flag,
        angle,
        baseAngle: angle,
        x: 0,
        y: 0,
        pulse: Math.random() * Math.PI * 2,
        glow: ev.impact === "high" ? 1 : ev.impact === "medium" ? 0.6 : 0.35,
      };
    });

    // Build edges — connect each node to 2-3 nearest neighbors
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.abs(nodes[i].angle - nodes[j].angle);
        const wrapped = Math.min(dist, Math.PI * 2 - dist);
        if (wrapped < (Math.PI * 2) / nodeCount * 1.5) {
          edges.push({
            from: i,
            to: j,
            progress: Math.random(),
            speed: 0.003 + Math.random() * 0.005,
          });
        }
      }
    }

    let raf = null;
    let rotation = 0;

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      rotation += 0.0015;

      // Update node positions
      const r = radius();
      const cxs = cx();
      const cys = cy();
      for (const node of nodes) {
        node.angle = node.baseAngle + rotation;
        node.x = cxs + Math.cos(node.angle) * r;
        node.y = cys + Math.sin(node.angle) * r;
        node.pulse += 0.03;
      }

      // Draw edges
      for (const edge of edges) {
        const a = nodes[edge.from];
        const b = nodes[edge.to];
        edge.progress += edge.speed;
        if (edge.progress > 1) edge.progress = 0;

        // Static line
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = "rgba(0, 201, 167, 0.06)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Traveling pulse
        const px = a.x + (b.x - a.x) * edge.progress;
        const py = a.y + (b.y - a.y) * edge.progress;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 201, 167, 0.8)";
        ctx.fill();
      }

      // Draw nodes
      for (const node of nodes) {
        const color = IC[node.impact];
        const breathe = 0.7 + Math.sin(node.pulse) * 0.3;
        const glowSize = node.glow * breathe;

        // Outer glow
        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 12 + glowSize * 8);
        grad.addColorStop(0, color + "cc");
        grad.addColorStop(0.4, color + "33");
        grad.addColorStop(1, color + "00");
        ctx.beginPath();
        ctx.arc(node.x, node.y, 12 + glowSize * 8, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5 + glowSize * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="mx-land-network-canvas" />;
}
