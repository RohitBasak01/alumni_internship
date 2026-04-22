import { useState, useEffect } from "react";
import "./OptimizedImage.css";

/**
 * @param {Object} props
 * @param {string} props.src - The image source URL
 * @param {string} props.alt - Accessibility text
 * @param {string} [props.className] - CSS classes
 * @param {string} [props.placeholder] - Optional placeholder icon or initials
 */
export function OptimizedImage({ src, alt, className, placeholder }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
    img.onerror = () => setError(true);
  }, [src]);

  if (!src || error) {
    return (
      <div className={`image-fallback ${className}`} aria-label={alt}>
        {placeholder || alt.slice(0, 1)}
      </div>
    );
  }

  return (
    <div className={`image-container ${loaded ? "loaded" : "loading"} ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={loaded ? "visible" : "hidden"}
      />
      {!loaded && <div className="shimmer" />}
    </div>
  );
}
