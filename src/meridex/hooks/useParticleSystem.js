import { useEffect, useRef } from "react";

/**
 * Full-screen canvas particle system.
 * Particles drift upward like floating data points.
 * Mouse repels nearby particles creating a ripple effect.
 *
 * @param {Object} opts
 * @param {number} opts.count       — particle count
 * @param {string} opts.color       — particle color (hex/rgba)
 * @param {number} opts.speed       — upward drift speed multiplier
 * @param {number} opts.repelRadius — mouse repel radius in px
 * @param {number} opts.repelForce  — repel strength
 */
export function useParticleSystem(canvasRef, opts = {}) {
  const {
    count = 120,
    color = "rgba(0, 201, 167, 0.6)",
    speed = 1,
    repelRadius = 120,
    repelForce = 0.4,
  } = opts;

  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef(null);
  const particlesRef = useRef([]);

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

    // Initialize particles
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(0.2 + Math.random() * 0.5) * speed,
        size: 0.8 + Math.random() * 1.8,
        opacity: 0.15 + Math.random() * 0.5,
        baseOpacity: 0.15 + Math.random() * 0.5,
        ox: 0,
        oy: 0,
      });
    }
    particlesRef.current = particles;

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse repel
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < repelRadius && dist > 0) {
          const force = (1 - dist / repelRadius) * repelForce;
          p.x += (dx / dist) * force * 2;
          p.y += (dy / dist) * force * 2;
        }

        // Drift
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        // Draw
        const alpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(/[\d.]+\)$/, `${alpha})`);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef, count, color, speed, repelRadius, repelForce]);
}
