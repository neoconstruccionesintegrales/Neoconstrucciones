import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ImageReveal from './ImageReveal';
import FadeIn from '../components/Fadein';
import '../style/inicio.css';

function Inicio() {
  const navigate = useNavigate();
  const [servicios, setServicios] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [servicioVideo, setServicioVideo] = useState(null);

  const heroRef = useRef(null);
  const heroInnerRef = useRef(null);

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

  // Cargar servicios
  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || '${API_URL}';
    fetch(`${API_URL}/api/servicios`)
      .then(res => res.json())
      .then(data => {
        let lista = [];
        if (Array.isArray(data)) lista = data;
        else if (data && Array.isArray(data.data)) lista = data.data;
        else if (data && Array.isArray(data.servicios)) lista = data.servicios;
        else if (data && typeof data === 'object') {
          const posibleArray = Object.values(data).find(v => Array.isArray(v));
          if (posibleArray) lista = posibleArray;
        }
        setServicios(lista);
      })
      .catch(() => setServicios([]));
  }, []);

  const categorias = [
    { key: 'EST', nombre: 'Estructuras Metálicas', descripcion: 'Diseño, fabricación y montaje de estructuras metálicas de alta resistencia para proyectos industriales y comerciales.', color: '#1391c8', icono: '🏗️' },
    { key: 'ACA', nombre: 'Acabados', descripcion: 'Acabados de calidad superior en pintura, drywall, pisos y revestimientos para espacios residenciales e industriales.', color: '#00adb5', icono: '🎨' },
    { key: 'CIV', nombre: 'Obra Civil', descripcion: 'Construcción de cimentaciones, muros, losas y estructuras de concreto con los más altos estándares.', color: '#005a87', icono: '🏛️' }
  ];

  const serviciosPorCategoria = (key) => servicios.filter(s => s.idServicio && s.idServicio.startsWith(key));
  const toggleCategoria = (key) => setCategoriaActiva(categoriaActiva === key ? null : key);
  const abrirVideo = (servicio) => setServicioVideo(servicio);
  const cerrarVideo = () => setServicioVideo(null);

  const stats = [
    { valor: '25B+', label: 'Pesos en proyectos' },
    { valor: '15', label: 'Años de experiencia' },
    { valor: '98%', label: 'Clientes satisfechos' }
  ];

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Header />

      {/* ===== HERO ===== */}
      <div className="hero-fade-container">
        <div ref={heroRef} className="inicio-hero">
          <div ref={heroInnerRef} className="inicio-hero-inner">
            <FadeIn direction="down">
              <div className="inicio-hero-badge">
                <span className="inicio-hero-badge-dot"></span>
                Especialistas en estructuras metálicas
              </div>
            </FadeIn>

            <FadeIn direction="up" delay={0.15}>
              <h1 className="inicio-hero-title">
                Construimos el<br />futuro en acero
              </h1>
            </FadeIn>

            <FadeIn direction="up" delay={0.3}>
              <p className="inicio-hero-sub">
                Más de 15 años diseñando, fabricando e instalando<br />
                estructuras metálicas de alta resistencia para proyectos<br />
                industriales y comerciales en Colombia.
              </p>
            </FadeIn>

            <FadeIn direction="up" delay={0.45}>
              <div className="inicio-hero-cta">
                <button className="inicio-btn-primary" onClick={() => navigate('/simulador')}>
                  📊 Presupuesta tu proyecto hoy
                </button>
                <button className="inicio-btn-secondary" onClick={() => navigate('/agendar-cita')}>
                  📅 Agendar Visita
                </button>
              </div>
            </FadeIn>

            <FadeIn direction="up" delay={0.6}>
              <div className="inicio-stats">
                {stats.map((stat, i) => (
                  <div key={i} className="inicio-stat-item">
                    <span className="inicio-stat-value">{stat.valor}</span>
                    <span className="inicio-stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* ===== SERVICIOS ===== */}
      <section className="inicio-servicios" id="catalogo">
        <div className="inicio-servicios-header">
          <FadeIn direction="up">
            <span className="inicio-section-label">NUESTROS SERVICIOS</span>
            <h2 className="inicio-section-title">Soluciones integrales para tu obra</h2>
          </FadeIn>
        </div>

        <div className="inicio-cards-grid">
          {categorias.map((cat, idx) => {
            const serviciosCat = serviciosPorCategoria(cat.key);
            const isActive = categoriaActiva === cat.key;

            return (
              <FadeIn key={cat.key} direction="up" delay={idx * 0.1}>
                <div className="inicio-card" style={{ borderTopColor: cat.color }}>
                  <div className="inicio-card-icon" style={{ color: cat.color }}>
                    {cat.icono}
                  </div>

                  <h3 className="inicio-card-title" style={{ color: cat.color }}>{cat.nombre}</h3>
                  <p className="inicio-card-desc">{cat.descripcion}</p>

                  <button onClick={() => toggleCategoria(cat.key)} className="inicio-card-vermas">
                    {isActive ? 'Ver menos' : 'Ver más'}
                    <span>{isActive ? '▲' : '▼'}</span>
                  </button>

                  {isActive && (
                    <div className="inicio-servicios-list">
                      {serviciosCat.length > 0 ? (
                        <ul>
                          {serviciosCat.map(s => (
                            <li key={s._id || s.idServicio}>
                              <span className="inicio-id-badge">{s.idServicio}</span>
                              <button onClick={() => abrirVideo(s)} className="inicio-nombre-btn">
                                {s.nombre}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="inicio-no-data">No hay servicios en esta categoría.</p>
                      )}
                    </div>
                  )}
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ===== IMAGE REVEAL SECTIONS ===== */}
      <div className="reveal-section">
        <FadeIn direction="left" className="reveal-section-text">
          <div>
            <span className="inicio-section-label">EQUIPO ESPECIALIZADO</span>
            <h2>La búsqueda nunca se detiene</h2>
            <p>
              No esperamos a que ocurra una emergencia para buscar un equipo especializado.
              Estamos constantemente buscando profesionales de primer nivel en estructuras
              metálicas, acabados y obra civil.
            </p>
          </div>
        </FadeIn>
        <FadeIn direction="right" className="reveal-section-img">
          <ImageReveal
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=700&h=450&fit=crop"
            alt="Equipo de trabajo en obra"
          />
        </FadeIn>
      </div>

      <div className="section-spacer"></div>

      <div className="reveal-section">
        <FadeIn direction="right" className="reveal-section-text">
          <div>
            <span className="inicio-section-label">PRECISIÓN INDUSTRIAL</span>
            <h2>La habilidad es nuestra moneda</h2>
            <p>
              Nos especializamos en entornos de alto riesgo: plantas de energía,
              infraestructura de gas, centros de datos y semiconductores. En estas industrias,
              la precisión no es opcional.
            </p>
          </div>
        </FadeIn>
        <FadeIn direction="left" className="reveal-section-img">
          <ImageReveal
            src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=700&h=450&fit=crop"
            alt="Trabajadores industriales"
          />
        </FadeIn>
      </div>

      <div className="section-spacer"></div>

      {/* ===== DARK CTA ===== */}
      <div className="dark-cta-section">
        <div className="dark-cta-inner">
          <FadeIn direction="up">
            <h2>¿Listo para tu próximo proyecto?</h2>
          </FadeIn>
          <FadeIn direction="up" delay={0.15}>
            <p>
              Obtén una cotización personalizada en minutos con nuestro simulador virtual.
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.3}>
            <div className="dark-cta-btn-group">
              <button className="dark-cta-btn" onClick={() => navigate('/simulador')}>
                📊 Presupuesta tu proyecto hoy
              </button>
              <button className="dark-cta-btn secondary" onClick={() => navigate('/agendar-cita')}>
                📅 Agendar Visita
              </button>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {servicioVideo && (
        <div className="inicio-modal-overlay" onClick={cerrarVideo}>
          <div className="inicio-modal-content" onClick={e => e.stopPropagation()}>
            <div className="inicio-modal-header">
              <h3>🎬 {servicioVideo.nombre}</h3>
              <button onClick={cerrarVideo} className="inicio-modal-close">✕</button>
            </div>
            <div className="inicio-modal-body">
              {servicioVideo.videoUrl ? (
                <iframe
                  src={servicioVideo.videoUrl}
                  title={servicioVideo.nombre}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="inicio-modal-novideo">
                  <span style={{ fontSize: '64px' }}>🎬</span>
                  <p>No hay video disponible</p>
                  <p>ID: {servicioVideo.idServicio}</p>
                </div>
              )}
            </div>
            <div className="inicio-modal-footer">
              <span className="inicio-modal-id">{servicioVideo.idServicio}</span>
              <span className="inicio-modal-precio">
                ${Number(servicioVideo.precioUnitario || 0).toLocaleString('es-CO')} / {servicioVideo.unidad || 'm²'}
              </span>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

export default Inicio;