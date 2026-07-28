import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FadeIn from '../components/Fadein';
import '../style/citas.css';

function Citas() {
  const navigate = useNavigate();
  const [cita, setCita] = useState({ 
    nombreCliente: '',
    correo: '',
    celular: '', 
    fecha: '', 
    hora: '', 
    tipoServicio: '',
    notas: ''
  });

  const [minDate, setMinDate] = useState('');
  const [cotizacion, setCotizacion] = useState(null);

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

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setMinDate(today);

    const cotizacionGuardada = localStorage.getItem('cotizacionSimulador');
    if (cotizacionGuardada) {
      const cot = JSON.parse(cotizacionGuardada);
      setCotizacion(cot);

      const tipoMap = {
        'EST': 'Estructuras Metálicas',
        'ACA': 'Acabados',
        'CIV': 'Obra Civil'
      };
      const prefijo = cot.servicioId ? cot.servicioId.split('-')[0] : '';
      const tipoServicio = tipoMap[prefijo] || '';

      const notasCotizacion = `Cotización estimada desde Simulador: ${cot.servicioNombre} | Dimensiones: ${cot.ancho}m x ${cot.alto}m | Área: ${cot.areaTotal.toFixed(2)} m² | Presupuesto estimado: $${cot.precioFinal.toLocaleString('es-CO')} COP`;

      setCita(prev => ({
        ...prev,
        tipoServicio: tipoServicio,
        notas: notasCotizacion
      }));
    }
  }, []);

  const agendarCita = async (e) => {
    e.preventDefault();

    const fechaSeleccionada = new Date(cita.fecha + 'T00:00:00');
    const diaSemana = fechaSeleccionada.getUTCDay();

    if (diaSemana === 0) {
      alert("❌ Lo sentimos, no realizamos visitas técnicas los domingos ni festivos. Seleccione un día de lunes a sábado de 8:00 AM a 5:00 PM.");
      return;
    }

    const horaSeleccionada = parseInt(cita.hora.split(':')[0]);
    if (horaSeleccionada < 8 || horaSeleccionada >= 17) {
      alert("❌ El horario de visitas es de 8:00 AM a 5:00 PM.");
      return;
    }

    const nuevaCita = {
      idCita: `VIS-${Date.now().toString().slice(-4)}`,
      nombreCliente: cita.nombreCliente,
      correo: cita.correo,
      celular: cita.celular,
      tipoServicio: cita.tipoServicio,
      fecha: cita.fecha,
      hora: cita.hora,
      estado: 'pendiente',
      notas: cita.notas
    };

    try {
      const response = await fetch('${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaCita)
      });

      const resultado = await response.json();

      if (resultado.success) {
        alert(`📅 ¡Visita técnica agendada exitosamente para ${cita.nombreCliente}!`);
        setCita({ nombreCliente: '', correo: '', celular: '', fecha: '', hora: '', tipoServicio: '', notas: '' });
        localStorage.removeItem('cotizacionSimulador');
        setCotizacion(null);
      } else {
        alert(`❌ Error: ${resultado.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("❌ No se pudo conectar con el servidor.");
    }
  };

  const ivaInformativo = cotizacion ? cotizacion.precioFinal * 0.19 : 0;
  const totalConIva = cotizacion ? cotizacion.precioFinal + ivaInformativo : 0;

  return (
    <div className="citas-page">
      <Header />

      {/* ===== HERO CON FADE ON SCROLL ===== */}
      <div className="hero-fade-container">
        <section ref={heroRef} className="citas-hero">
          <div ref={heroInnerRef} className="citas-hero-inner">
            <FadeIn direction="down">
              <span className="citas-hero-badge">📅 Agenda tu cita</span>
            </FadeIn>
            <FadeIn direction="up" delay={0.15}>
              <h1 className="citas-hero-title">Visita Técnica</h1>
            </FadeIn>
            <FadeIn direction="up" delay={0.3}>
              <p className="citas-hero-sub">
                Programa una inspección gratuita en tu obra. Nuestros ingenieros<br />
                evaluarán el proyecto y te entregarán un diagnóstico profesional.
              </p>
            </FadeIn>
          </div>
        </section>
      </div>

      {/* ===== FORMULARIO ===== */}
      <section className="citas-main-section">
        <div className="citas-main-grid">
          <FadeIn direction="left">
            <div className="citas-card">
              <div className="citas-card-header">
                <span className="citas-section-label">RESERVAR INSPECCIÓN</span>
                <h2 className="citas-card-title">Solicitar tu Visita Técnica</h2>
                <p className="citas-card-subtitle">
                  Horario laboral de Lunes a Sábado de 8:00 AM a 5:00 PM.
                </p>
              </div>

              {cotizacion && (
                <div className="citas-cotizacion-box">
                  <span className="citas-cotizacion-icon">📋</span>
                  <div className="citas-cotizacion-content">
                    <p className="citas-cotizacion-titulo">Cotización del Simulador</p>
                    <p className="citas-cotizacion-nota">
                      El valor mostrado como presupuesto estimado no incluye IVA. 
                      Total estimado con IVA: <strong>${totalConIva.toLocaleString('es-CO')} COP</strong>
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={agendarCita} className="citas-form">
                <div className="citas-field">
                  <label className="citas-label">Nombre del Solicitante</label>
                  <input 
                    type="text" 
                    className="citas-input"
                    value={cita.nombreCliente} 
                    onChange={e => setCita({...cita, nombreCliente: e.target.value})} 
                    placeholder="Ej: Juan Pérez"
                    required 
                  />
                </div>

                <div className="citas-row">
                  <div className="citas-field">
                    <label className="citas-label">Correo Electrónico</label>
                    <input 
                      type="email" 
                      className="citas-input"
                      value={cita.correo} 
                      onChange={e => setCita({...cita, correo: e.target.value})} 
                      placeholder="ejemplo@correo.com"
                      required 
                    />
                  </div>
                  <div className="citas-field">
                    <label className="citas-label">Teléfono / Celular</label>
                    <input 
                      type="tel" 
                      className="citas-input"
                      value={cita.celular} 
                      onChange={e => setCita({...cita, celular: e.target.value})} 
                      placeholder="Ej: 3154445566"
                      required 
                    />
                  </div>
                </div>

                <div className="citas-row">
                  <div className="citas-field">
                    <label className="citas-label">Fecha (Lunes-Sábado)</label>
                    <input 
                      type="date" 
                      className="citas-input"
                      min={minDate} 
                      value={cita.fecha} 
                      onChange={e => setCita({...cita, fecha: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="citas-field">
                    <label className="citas-label">Hora (8am-5pm)</label>
                    <input 
                      type="time" 
                      className="citas-input"
                      value={cita.hora} 
                      onChange={e => setCita({...cita, hora: e.target.value})} 
                      required 
                    />
                  </div>
                </div>

                <div className="citas-field">
                  <label className="citas-label">Tipo de Obra</label>
                  <select 
                    className="citas-select"
                    value={cita.tipoServicio} 
                    onChange={e => setCita({...cita, tipoServicio: e.target.value})} 
                    required
                  >
                    <option value="">Seleccione...</option>
                    <option value="Estructuras Metálicas">Estructuras Metálicas</option>
                    <option value="Obra Civil">Obra Civil</option>
                    <option value="Acabados">Acabados</option>
                  </select>
                </div>

                <div className="citas-field">
                  <label className="citas-label">Notas / Detalles</label>
                  <textarea 
                    className="citas-textarea"
                    value={cita.notas} 
                    onChange={e => setCita({...cita, notas: e.target.value})} 
                    placeholder="Detalles adicionales de la obra..."
                    rows="3"
                  />
                </div>

                <button type="submit" className="citas-btn-submit">
                  📅 Reservar Inspección
                </button>
              </form>
            </div>
          </FadeIn>

          {/* ===== INFO LATERAL ===== */}
          <FadeIn direction="right" delay={0.2}>
            <div className="citas-info-panel">
              <div className="citas-info-card">
                <span className="citas-info-icon">⏰</span>
                <h3>Horario de Atención</h3>
                <p>Lunes a Viernes: 8:00 AM - 6:00 PM<br />Sábados: 8:00 AM - 2:00 PM</p>
              </div>

              <div className="citas-info-card">
                <span className="citas-info-icon">📍</span>
                <h3>Cobertura</h3>
                <p>Atendemos proyectos en Bogotá y zonas aledañas. Para otras regiones de Colombia, contáctanos.</p>
              </div>

              <div className="citas-info-card">
                <span className="citas-info-icon">🔧</span>
                <h3>¿Qué incluye?</h3>
                <p>Evaluación técnica en sitio, levantamiento de requerimientos, propuesta de solución y cotización formal.</p>
              </div>

              <div className="citas-info-card">
                <span className="citas-info-icon">💰</span>
                <h3>Costo</h3>
                <p>La primera visita técnica es <strong>completamente gratuita</strong> para proyectos mayores a 50m².</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="citas-cta-section">
        <div className="citas-cta-inner">
          <FadeIn direction="up">
            <h2>¿Prefieres cotizar primero?</h2>
          </FadeIn>
          <FadeIn direction="up" delay={0.15}>
            <p>
              Usa nuestro simulador virtual para obtener un presupuesto estimado 
              al instante antes de agendar la visita técnica.
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.3}>
            <div className="citas-cta-btns">
              <button className="citas-cta-btn primary" onClick={() => navigate('/simulador')}>
                📊 Simular mi Proyecto
              </button>
              <button className="citas-cta-btn secondary" onClick={() => navigate('/contacto')}>
                ✉️ Escribirnos
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Citas;