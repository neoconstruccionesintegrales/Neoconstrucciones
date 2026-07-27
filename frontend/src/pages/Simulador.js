import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FadeIn from '../components/Fadein';
import '../style/simulador.css';

function Simulador() {
  const navigate = useNavigate();
  const [servicios, setServicios] = useState([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [mensajeServidor, setMensajeServidor] = useState('');
  const [formData, setFormData] = useState({
    nombreCliente: '',
    telefono: '',
    idServicioSelected: '',
    ancho: '', 
    alto: ''
  });

  const [resultadosSimulados, setResultadosSimulados] = useState({
    areaTotal: 0,
    materiales: 0,
    manoObra: 0,
    subtotalDirecto: 0,
    adminImprevistos: 0, 
    iva: 0,               
    precioFinal: 0
  });

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
    const obtenerServicios = async () => {
      try {
        const respuesta = await fetch('${API_URL}/api/servicios');
        const resultado = await respuesta.json();
        const datosServicios = resultado.data || (Array.isArray(resultado) ? resultado : []);

        if (datosServicios && datosServicios.length > 0) {
          setServicios(datosServicios);
          setServicioSeleccionado(datosServicios[0]);
          setFormData(prev => ({ ...prev, idServicioSelected: datosServicios[0].idServicio }));
        } else {
          setMensajeServidor('⚠️ No se encontraron servicios.');
        }
      } catch (error) {
        setMensajeServidor('❌ Error al conectar con el backend.');
      }
    };
    obtenerServicios();
  }, []);

  const manejarCambioSelectSimulador = (e) => {
    const idSrv = e.target.value;
    const srv = servicios.find(s => s.idServicio === idSrv);
    setServicioSeleccionado(srv);
    setFormData(prev => ({ ...prev, idServicioSelected: idSrv }));
  };

  const manejarCambioSimulador = (e) => {
    const { name, value } = e.target;
    if (value === '' || parseFloat(value) < 0) {
      setFormData(prev => ({ ...prev, [name]: value === '' ? '' : '0' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const ejecutarSimulacionDirecta = () => {
    const anchoNum = parseFloat(formData.ancho);
    const altoNum = parseFloat(formData.alto);

    if (isNaN(anchoNum) || isNaN(altoNum) || anchoNum <= 0 || altoNum <= 0) {
      alert("⚠️ Por favor ingresa valores mayores a 0.");
      return;
    }

    const area = anchoNum * altoNum;

    if (servicioSeleccionado) {
      const listaMateriales = servicioSeleccionado.materiales || [];
      const costoUnitarioMateriales = listaMateriales.reduce((acc, mat) => acc + (Number(mat.costoEstimated || mat.costoEstimado) || 0), 0);

      const totalMateriales = costoUnitarioMateriales * area;
      const totalManoObra = (Number(servicioSeleccionado.costoManoObraEspecializada) || 0) * area;
      const subtotalcostosDirectos = totalMateriales + totalManoObra;
      const totalPrecioCliente = (Number(servicioSeleccionado.precioUnitario) || 0) * area;
      const diferenciaTotal = totalPrecioCliente - subtotalcostosDirectos;

      const porcionesIva = diferenciaTotal > 0 ? diferenciaTotal * 0.19 : 0;
      const porcionesAdmin = diferenciaTotal > 0 ? diferenciaTotal - porcionesIva : 0;

      const resultados = {
        areaTotal: area,
        materiales: totalMateriales,
        manoObra: totalManoObra,
        subtotalDirecto: subtotalcostosDirectos,
        adminImprevistos: porcionesAdmin,
        iva: porcionesIva,
        precioFinal: totalPrecioCliente,
        servicioNombre: servicioSeleccionado.nombre,
        servicioId: servicioSeleccionado.idServicio,
        ancho: anchoNum,
        alto: altoNum
      };

      setResultadosSimulados(resultados);
      localStorage.setItem('cotizacionSimulador', JSON.stringify(resultados));
    }
  };

  const solicitarVisita = () => {
    if (resultadosSimulados.areaTotal === 0) {
      alert("⚠️ Primero debes ejecutar la simulación.");
      return;
    }
    navigate('/agendar-cita');
  };

  const ivaInformativo = resultadosSimulados.precioFinal * 0.19;
  const totalConIva = resultadosSimulados.precioFinal + ivaInformativo;

  return (
    <div className="simulador-page">
      <Header />

      {/* ===== HERO CON FADE ON SCROLL ===== */}
      <div className="hero-fade-container">
        <section ref={heroRef} className="simulador-hero">
          <div ref={heroInnerRef} className="simulador-hero-inner">
            <FadeIn direction="down">
              <span className="simulador-hero-badge">📊 Cotiza en minutos</span>
            </FadeIn>
            <FadeIn direction="up" delay={0.15}>
              <h1 className="simulador-hero-title">Simulador de Obra</h1>
            </FadeIn>
            <FadeIn direction="up" delay={0.3}>
              <p className="simulador-hero-sub">
                Obtén un presupuesto estimado al instante. Selecciona el servicio,<br />
                ingresa las dimensiones y conoce los costos de tu proyecto.
              </p>
            </FadeIn>
          </div>
        </section>
      </div>

      {/* ===== FORMULARIO ===== */}
      <section className="simulador-main-section">
        <div className="simulador-main-grid">
          <FadeIn direction="left">
            <div className="simulador-card">
              <div className="simulador-card-header">
                <span className="simulador-section-label">CALCULAR PRESUPUESTO</span>
                <h2 className="simulador-card-title">Datos del Proyecto</h2>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); ejecutarSimulacionDirecta(); }} className="simulador-form">
                <div className="simulador-field">
                  <label className="simulador-label">Servicio a Cotizar</label>
                  <select 
                    name="idServicioSelected" 
                    value={formData.idServicioSelected} 
                    onChange={manejarCambioSelectSimulador} 
                    className="simulador-select"
                  >
                    {servicios.map(s => (
                      <option key={s.idServicio} value={s.idServicio}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="simulador-row">
                  <div className="simulador-field">
                    <label className="simulador-label">Ancho (m)</label>
                    <input 
                      type="number" 
                      name="ancho" 
                      value={formData.ancho} 
                      onChange={manejarCambioSimulador} 
                      className="simulador-input" 
                      placeholder="0" 
                      step="0.1"
                      min="0"
                    />
                  </div>
                  <div className="simulador-field">
                    <label className="simulador-label">Largo (m)</label>
                    <input 
                      type="number" 
                      name="alto" 
                      value={formData.alto} 
                      onChange={manejarCambioSimulador} 
                      className="simulador-input" 
                      placeholder="0" 
                      step="0.1"
                      min="0"
                    />
                  </div>
                </div>

                <div className="simulador-buttons-row">
                  <button type="submit" className="simulador-btn-calc">
                    🧮 Calcular Presupuesto
                  </button>
                  <button type="button" onClick={solicitarVisita} className="simulador-btn-save">
                    📅 Solicitar Visita Técnica
                  </button>
                </div>
              </form>

              {mensajeServidor && (
                <div className="simulador-error">
                  <span>⚠️</span>
                  <p>{mensajeServidor}</p>
                </div>
              )}
            </div>
          </FadeIn>

          {/* ===== RESUMEN ===== */}
          <FadeIn direction="right" delay={0.2}>
            <div className={`simulador-resumen-card ${resultadosSimulados.areaTotal > 0 ? 'visible' : ''}`}>
              {resultadosSimulados.areaTotal > 0 ? (
                <>
                  <div className="simulador-resumen-header">
                    <span className="simulador-section-label">RESULTADO</span>
                    <h3 className="simulador-resumen-title">Resumen Estimado</h3>
                  </div>

                  <div className="simulador-resumen-servicio">
                    <span className="simulador-resumen-servicio-label">Servicio</span>
                    <span className="simulador-resumen-servicio-value">{resultadosSimulados.servicioNombre}</span>
                  </div>

                  <div className="simulador-resumen-stats">
                    <div className="simulador-resumen-stat">
                      <span className="simulador-resumen-stat-num">{resultadosSimulados.areaTotal.toFixed(2)}</span>
                      <span className="simulador-resumen-stat-label">m²</span>
                    </div>
                    <div className="simulador-resumen-stat">
                      <span className="simulador-resumen-stat-num">${resultadosSimulados.materiales.toLocaleString()}</span>
                      <span className="simulador-resumen-stat-label">Materiales</span>
                    </div>
                    <div className="simulador-resumen-stat">
                      <span className="simulador-resumen-stat-num">${resultadosSimulados.manoObra.toLocaleString()}</span>
                      <span className="simulador-resumen-stat-label">Mano de Obra</span>
                    </div>
                  </div>

                  <div className="simulador-resumen-separador"></div>

                  <div className="simulador-resumen-row">
                    <span>Subtotal:</span>
                    <strong>${resultadosSimulados.precioFinal.toLocaleString()} COP</strong>
                  </div>

                  <div className="simulador-resumen-row iva">
                    <span>IVA (19%):</span>
                    <span>+ ${ivaInformativo.toLocaleString()} COP</span>
                  </div>

                  <div className="simulador-resumen-total">
                    <span>TOTAL CON IVA</span>
                    <strong>${totalConIva.toLocaleString()} COP</strong>
                  </div>

                  <div className="simulador-resumen-nota">
                    <span>ℹ️</span>
                    <p>La cotización formal incluirá el desglose completo de impuestos según las condiciones comerciales acordadas.</p>
                  </div>
                </>
              ) : (
                <div className="simulador-resumen-empty">
                  <span className="simulador-resumen-empty-icon">📊</span>
                  <h3>Tu presupuesto aparecerá aquí</h3>
                  <p>Selecciona un servicio e ingresa las dimensiones para calcular el costo estimado de tu proyecto.</p>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="simulador-cta-section">
        <div className="simulador-cta-inner">
          <FadeIn direction="up">
            <h2>¿Necesitas una cotización formal?</h2>
          </FadeIn>
          <FadeIn direction="up" delay={0.15}>
            <p>
              El simulador te da una estimación. Para una cotización detallada con planos,
              especificaciones técnicas y cronograma, agenda una visita técnica gratuita.
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.3}>
            <div className="simulador-cta-btns">
              <button className="simulador-cta-btn primary" onClick={() => navigate('/agendar-cita')}>
                📅 Agendar Visita Técnica
              </button>
              <button className="simulador-cta-btn secondary" onClick={() => navigate('/contacto')}>
                ✉️ Hablar con un Asesor
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Simulador;