import React, { useEffect, useRef } from 'react';

/**
 * ImageReveal - Componente que aplica el efecto de revelado de imágenes
 * al estilo Vectr. La imagen comienza con escala aumentada y baja opacidad,
 * y al entrar en el viewport se anima suavemente.
 */
function ImageReveal({ src, alt, className = '' }) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px'
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className={`reveal-img-wrapper ${className}`}>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

export default ImageReveal;
