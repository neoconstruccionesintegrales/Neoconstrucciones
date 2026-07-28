import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FadeIn from '../components/Fadein';
import '../style/contacto.css';

function Contacto() {
  const navigate = useNavigate();
  const [contacto, setContacto] = useState({ nombre: '', correo: '', telefono: '', mensaje: '' });

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

  const enviarContacto = async (e) => {
    e.preventDefault();

    const nuevoMensaje = {
      idMensaje: `MSG-${Date.now().toString().slice(-4)}`,
      nombre: contacto.nombre,
      correo: contacto.correo,
      celular: contacto.telefono,
      mensaje: contacto.mensaje,
      estado: 'pendiente',
      notas: ''
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoMensaje)
      });
      const resultado = await response.json();

      if (resultado.success) {
        alert(`📨 Mensaje enviado con éxito. Pronto nos contactaremos contigo, ${contacto.nombre}.`);
        setContacto({ nombre: '', correo: '', telefono: '', mensaje: '' }); 
      } else {
        alert(`❌ Error del servidor: ${resultado.error}`);
      }
    } catch (error) {
      console.error("Error al enviar contacto:", error);
      alert("❌ No se pudo conectar con el servidor. Verifica que tu backend esté encendido.");
    }
  };

  const testimonios = [
    {
      texto: "Neoconstrucciones superó todas nuestras expectativas. Entregaron la estructura metálica de nuestra nave industrial 15 días antes de lo pactado, con una calidad impecable.",
      nombre: "Carlos Mendoza",
      rol: "Gerente de Proyectos, Constructora Andina",
      inicial: "C",
      estrellas: "★★★★★"
    },
    {
      texto: "Llevamos 3 proyectos con ellos y en cada uno demuestran por qué son líderes. El equipo de montaje es extremadamente profesional y cumplen con todas las normas de seguridad.",
      nombre: "Ana Lucía Vargas",
      rol: "Directora de Obra, Inmobiliaria del Sur",
      inicial: "A",
      estrellas: "★★★★★"
    },
    {
      texto: "El simulador virtual nos permitió planificar el presupuesto con precisión. Su equipo de ingeniería propia hizo la diferencia en el diseño estructural de nuestro centro de datos.",
      nombre: "Roberto Jiménez",
      rol: "CTO, DataCenter Colombia",
      inicial: "R",
      estrellas: "★★★★★"
    }
  ];

  return (
    <div className="contacto-page">
      <Header />

      {/* ===== HERO CON FADE ON SCROLL ===== */}
      <div className="hero-fade-container">
        <section ref={heroRef} className="contacto-hero">
          <div ref={heroInnerRef} className="contacto-hero-inner">
            <FadeIn direction="down">
              <span className="contacto-hero-badge">📞 Estamos para ayudarte</span>
            </FadeIn>
            <FadeIn direction="up" delay={0.15}>
              <h1 className="contacto-hero-title">Contáctanos</h1>
            </FadeIn>
            <FadeIn direction="up" delay={0.3}>
              <p className="contacto-hero-sub">
                ¿Tienes un proyecto en mente? Escríbenos y un especialista<br />
                se pondrá en contacto contigo en menos de 24 horas.
              </p>
            </FadeIn>
            <FadeIn direction="up" delay={0.45}>
              <div className="contacto-hero-info">
                <div className="contacto-info-item">
                  <span className="contacto-info-icon">📱</span>
                  <span className="contacto-info-text">301 772 3223</span>
                </div>
                <div className="contacto-info-item">
                  <span className="contacto-info-icon">✉️</span>
                  <span className="contacto-info-text">info@neonstrucciones.com</span>
                </div>
                <div className="contacto-info-item">
                  <span className="contacto-info-icon">📍</span>
                  <span className="contacto-info-text">Bogotá, Colombia</span>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      </div>

      {/* ===== FORMULARIO + INFO ===== */}
      <section className="contacto-main-section">
        <div className="contacto-main-grid">
          <FadeIn direction="left">
            <div className="contacto-card">
              <div className="contacto-card-header">
                <span className="contacto-section-label">ESCRÍBENOS</span>
                <h2 className="contacto-card-title">Canales de Atención</h2>
              </div>

              <form onSubmit={enviarContacto} className="contacto-form">
                <div className="contacto-field">
                  <label className="contacto-label">Tu Nombre</label>
                  <input 
                    type="text" 
                    className="contacto-input"
                    value={contacto.nombre} 
                    onChange={e => setContacto({...contacto, nombre: e.target.value})} 
                    placeholder="Escribe tu nombre completo"
                    required 
                  />
                </div>

                <div className="contacto-field">
                  <label className="contacto-label">Correo Electrónico</label>
                  <input 
                    type="email" 
                    className="contacto-input"
                    value={contacto.correo} 
                    onChange={e => setContacto({...contacto, correo: e.target.value})} 
                    placeholder="ejemplo@correo.com"
                    required 
                  />
                </div>

                <div className="contacto-field">
                  <label className="contacto-label">Teléfono de Contacto</label>
                  <input 
                    type="tel" 
                    className="contacto-input"
                    value={contacto.telefono} 
                    onChange={e => setContacto({...contacto, telefono: e.target.value})}
                    placeholder="Número de celular"
                    required 
                  />
                </div>

                <div className="contacto-field">
                  <label className="contacto-label">Mensaje</label>
                  <textarea 
                    className="contacto-textarea"
                    value={contacto.mensaje} 
                    onChange={e => setContacto({...contacto, mensaje: e.target.value})} 
                    placeholder="¿En qué podemos ayudarte? Cuéntanos sobre tu proyecto..."
                    required
                  />
                </div>

                <button type="submit" className="contacto-btn-enviar">
                  📨 Enviar Requerimiento
                </button>
              </form>
            </div>
          </FadeIn>

          <FadeIn direction="right" delay={0.2}>
            <div className="contacto-info-panel">
              <div className="contacto-info-card">
                <span className="contacto-info-card-icon">📞</span>
                <h3>Llámanos</h3>
                <p>
                  Atención inmediata de lunes a sábado<br />
                  <a href="tel:3017723223">301 772 3223</a>
                </p>
              </div>

              <div className="contacto-info-card">
                <span className="contacto-info-card-icon">📧</span>
                <h3>Escríbenos</h3>
                <p>
                  Respuesta garantizada en 24h<br />
                  <a href="mailto:info@neonstrucciones.com">info@neonstrucciones.com</a>
                </p>
              </div>

              <div className="contacto-info-card">
                <span className="contacto-info-card-icon">🏢</span>
                <h3>Visítanos</h3>
                <p>
                  Bogotá D.C., Colombia<br />
                  NIT: 901421096-1
                </p>
              </div>

              <div className="contacto-info-card">
                <span className="contacto-info-card-icon">⏰</span>
                <h3>Horario</h3>
                <p>
                  Lunes a Viernes: 8:00 AM - 6:00 PM<br />
                  Sábados: 8:00 AM - 2:00 PM
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== TESTIMONIOS ===== */}
      <section className="contacto-testimonios-section">
        <div className="contacto-testimonios-inner">
          <div className="contacto-testimonios-header">
            <FadeIn direction="up">
              <span className="contacto-section-label">TESTIMONIOS</span>
              <h2>Lo que dicen nuestros clientes</h2>
              <p>Más de 50 empresas confían en nosotros para sus proyectos</p>
            </FadeIn>
          </div>
          <div className="contacto-testimonios-grid">
            {testimonios.map((t, i) => (
              <FadeIn key={i} direction="up" delay={i * 0.1}>
                <div className="contacto-testimonio-card">
                  <span className="contacto-testimonio-quote">"</span>
                  <p className="contacto-testimonio-text">{t.texto}</p>
                  <div className="contacto-testimonio-author">
                    <div className="contacto-testimonio-avatar">{t.inicial}</div>
                    <div>
                      <span className="contacto-testimonio-name">{t.nombre}</span>
                      <span className="contacto-testimonio-role">{t.rol}</span>
                      <span className="contacto-testimonio-stars">{t.estrellas}</span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="contacto-cta-section">
        <div className="contacto-cta-inner">
          <FadeIn direction="up">
            <h2>¿Prefieres una visita técnica?</h2>
          </FadeIn>
          <FadeIn direction="up" delay={0.15}>
            <p>
              Agenda una inspección gratuita en tu obra. Nuestros ingenieros evaluarán 
              el proyecto y te entregarán un diagnóstico sin compromiso.
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.3}>
            <div className="contacto-cta-btns">
              <button className="contacto-cta-btn primary" onClick={() => navigate('/agendar-cita')}>
                📅 Agendar Visita Técnica
              </button>
              <button className="contacto-cta-btn secondary" onClick={() => navigate('/simulador')}>
                📊 Simular mi Proyecto
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Contacto;