import React, { useState, useEffect, useRef } from 'react';
import '../style/lazy-image.css';

/*
  Uso:
  <LazyImage 
    src="https://..."
    alt="descripción"
    aspectRatio="16/9"
    placeholderColor="#e2e8f0"
  />

  Props:
  - src: URL de la imagen
  - alt: texto alternativo
  - aspectRatio: ratio del contenedor (default: "16/9")
  - placeholderColor: color del placeholder mientras carga (default: "#e2e8f0")
  - className: clases extra
*/

function LazyImage({
  src,
  alt,
  aspectRatio = '16/9',
  placeholderColor = '#e2e8f0',
  className = '',
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // Intersection Observer: solo cargar cuando esté cerca del viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Empezar a cargar 200px antes de que sea visible
        threshold: 0,
      }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Precargar imagen
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      setIsLoaded(true);
    };
    img.onerror = () => {
      setIsLoaded(true); // Mostrar imagen rota en vez de spinner infinito
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src]);

  return (
    <div
      ref={containerRef}
      className={`lazy-image-container ${className}`}
      style={{
        aspectRatio,
        backgroundColor: placeholderColor,
      }}
    >
      {/* Placeholder con blur */}
      {!isLoaded && (
        <div className="lazy-image-placeholder">
          <div className="lazy-image-shimmer" />
        </div>
      )}

      {/* Imagen real */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`lazy-image-img ${isLoaded ? 'loaded' : ''}`}
          loading="lazy"
        />
      )}
    </div>
  );
}

export default LazyImage;