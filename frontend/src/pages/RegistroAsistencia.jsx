import React, { useState, useEffect } from 'react';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

const TIPOS_SIN_MARCADO = ['falta_injustificada', 'licencia_no_remunerada', 'vacaciones',
  'incapacidad_eps', 'incapacidad_arl', 'incapacidad_soat',
  'licencia_remunerada', 'descanso', 'festivo_no_trabajado'];

function RegistroAsistencia() {
  const [proyectos, setProyectos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [busquedaRegistros, setBusquedaRegistros] = useState('');
  const [marcaEntrada, setMarcaEntrada] = useState(null);
  const [marcaSalida, setMarcaSalida] = useState(null);
  const [marcaAlmuerzoInicio, setMarcaAlmuerzoInicio] = useState(null);
  const [marcaAlmuerzoFin, setMarcaAlmuerzoFin] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [estadoMarcado, setEstadoMarcado] = useState('sin_marcar');
  const [tipoBreakActual, setTipoBreakActual] = useState(null);
    // Detectar rol del usuario desde localStorage o default
  const userRol = localStorage.getItem('rol') || 'ADMIN';
  const [form, setForm] = useState({
    email: '', tipoDia: 'normal', notas: ''
  });

  useEffect(() => { cargarProyectos(); cargarEmpleados(); }, []);

  const cargarProyectos = async () => {
    try {
      const res = await fetchConAuth('${API_URL}/api/proyectos');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setProyectos(data.data);
    } catch (err) { console.error(err); setProyectos([]); }
  };

  const cargarEmpleados = async () => {
    try {
      const res = await fetchConAuth('${API_URL}/api/usuarios');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEmpleados(data.data.filter(u => u.estadoLaboral === 'activo'));
      }
    } catch (err) { console.error(err); }
  };

  const cargarRegistrosDia = async () => {
    if (!proyectoSeleccionado && !form.email) return;
    try {
      const url = proyectoSeleccionado
        ? `${API_URL}/api/asistencia/proyecto/${proyectoSeleccionado}?fecha=${fecha}`
        : `${API_URL}/api/asistencia?fecha=${fecha}&email=${form.email}`;
      const res = await fetchConAuth(url);
      const data = await res.json();
      if (data.success) setRegistros(data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    cargarRegistrosDia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoSeleccionado, fecha, form.email]);

  const resetMarcas = () => {
    setMarcaEntrada(null); setMarcaSalida(null);
    setMarcaAlmuerzoInicio(null); setMarcaAlmuerzoFin(null);
    setBreaks([]); setEstadoMarcado('sin_marcar'); setTipoBreakActual(null);
  };

  const empleadoSeleccionado = empleados.find(e => e.email === form.email);
  const tieneTurno = !!empleadoSeleccionado?.turnoAsignado;
  const esTipoSinMarcado = TIPOS_SIN_MARCADO.includes(form.tipoDia);

  const handleMarcarEntrada = () => {
    setMarcaEntrada(new Date().toISOString());
    setEstadoMarcado('trabajando');
  };

  const handleIniciarAlmuerzo = () => {
    setMarcaAlmuerzoInicio(new Date().toISOString());
    setEstadoMarcado('almuerzo');
  };

  const handleFinalizarAlmuerzo = () => {
    setMarcaAlmuerzoFin(new Date().toISOString());
    setEstadoMarcado('trabajando');
  };

  const handleIniciarBreak = (tipo) => {
    setTipoBreakActual(tipo);
    setBreaks([...breaks, { inicio: new Date().toISOString(), fin: null, tipo }]);
    setEstadoMarcado(tipo === 'pausa_activa' ? 'pausa_activa' : tipo === 'capacitacion' ? 'capacitacion' : 'break');
  };

  const handleFinalizarBreak = () => {
    const nuevosBreaks = [...breaks];
    const ultimo = nuevosBreaks[nuevosBreaks.length - 1];
    if (ultimo && !ultimo.fin) {
      ultimo.fin = new Date().toISOString();
      nuevosBreaks[nuevosBreaks.length - 1] = ultimo;
    }
    setBreaks(nuevosBreaks);
    setEstadoMarcado('trabajando');
    setTipoBreakActual(null);
  };

  const handleMarcarSalida = () => {
    setMarcaSalida(new Date().toISOString());
    setEstadoMarcado('finalizado');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) { setMensaje('Selecciona empleado'); return; }

    const yaExiste = registros.some(reg =>
      reg.email === form.email &&
      new Date(reg.fecha).toISOString().split('T')[0] === fecha
    );

    if (yaExiste) {
      setMensaje('❌ Este empleado ya tiene registro para esta fecha. Use "Editar" para modificar.');
      return;
    }

    const body = {
      ...form,
      fecha: new Date(fecha),
      tipoRegistro: tieneTurno ? 'self' : 'supervisor',
      marcaEntrada: tieneTurno ? marcaEntrada : null,
      marcaSalida: tieneTurno ? marcaSalida : null,
      marcaAlmuerzoInicio: tieneTurno ? marcaAlmuerzoInicio : null,
      marcaAlmuerzoFin: tieneTurno ? marcaAlmuerzoFin : null,
      breaks: tieneTurno ? breaks : [],
      estadoMarcado: tieneTurno ? estadoMarcado : 'sin_marcar',
      turnoAsignado: empleadoSeleccionado?.turnoAsignado || null,
      idProyecto: tieneTurno ? 'SIN_PROYECTO' : proyectoSeleccionado,
      horaEntradaManual: !tieneTurno && !esTipoSinMarcado ? document.getElementById('horaEntrada')?.value : null,
      horaSalidaManual: !tieneTurno && !esTipoSinMarcado ? document.getElementById('horaSalida')?.value : null,
      horasAlmuerzoManual: !tieneTurno && !esTipoSinMarcado ? Number(document.getElementById('horasAlmuerzo')?.value || 1) : null,
    };

    try {
      const res = await fetchConAuth('${API_URL}/api/asistencia', {
        method: 'POST', body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Registro guardado');
        setForm({ email: '', tipoDia: 'normal', notas: '' });
        resetMarcas();
        cargarRegistrosDia();
      } else {
        setMensaje('❌ Error: ' + (data.error || 'No se pudo guardar'));
      }
    } catch (err) { setMensaje('❌ Error de conexión'); }
  };

  const formatearHora = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  const renderBotonesMarcado = () => {
    if (!tieneTurno || !form.email || esTipoSinMarcado) return null;
  

  
  return (
      <div className="dba-marcado-panel">
        <div className="dba-marcado-botones">
          {!marcaEntrada && (
            <button type="button" onClick={handleMarcarEntrada} className="dba-marcado-btn dba-marcado-entrada">
              🟢 MARCAR ENTRADA
            </button>
          )}
          {marcaEntrada && <span style={{ color: '#22c55e', fontWeight: 'bold' }}>✅ Entrada: {formatearHora(marcaEntrada)}</span>}

          {marcaEntrada && estadoMarcado === 'trabajando' && !marcaAlmuerzoInicio && (
            <button type="button" onClick={handleIniciarAlmuerzo} className="dba-marcado-btn dba-marcado-almuerzo">
              🟡 INICIAR ALMUERZO
            </button>
          )}
          {marcaAlmuerzoInicio && !marcaAlmuerzoFin && (
            <>
              <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>🍽️ Almuerzo: {formatearHora(marcaAlmuerzoInicio)}</span>
              <button type="button" onClick={handleFinalizarAlmuerzo} className="dba-marcado-btn dba-marcado-entrada">
                ✅ FINALIZAR ALMUERZO
              </button>
            </>
          )}
          {marcaAlmuerzoFin && <span style={{ color: '#10b981' }}>🍽️ Almuerzo: {formatearHora(marcaAlmuerzoInicio)} - {formatearHora(marcaAlmuerzoFin)}</span>}

          {marcaEntrada && estadoMarcado === 'trabajando' && breaks.length < 2 && (
            <button type="button" onClick={() => handleIniciarBreak('break')} className="dba-marcado-btn dba-marcado-break">
              ☕ BREAK ({breaks.length}/2)
            </button>
          )}
          {(estadoMarcado === 'break' || estadoMarcado === 'pausa_activa' || estadoMarcado === 'capacitacion') && (
            <button type="button" onClick={handleFinalizarBreak} className="dba-marcado-btn dba-marcado-entrada">
              ✅ FINALIZAR {estadoMarcado === 'pausa_activa' ? 'PAUSA' : estadoMarcado === 'capacitacion' ? 'CAPACITACIÓN' : 'BREAK'}
            </button>
          )}
          {breaks.filter(b => b.fin).map((b, i) => (
            <span key={i} style={{ color: '#8b5cf6', fontSize: '0.85rem' }}>
              ☕ Break {i + 1}: {formatearHora(b.inicio)} - {formatearHora(b.fin)}
            </span>
          ))}

          {marcaEntrada && estadoMarcado === 'trabajando' && (
            <button type="button" onClick={() => handleIniciarBreak('pausa_activa')} className="dba-marcado-btn dba-marcado-pausa">
              🧘 PAUSA ACTIVA
            </button>
          )}

          {marcaEntrada && estadoMarcado === 'trabajando' && (
            <button type="button" onClick={() => handleIniciarBreak('capacitacion')} className="dba-marcado-btn dba-marcado-capacitacion">
              📚 CAPACITACIÓN
            </button>
          )}

          {marcaEntrada && estadoMarcado === 'trabajando' && (
            <button type="button" onClick={handleMarcarSalida} className="dba-marcado-btn dba-marcado-salida">
              🔴 MARCAR SALIDA
            </button>
          )}
          {marcaSalida && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 Salida: {formatearHora(marcaSalida)}</span>}

          {marcaEntrada && !marcaSalida && (
            <button type="button" onClick={resetMarcas} className="dba-marcado-btn dba-marcado-corregir" style={{ marginLeft: 'auto' }}>
              ↺ Corregir
            </button>
          )}
        </div>
      </div>
    );
  };

  const registrosFiltrados = React.useMemo(() => {
    if (!busquedaRegistros.trim()) return registros;
    const termino = busquedaRegistros.toLowerCase().trim();
    return registros.filter(reg => {
      const emp = empleados.find(e => e.email === reg.email);
      const nombre = emp ? emp.nombre.toLowerCase() : '';
      const email = (reg.email || '').toLowerCase();
      return nombre.includes(termino) || email.includes(termino);
    });
  }, [registros, busquedaRegistros, empleados]);

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        <div className="dba-header-text">
          <h1 className="dba-title">📋 Registro de Asistencia</h1>
          <p className="dba-subtitle">Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong></p>
        </div>

        {mensaje && (
          <div className={`dba-alert ${mensaje.includes('❌') ? 'dba-alert-error' : 'dba-alert-success'}`}>
            <span>{mensaje}</span>
            <button onClick={() => setMensaje('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Filtros */}
        <div className="dba-filters">
          <div className="dba-form-group">
            <label className="dba-label">Proyecto</label>
            <select 
              className="dba-select" 
              value={proyectoSeleccionado} 
              onChange={e => setProyectoSeleccionado(e.target.value)}
              disabled={tieneTurno && form.email}
            >
              <option value="">-- Seleccione --</option>
              {proyectos.map(p => (
                <option key={p._id} value={p._id}>{p.nombre || p.idProyecto || 'Proyecto'}</option>
              ))}
            </select>
          </div>
          <div className="dba-form-group">
            <label className="dba-label">Fecha</label>
            <input type="date" className="dba-input" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
        </div>

        {/* Formulario */}
        <div className="dba-form-section">
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--gris-800)', fontSize: '1.1rem' }}>Registrar Empleado</h3>
          <form onSubmit={handleSubmit}>
            <div className="dba-form-grid">
              <div className="dba-form-group">
                <label className="dba-label">Empleado</label>
                <select 
                  className="dba-select" 
                  value={form.email} 
                  onChange={e => { setForm({ ...form, email: e.target.value }); resetMarcas(); }} 
                  required
                >
                  <option value="">-- Seleccione --</option>
                  {empleados.map(emp => (
                    <option key={emp._id} value={emp.email}>
                      {emp.nombre} ({emp.rol}) {emp.turnoAsignado ? `- ${emp.turnoAsignado}` : '- Obra'}
                    </option>
                  ))}
                </select>
              </div>

              {form.email && empleadoSeleccionado && (
                <div className="dba-form-group full-width">
                  <div className="dba-info-box dba-info-box-blue">
                    {tieneTurno ? (
                      <span><strong>🏢 {empleadoSeleccionado.tipoEmpleado === 'residente' ? 'Residente' : 'Planta'}</strong> — Turno: <strong>
                        {empleadoSeleccionado.turnoAsignado === '06-15' ? '6:00 AM - 3:00 PM' :
                          empleadoSeleccionado.turnoAsignado === '07-16' ? '7:00 AM - 4:00 PM' :
                            empleadoSeleccionado.turnoAsignado === '08-17' ? '8:00 AM - 5:00 PM' : ''}
                      </strong></span>
                    ) : (
                      <span><strong>🏗️ Personal de Obra</strong> — Horario libre (supervisor define)</span>
                    )}
                  </div>
                </div>
              )}

              {renderBotonesMarcado()}

              {!tieneTurno && form.email && !esTipoSinMarcado && (
                <>
                  <div className="dba-form-group">
                    <label className="dba-label">Hora Entrada</label>
                    <input type="time" id="horaEntrada" defaultValue="06:00" required className="dba-input" />
                  </div>
                  <div className="dba-form-group">
                    <label className="dba-label">Hora Salida</label>
                    <input type="time" id="horaSalida" defaultValue="15:00" required className="dba-input" />
                  </div>
                  <div className="dba-form-group">
                    <label className="dba-label">Almuerzo (horas)</label>
                    <input type="number" id="horasAlmuerzo" defaultValue="1" min="0" max="2" step="0.5" className="dba-input" />
                    <small style={{ color: 'var(--gris-500)', fontSize: '0.75rem' }}>0 = no almuerzo, 0.5 = 30min, 1 = 1h</small>
                  </div>
                </>
              )}

              {esTipoSinMarcado && (
                <div className="dba-form-group full-width">
                  <div className="dba-info-box dba-info-box-orange">
                    <span>⚠️ <strong>{form.tipoDia === 'falta_injustificada' ? 'Falta Injustificada' :
                      form.tipoDia === 'licencia_no_remunerada' ? 'Licencia No Remunerada' :
                        'Este tipo de día'}</strong> no requiere marcado de entrada/salida.
                      Se registrará automáticamente con 0 horas trabajadas.
                    </span>
                  </div>
                </div>
              )}

              <div className="dba-form-group">
                <label className="dba-label">Tipo de Día</label>
                <select className="dba-select" value={form.tipoDia} onChange={e => setForm({ ...form, tipoDia: e.target.value })}>
                  <option value="normal">Normal</option>
                  <option value="incapacidad_eps">Incapacidad EPS</option>
                  <option value="incapacidad_arl">Incapacidad ARL</option>
                  <option value="incapacidad_soat">Incapacidad SOAT</option>
                  <option value="vacaciones">Vacaciones</option>
                  <option value="licencia_remunerada">Licencia Remunerada</option>
                  <option value="licencia_no_remunerada">Licencia No Remunerada</option>
                  <option value="permiso">Permiso</option>
                  <option value="capacitacion">Capacitación</option>
                  <option value="descanso">Descanso</option>
                  <option value="festivo_no_trabajado">Festivo No Trabajado</option>
                  <option value="falta_injustificada">Falta Injustificada</option>
                </select>
              </div>

              <div className="dba-form-group full-width">
                <label className="dba-label">Notas</label>
                <input type="text" className="dba-input" placeholder="Ej: Trabajó en soldadura..." value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })} />
              </div>
            </div>

            <button type="submit" className="dba-btn dba-btn-primary" style={{ marginTop: '16px' }}
              disabled={!esTipoSinMarcado && tieneTurno && (!marcaEntrada || !marcaSalida)}>
              Guardar Registro
            </button>
          </form>
        </div>

        {/* Tabla */}
        <div className="dba-header-text" style={{ marginTop: 'clamp(24px, 3vw, 40px)', marginBottom: 'clamp(12px, 2vw, 20px)' }}>
          <h2 className="dba-title" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>Registros del Día</h2>
        </div>

        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            className="dba-input"
            placeholder="Buscar empleado..."
            value={busquedaRegistros}
            onChange={e => setBusquedaRegistros(e.target.value)}
            style={{ maxWidth: '280px' }}
          />
          <span style={{ color: 'var(--gris-500)', fontSize: '0.85rem' }}>
            {registrosFiltrados.length} registros
          </span>
        </div>

        <div className="dba-table-wrapper">
          <table className="dba-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Proyecto</th>
                <th>Jornada</th>
                <th>Tipo Día</th>
                <th>Estado</th>
                <th>Extras</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map(reg => {
                let jornada = '-';
                if (['vacaciones', 'incapacidad_eps', 'incapacidad_arl', 'incapacidad_soat', 'licencia_remunerada',
                  'licencia_no_remunerada', 'descanso', 'festivo_no_trabajado'].includes(reg.tipoDia)) {
                  const novedadesLegible = {
                    'vacaciones': '🏖️ Vacaciones', 'incapacidad_eps': '🏥 Incapacidad EPS',
                    'incapacidad_arl': '🏥 Incapacidad ARL', 'incapacidad_soat': '🏥 Incapacidad SOAT',
                    'licencia_remunerada': '📋 Licencia Rem.', 'licencia_no_remunerada': '📋 Licencia No Rem.',
                    'descanso': '😴 Descanso', 'festivo_no_trabajado': '🎉 Festivo'
                  };
                  jornada = novedadesLegible[reg.tipoDia] || reg.tipoDia;
                } else if (reg.tipoDia === 'falta_injustificada') {
                  jornada = '❌ Falta Injustificada';
                } else if (reg.tipoDia === 'permiso') {
                  jornada = '📝 Permiso';
                } else if (reg.tipoDia === 'normal' || reg.tipoDia === 'capacitacion') {
                  const horas = [];
                  if (reg.horasNormales > 0) horas.push(`${reg.horasNormales}h`);
                  if (reg.horasExtrasDiurnas > 0) horas.push(`+${reg.horasExtrasDiurnas}h ext diurna`);
                  if (reg.horasExtrasNocturnas > 0) horas.push(`+${reg.horasExtrasNocturnas}h ext nocturna`);
                  if (reg.horasExtrasDominical > 0) horas.push(`+${reg.horasExtrasDominical}h ext dom`);
                  if (reg.horasExtrasNocturnasDominical > 0) horas.push(`+${reg.horasExtrasNocturnasDominical}h ext noct dom`);
                  if (reg.recargoNocturno > 0) horas.push(`(+${reg.recargoNocturno}h rec noct)`);
                  if (reg.recargoDominical > 0) horas.push(`(+${reg.recargoDominical}h rec dom)`);
                  jornada = horas.length > 0 ? horas.join(' ') : '0h';
                  if (reg.horasNormales < 8 && reg.horasNormales > 0) {
                    jornada += ` (descuento ${8 - reg.horasNormales}h)`;
                  }
                }

                return (
                  <tr key={reg._id}>
                    <td>{(() => {
                      const emp = empleados.find(e => e.email === reg.email);
                      return emp ? emp.nombre : reg.email;
                    })()}</td>
                    <td>
                      {reg.idProyecto === 'SIN_PROYECTO' ? '🏢 Oficina' : (() => {
                        const proyecto = proyectos.find(p => p._id === reg.idProyecto || p._id?.toString() === reg.idProyecto);
                        return proyecto ? (proyecto.idProyecto || proyecto.nombre || proyecto.codigo || reg.idProyecto) : reg.idProyecto;
                      })()}
                    </td>
                    <td>{jornada}</td>
                    <td>{reg.tipoDia === 'normal' ? '✅ Normal' : reg.tipoDia}</td>
                    <td>
                      <span className={`dba-estado dba-estado-${reg.estado}`}>
                        {reg.estado === 'borrador' ? '⏳ Borrador' :
                          reg.estado === 'validado' ? '✅ Validado' :
                            reg.estado === 'rechazado' ? '❌ Rechazado' : reg.estado}
                      </span>
                    </td>
                    <td>
                      {reg.extrasPendientesAprobacion ? (
                        <span style={{ color: '#e67e22', fontWeight: 'bold' }}>⏳ Pendiente</span>
                      ) : reg.extrasAprobadas ? (
                        <span style={{ color: '#27ae60' }}>✅ Aprobada</span>
                      ) : (
                        <span style={{ color: 'var(--gris-400)' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--gris-500)' }}>
                    Sin registros para este día
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RegistroAsistencia;
