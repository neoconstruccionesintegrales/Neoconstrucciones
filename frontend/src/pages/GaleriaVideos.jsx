import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FadeIn from '../components/Fadein';
import '../style/galeria-videos.css';

function GaleriaVideos() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('TODOS');
  const [videoSeleccionado, setVideoSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);

  // ===== REFS PARA EL EFECTO FADE DEL HERO =====
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

  const categorias = [
    { key: 'TODOS', nombre: 'Todos los videos', icono: '🎬' },
    { key: 'EST', nombre: 'Estructuras Metálicas', icono: '🏗️', color: '#1391c8' },
    { key: 'ACA', nombre: 'Acabados', icono: '🎨', color: '#00adb5' },
    { key: 'CIV', nombre: 'Obra Civil', icono: '🏛️', color: '#005a87' },
    { key: 'PRO', nombre: 'Procesos', icono: '⚙️', color: '#0d7377' },
  ];

  const videosDemo = [
    {
      _id: 'vid001',
      titulo: 'Montaje de nave industrial - Bogotá',
      descripcion: 'Proceso completo de montaje de estructura metálica para nave industrial de 2,500m² en zona industrial de Bogotá.',
      categoria: 'EST',
      thumbnail: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=640&h=360&fit=crop',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duracion: '4:32',
      fecha: '2025-03-15',
      cliente: 'Industrias del Acero SAS',
    },
    {
      _id: 'vid002',
      titulo: 'Fabricación de cerchas para cubierta',
      descripcion: 'Detalle del proceso de fabricación de cerchas metálicas con soldadura MIG y control de calidad.',
      categoria: 'EST',
      thumbnail: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=640&h=360&fit=crop',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duracion: '3:15',
      fecha: '2025-02-20',
      cliente: 'Constructora Andina',
    },
    {
      _id: 'vid003',
      titulo: 'Acabados en drywall - Oficinas corporativas',
      descripcion: 'Instalación de muros y cielos en drywall para oficinas de 800m² en centro empresarial.',
      categoria: 'ACA',
      thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=640&h=360&fit=crop',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duracion: '5:48',
      fecha: '2025-01-10',
      cliente: 'Grupo Empresarial XYZ',
    },
    {
      _id: 'vid004',
      titulo: 'Cimentación para torre de carga',
      descripcion: 'Excavación, armado de acero y vaciado de concreto para cimentación de torre de carga de 45 toneladas.',
      categoria: 'CIV',
      thumbnail: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=640&h=360&fit=crop',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duracion: '6:20',
      fecha: '2024-11-05',
      cliente: 'Minera del Norte',
    },
    {
      _id: 'vid005',
      titulo: 'Pintura industrial - Tanques de almacenamiento',
      descripcion: 'Aplicación de recubrimiento epóxico en tanques de almacenamiento con sandblasting previo.',
      categoria: 'ACA',
      thumbnail: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=640&h=360&fit=crop',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duracion: '4:10',
      fecha: '2024-09-18',
      cliente: 'Petroquímica Nacional',
    },
    {
      _id: 'vid006',
      titulo: 'Proceso de soldadura automatizada',
      descripcion: 'Demostración de soldadura robotizada para uniones de alta resistencia en perfiles estructurales.',
      categoria: 'PRO',
      thumbnail: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=640&h=360&fit=crop',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duracion: '2:45',
      fecha: '2024-08-22',
      cliente: 'Neo Construcciones',
    },
    {
      _id: 'vid007',
      titulo: 'Montaje de puente peatonal metálico',
      descripcion: 'Izado y ensamble de puente peatonal de 35 metros de luz libre en zona urbana.',
      categoria: 'EST',
      thumbnail: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=640&h=360&fit=crop',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duracion: '7:15',
      fecha: '2024-06-30',
      cliente: 'Alcaldía de Medellín',
    },
    {
      _id: 'vid008',
      titulo: 'Construcción de losa aligerada',
      descripcion: 'Proceso de encofrado, armado de acero y vaciado de losa aligerada para edificio de 5 pisos.',
      categoria: 'CIV',
      thumbnail: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=640&h=360&fit=crop',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duracion: '5:30',
      fecha: '2024-05-12',
      cliente: 'Inmobiliaria del Sur',
    },
    {
      _id: 'vid009',
      titulo: 'Control de calidad - Ensayos destructivos',
      descripcion: 'Procedimiento de ensayos de tracción y doblado para certificación de soldaduras.',
      categoria: 'PRO',
      thumbnail: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=640&h=360&fit=crop',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      duracion: '3:50',
      fecha: '2024-04-08',
      cliente: 'Neo Construcciones',
    },
  ];

  useEffect(() => {
    setCargando(true);
    const timer = setTimeout(() => {
      setVideos(videosDemo);
      setCargando(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const videosFiltrados = categoriaActiva === 'TODOS'
    ? videos
    : videos.filter(v => v.categoria === categoriaActiva);

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const abrirVideo = (video) => {
    setVideoSeleccionado(video);
    document.body.style.overflow = 'hidden';
  };

  const cerrarVideo = () => {
    setVideoSeleccionado(null);
    document.body.style.overflow = '';
  };

  return (
    <div className="galv-page">
      <Header />

      {/* ===== HERO CON FADE ON SCROLL ===== */}
      <div className="hero-fade-container">
        <section ref={heroRef} className="galv-hero">
          <div ref={heroInnerRef} className="galv-hero-inner">
            <FadeIn direction="down" delay={0}>
              <span className="galv-hero-badge">🎬 Nuestra experiencia en acción</span>
            </FadeIn>

            <FadeIn direction="up" delay={0.15}>
              <h1 className="galv-hero-title">
                Galería de<br />Proyectos
              </h1>
            </FadeIn>

            <FadeIn direction="up" delay={0.3}>
              <p className="galv-hero-sub">
                Revive los procesos de construcción, fabricación y montaje<br />
                de nuestras obras más representativas a lo largo de 15 años.
              </p>
            </FadeIn>

            <FadeIn direction="up" delay={0.45}>
              <div className="galv-hero-stats">
                <div className="galv-stat">
                  <span className="galv-stat-num">{videos.length}</span>
                  <span className="galv-stat-label">Videos disponibles</span>
                </div>
                <div className="galv-stat">
                  <span className="galv-stat-num">4</span>
                  <span className="galv-stat-label">Categorías</span>
                </div>
                <div className="galv-stat">
                  <span className="galv-stat-num">50+</span>
                  <span className="galv-stat-label">Clientes satisfechos</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      </div>

      {/* ===== FILTROS ===== */}
      <section className="galv-filtros">
        <div className="galv-filtros-inner">
          {categorias.map((cat, i) => {
            const count = cat.key === 'TODOS'
              ? videos.length
              : videos.filter(v => v.categoria === cat.key).length;
            const isActive = categoriaActiva === cat.key;
            return (
              <FadeIn key={cat.key} direction="up" delay={i * 0.05} duration={0.4}>
                <button
                  className={`galv-filtro-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setCategoriaActiva(cat.key)}
                  style={isActive && cat.color ? { borderColor: cat.color, color: cat.color } : {}}
                >
                  <span className="galv-filtro-icon">{cat.icono}</span>
                  <span className="galv-filtro-nombre">{cat.nombre}</span>
                  <span className="galv-filtro-count">{count}</span>
                </button>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ===== GRID DE VIDEOS ===== */}
      <section className="galv-grid-section">
        {cargando ? (
          <div className="galv-loading">
            <div className="galv-spinner"></div>
            <p>Cargando videos...</p>
          </div>
        ) : videosFiltrados.length === 0 ? (
          <FadeIn direction="scale">
            <div className="galv-empty">
              <span className="galv-empty-icon">📭</span>
              <h3>No hay videos en esta categoría</h3>
              <p>Selecciona otra categoría o vuelve pronto para ver nuevo contenido.</p>
            </div>
          </FadeIn>
        ) : (
          <div className="galv-grid">
            {videosFiltrados.map((video, i) => {
              const catInfo = categorias.find(c => c.key === video.categoria);
              return (
                <FadeIn
                  key={video._id}
                  direction="up"
                  delay={i * 0.08}
                  duration={0.5}
                >
                  <div
                    className="galv-card"
                    onClick={() => abrirVideo(video)}
                  >
                    <div className="galv-card-thumb">
                      <img src={video.thumbnail} alt={video.titulo} loading="lazy" />
                      <div className="galv-card-overlay">
                        <div className="galv-play-btn">
                          <span>▶</span>
                        </div>
                      </div>
                      <span className="galv-card-duracion">{video.duracion}</span>
                      <span
                        className="galv-card-cat-badge"
                        style={{ backgroundColor: catInfo?.color || '#1391c8' }}
                      >
                        {catInfo?.icono} {catInfo?.nombre}
                      </span>
                    </div>
                    <div className="galv-card-body">
                      <h3 className="galv-card-title">{video.titulo}</h3>
                      <p className="galv-card-desc">{video.descripcion}</p>
                      <div className="galv-card-meta">
                        <span className="galv-card-cliente">👤 {video.cliente}</span>
                        <span className="galv-card-fecha">📅 {formatearFecha(video.fecha)}</span>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== CTA ===== */}
      <section className="galv-cta-section">
        <div className="galv-cta-inner">
          <FadeIn direction="up">
            <h2>¿Listo para tu próximo proyecto?</h2>
          </FadeIn>
          <FadeIn direction="up" delay={0.15}>
            <p>
              Cada video que ves aquí representa una solución integral entregada a tiempo
              y con los más altos estándares de calidad.
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.3}>
            <div className="galv-cta-btns">
              <button className="galv-cta-btn primary" onClick={() => navigate('/simulador')}>
                📊 Simular mi proyecto
              </button>
              <button className="galv-cta-btn secondary" onClick={() => navigate('/agendar-cita')}>
                📅 Agendar visita técnica
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== MODAL DE VIDEO ===== */}
      {videoSeleccionado && (
        <div className="galv-modal-overlay" onClick={cerrarVideo}>
          <div className="galv-modal-content" onClick={e => e.stopPropagation()}>
            <div className="galv-modal-header">
              <div>
                <h3>{videoSeleccionado.titulo}</h3>
                <span className="galv-modal-cliente">{videoSeleccionado.cliente}</span>
              </div>
              <button className="galv-modal-close" onClick={cerrarVideo}>✕</button>
            </div>
            <div className="galv-modal-video">
              <iframe
                src={videoSeleccionado.videoUrl}
                title={videoSeleccionado.titulo}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="galv-modal-footer">
              <p>{videoSeleccionado.descripcion}</p>
              <span className="galv-modal-fecha">
                📅 Publicado el {formatearFecha(videoSeleccionado.fecha)}
              </span>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default GaleriaVideos;