import React, { useEffect, useRef, useState } from 'react';
import '../style/fade-in.css';

/*
  Uso:
  <FadeIn direction="up" delay={0.2} duration={0.6}>
    <h1>Tu contenido</h1>
  </FadeIn>

  Props:
  - direction: 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale'
  - delay: segundos (default: 0)
  - duration: segundos (default: 0.6)
  - threshold: 0-1, cuánto debe verse para activar (default: 0.15)
  - once: true/false, si solo anima una vez (default: true)
  - className: clases extra
*/

function FadeIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  threshold = 0.15,
  once = true,
  className = '',
}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(element);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, threshold]);

  const directionClass = `fade-${direction}`;
  const visibleClass = isVisible ? 'fade-visible' : '';

  return (
    <div
      ref={ref}
      className={`fade-wrapper ${directionClass} ${visibleClass} ${className}`}
      style={{
        transitionDelay: `${delay}s`,
        transitionDuration: `${duration}s`,
      }}
    >
      {children}
    </div>
  );
}

export default FadeIn;