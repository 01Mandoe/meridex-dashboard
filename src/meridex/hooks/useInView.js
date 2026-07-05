import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref and a boolean indicating whether the element is in view.
 * Uses IntersectionObserver with a configurable threshold.
 * Once revealed, stays revealed (no re-hide on scroll up).
 */
export function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}
