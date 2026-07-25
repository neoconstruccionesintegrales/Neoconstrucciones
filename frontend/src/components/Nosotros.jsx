import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FadeIn from '../components/Fadein';
import ImageReveal from '../components/ImageReveal';
import '../style/nosotros.css';

function Nosotros() {
  const navigate = useNavigate();

  // ===== REFS PARA EL EFECTO FADE DEL HERO =====
  const heroRef = useRef(null);
  const heroInnerRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ===== EFECTO: HERO FADE ON SCROLL =====
  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current || !heroInnerRef.current) return;

      const scrollY = window.scrollY;
      const heroHeight = heroRef.current.offsetHeight;

      const fadeStart = 0;
      const fadeEnd = heroHeight * 0.8;
      const opacity = Math.max(0, 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart));
      const maxTranslate = 50;
      const translateY = Math.min(scrollY * 0.15, maxTranslate);

      heroInnerRef.current.style.opacity = opacity > 0 ? opacity : 0;
      heroInnerRef.current.style.transform = `translateY(${translateY}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const hitos = [
    { año: '2010', titulo: 'Fundación', desc: 'Nacimiento de Neoconstrucciones Integrales S.A.S. con enfoque en estructuras metálicas.' },
    { año: '2014', titulo: 'Expansión', desc: 'Incorporación de división de obra civil y acabados industriales.' },
    { año: '2018', titulo: 'Certificación', desc: 'Obtención de certificaciones ISO en calidad y seguridad industrial.' },
    { año: '2022', titulo: 'Liderazgo', desc: 'Reconocimiento como top 3 en fabricación de estructuras metálicas en Colombia.' },
    { año: '2025', titulo: 'Innovación', desc: 'Lanzamiento del simulador virtual y digitalización de procesos.' },
  ];

  const valores = [
    { icono: '🤝', nombre: 'Confianza', desc: 'Pleno cumplimiento en cada proyecto' },
    { icono: '💡', nombre: 'Innovación', desc: 'Soluciones constantes y efectivas' },
    { icono: '✅', nombre: 'Calidad', desc: 'Estándares elevados en materiales' },
    { icono: '⏱️', nombre: 'Puntualidad', desc: 'Cumplimiento de tiempos de entrega' },
    { icono: '👨‍🔧', nombre: 'Profesionalismo', desc: 'Personal idóneo y capacitado' },
    { icono: '⚡', nombre: 'Eficiencia', desc: 'Optimización de recursos' },
    { icono: '🎯', nombre: 'Orientación al Cliente', desc: 'Priorización de necesidades' },
    { icono: '🛡️', nombre: 'Responsabilidad', desc: 'Compromiso con la rentabilidad' },
  ];

  const pilares = [
    { num: '15+', label: 'Años de experiencia', icono: '🏗️' },
    { num: '200+', label: 'Proyectos entregados', icono: '📋' },
    { num: '50+', label: 'Clientes satisfechos', icono: '🤝' },
  ];

  return (
    <div className="nosotros-page">
      <Header />

      {/* ===== HERO CON FADE ON SCROLL ===== */}
      <div className="hero-fade-container">
        <section ref={heroRef} className="nos-hero">
          <div ref={heroInnerRef} className="nos-hero-inner">
            <FadeIn direction="down">
              <span className="nos-hero-badge">🏗️ Construyendo desde 2010</span>
            </FadeIn>
            <FadeIn direction="up" delay={0.15}>
              <h1 className="nos-hero-title">
                Nuestra<br />Identidad
              </h1>
            </FadeIn>
            <FadeIn direction="up" delay={0.3}>
              <p className="nos-hero-sub">
                Más de 15 años diseñando, fabricando e instalando<br />
                estructuras metálicas de alta resistencia para proyectos<br />
                industriales y comerciales en Colombia.
              </p>
            </FadeIn>
            <FadeIn direction="up" delay={0.45}>
              <div className="nos-hero-stats">
                {pilares.map((p, i) => (
                  <div key={i} className="nos-stat">
                    <span className="nos-stat-icon">{p.icono}</span>
                    <span className="nos-stat-num">{p.num}</span>
                    <span className="nos-stat-label">{p.label}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      </div>

      {/* ===== MISIÓN Y VISIÓN — CARDS INTERACTIVAS ===== */}
      <section className="nos-mv-section">
        <div className="nos-mv-grid">
          {/* MISIÓN */}
          <FadeIn direction="up" delay={0}>
            <div className="nos-mv-card-interactive" onClick={(e) => e.currentTarget.classList.toggle('active')}>
              <div className="nos-mv-bg" style={{backgroundImage: `url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=800&fit=crop')`}} />
              
              <div className="nos-mv-front">
                <div className="nos-mv-icon-big">🎯</div>
                <h2>Misión</h2>
                <span className="nos-mv-hint">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
                  Descubre más
                </span>
              </div>
              
              <div className="nos-mv-back">
                <h3><span className="nos-mv-back-icon">🎯</span> Nuestra Misión</h3>
                <p>Brindar pleno cumplimiento y confianza con innovaciones constantes y efectivas para las necesidades de cada uno de nuestros clientes y estándares de alta calidad.</p>
                <ul>
                  <li><span className="nos-dot" />Dar y brindar toda la importancia a cada cliente</li>
                  <li><span className="nos-dot" />Demostrar profesionalismo y priorizar necesidades</li>
                  <li><span className="nos-dot" />Personal idóneo y capacitado</li>
                  <li><span className="nos-dot" />Mejora continua e innovación</li>
                  <li><span className="nos-dot" />Eficiente utilización de recursos</li>
                </ul>
              </div>
            </div>
          </FadeIn>

          {/* VISIÓN */}
          <FadeIn direction="up" delay={0.15}>
            <div className="nos-mv-card-interactive nos-mv-vision" onClick={(e) => e.currentTarget.classList.toggle('active')}>
              <div className="nos-mv-bg" style={{backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=800&fit=crop')`}} />
              
              <div className="nos-mv-front">
                <div className="nos-mv-icon-big">👁️</div>
                <h2>Visión</h2>
                <span className="nos-mv-hint">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
                  Descubre más
                </span>
              </div>
              
              <div className="nos-mv-back">
                <h3><span className="nos-mv-back-icon">👁️</span> Nuestra Visión</h3>
                <p>Ser una empresa líder y reconocida en la fabricación y montaje de estructuras metálicas a nivel nacional, permitiendo nuestra expansión soportada por puntualidad en tiempos de entrega y alta calidad.</p>
                <ul>
                  <li><span className="nos-dot nos-dot-vision" />Liderazgo nacional</li>
                  <li><span className="nos-dot nos-dot-vision" />Excelencia técnica</li>
                  <li><span className="nos-dot nos-dot-vision" />Puntualidad y alta calidad</li>
                  <li><span className="nos-dot nos-dot-vision" />Satisfacción del cliente</li>
                </ul>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== COMPROMISO — CON IMAGEREVEAL ===== */}
      <section className="nos-compromiso">
        <div className="nos-comp-inner">
          <FadeIn direction="left">
            <div className="nos-comp-text">
              <span className="nos-comp-label">Compromiso con la excelencia</span>
              <h2>Cada proyecto es una oportunidad para demostrar por qué somos líderes</h2>
              <p>
                Nuestro equipo de ingenieros y técnicos certificados trabaja con los 
                más altos estándares de calidad, seguridad y puntualidad. Desde el 
                diseño estructural hasta el montaje final, controlamos cada etapa 
                para garantizar resultados que superen expectativas.
              </p>
              <div className="nos-comp-features">
                <div className="nos-comp-feat">
                  <span className="nos-comp-feat-icon">🔧</span>
                  <div>
                    <strong>Ingeniería propia</strong>
                    <span>Diseño calculado y optimizado</span>
                  </div>
                </div>
                <div className="nos-comp-feat">
                  <span className="nos-comp-feat-icon">📐</span>
                  <div>
                    <strong>Fabricación CNC</strong>
                    <span>Precisión milimétrica garantizada</span>
                  </div>
                </div>
                <div className="nos-comp-feat">
                  <span className="nos-comp-feat-icon">🏗️</span>
                  <div>
                    <strong>Montaje especializado</strong>
                    <span>Equipos certificados en altura</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
          <FadeIn direction="right" delay={0.2}>
            <ImageReveal
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=700&h=500&fit=crop"
              alt="Equipo de trabajo en obra"
              className="nos-comp-img-wrapper"
            />
          </FadeIn>
        </div>
      </section>

      {/* ===== VALORES CORPORATIVOS ===== */}
      <section className="nos-valores-section">
        <div className="nos-valores-header">
          <FadeIn direction="up">
            <span className="nos-section-label">NUESTROS PILARES</span>
            <h2>Valores Corporativos</h2>
            <p>Los principios que guían cada decisión en Neoconstrucciones</p>
          </FadeIn>
        </div>
        <div className="nos-valores-grid">
          {valores.map((v, i) => (
            <FadeIn key={v.nombre} direction="up" delay={i * 0.06}>
              <div className="nos-valor-card">
                <span className="nos-valor-icon">{v.icono}</span>
                <h3>{v.nombre}</h3>
                <p>{v.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ===== SEGURIDAD — CON IMAGEREVEAL ===== */}
      <section className="nos-seguridad">
        <div className="nos-seg-inner">
          <FadeIn direction="right">
            <ImageReveal
              src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=700&h=500&fit=crop"
              alt="Seguridad en obra"
              className="nos-seg-img-wrapper"
            />
          </FadeIn>
          <FadeIn direction="left" delay={0.2}>
            <div className="nos-seg-text">
              <span className="nos-seg-label">🛡️ Seguridad y Salud en el Trabajo</span>
              <h2>Seguridad ante todo</h2>
              <p>
                Priorizamos la integridad de nuestro personal en obra. Ejecutamos políticas 
                estrictas de cero accidentes bajo normatividades de protección vigentes, 
                dotación certificada y análisis de riesgo continuo en el montaje de 
                infraestructuras pesadas.
              </p>
              <div className="nos-seg-stats">
                <div className="nos-seg-stat">
                  <span className="nos-seg-stat-num">0</span>
                  <span className="nos-seg-stat-label">Accidentes graves<br />últimos 3 años</span>
                </div>
                <div className="nos-seg-stat">
                  <span className="nos-seg-stat-num">100%</span>
                  <span className="nos-seg-stat-label">Personal con<br />dotación EPP</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== LÍNEA DE TIEMPO ===== */}
      <section className="nos-timeline-section">
        <div className="nos-timeline-header">
          <FadeIn direction="up">
            <span className="nos-section-label">NUESTRA HISTORIA</span>
            <h2>15 años de trayectoria</h2>
            <p>De una idea a líderes en estructuras metálicas en Colombia</p>
          </FadeIn>
        </div>
        <div className="nos-timeline">
          {hitos.map((h, i) => (
            <FadeIn key={h.año} direction="up" delay={i * 0.1}>
              <div className={`nos-timeline-item ${i % 2 === 0 ? 'left' : 'right'}`}>
                <div className="nos-timeline-content">
                  <span className="nos-timeline-año">{h.año}</span>
                  <h3>{h.titulo}</h3>
                  <p>{h.desc}</p>
                </div>
                <div className="nos-timeline-dot" />
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ===== RESPONSABILIDAD SOCIAL ===== */}
      <section className="nos-rse-section">
        <div className="nos-rse-inner">
          <FadeIn direction="up">
            <div className="nos-rse-card">
              <span className="nos-rse-icon">🌱</span>
              <h2>Responsabilidad Social</h2>
              <p>
                Nos comprometemos con el desarrollo sostenible de Bogotá y el país. 
                Optimizamos el uso de recursos constructivos, mitigamos el impacto ambiental 
                en los frentes de obra y promovemos empleo digno, legal y capacitado para 
                el sector de la construcción metalmecánica.
              </p>
              <div className="nos-rse-principios">
                <span className="nos-rse-badge">Calidad</span>
                <span className="nos-rse-badge">Cumplimiento</span>
                <span className="nos-rse-badge">Eficiencia</span>
                <span className="nos-rse-badge">Servicio</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="nos-cta-section">
        <div className="nos-cta-inner">
          <FadeIn direction="up">
            <h2>¿Conoces nuestra capacidad?</h2>
          </FadeIn>
          <FadeIn direction="up" delay={0.15}>
            <p>
              Descubre cómo hemos transformado proyectos de ingeniería en realidades 
              concretas a lo largo de una década y media.
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.3}>
            <div className="nos-cta-btns">
              <button className="nos-cta-btn primary" onClick={() => navigate('/galeria-videos')}>
                🎬 Ver proyectos realizados
              </button>
              <button className="nos-cta-btn secondary" onClick={() => navigate('/simulador')}>
                📊 Simular mi proyecto
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Nosotros;