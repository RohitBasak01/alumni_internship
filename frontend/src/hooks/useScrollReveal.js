import { useEffect, useRef } from "react";

/**
 * useScrollReveal — Awwwards-style scroll-triggered element reveals.
 *
 * Observes every `.reveal` element inside the given container ref
 * (or document.body if no ref). When an element enters the viewport
 * at 15% visibility, it receives the `.reveal--visible` class which
 * triggers the CSS animation defined in animations.css.
 *
 * Uses IntersectionObserver for zero-dependency, 60fps performance.
 * Respects `prefers-reduced-motion` by making elements visible immediately.
 */
export function useScrollReveal(containerRef) {
  const observerRef = useRef(null);

  useEffect(() => {
    // Respect reduced-motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const root = containerRef?.current || document.body;
    const elements = root.querySelectorAll(".reveal");

    if (!elements.length) return;

    if (prefersReducedMotion) {
      // Make everything visible immediately
      elements.forEach((el) => el.classList.add("reveal--visible"));
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            // Once revealed, stop observing (one-shot)
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    elements.forEach((el) => observerRef.current.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [containerRef]);
}
