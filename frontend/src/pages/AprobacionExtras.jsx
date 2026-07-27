import React, { useState, useEffect } from 'react';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

function AprobacionExtras() {
  const [pendientes, setPendientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [modalRechazo, setModalRechazo] = useState({ abierto: false, id: null, motivo: '' });
  const [erroresEndpoint, setErroresEndpoint] = useState([]);

  const hoy = new Date().toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(inicioMes);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [tabActiva, setTabActiva] = useState('pendientes');
// Detectar rol del usuario desde localStorage o default
  const userRol = localStorage.getItem('rol') || 'ADMIN';
  useEffect(() => { cargarDatos(); }, []);

  const fetchSeguro = async (url, opciones = {}) => {
    try {
      const res = await fetchConAuth(url, opciones);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const texto = await res.text();
        throw new Error(`Status ${res.status}: ${texto.substring(0, 200)}`);
      }
      const data = await res.json();
      return { ok: true, data, status: res.status };
    } catch (err) {
      return { ok: false, error: err.message, status: 0 };
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    setErroresEndpoint([]);
    const errores = [];

    let resultadoPendientes = await fetchSeguro('${API_URL}/api/asistencia/extras/pendientes');
    if (!resultadoPendientes.ok) {
      errores.push(`extras/pendientes: ${resultadoPendientes.error}`);
      resultadoPendientes = await fetchSeguro('${API_URL}/api/asistencia/proyecto/all');
      if (resultadoPendientes.ok) {
        resultadoPendientes.data = {
          success: true,
          data: (resultadoPendientes.data.data || []).filter(r => r.extrasPendientesAprobacion === true)
        };
      } else {
        errores.push(`proyecto/all: ${resultadoPendientes.error}`);
      }
    }

    const resultadoEmpleados = await fetchSeguro('${API_URL}/api/usuarios');
    const resultadoProyectos = await fetchSeguro('${API_URL}/api/proyectos');

    if (!resultadoEmpleados.ok) errores.push(`usuarios: ${resultadoEmpleados.error}`);
    if (!resultadoProyectos.ok) errores.push(`proyectos: ${resultadoProyectos.error}`);

    if (resultadoPendientes.ok && resultadoPendientes.data.success) setPendientes(resultadoPendientes.data.data);
    else setPendientes([]);

    if (resultadoEmpleados.ok && resultadoEmpleados.data.success) setEmpleados(resultadoEmpleados.data.data);
    if (resultadoProyectos.ok && resultadoProyectos.data.success) setProyectos(resultadoProyectos.data.data);

    if (errores.length > 0) {
      setErroresEndpoint(errores);
      setMensaje('❌ Algunos endpoints fallaron. Revisa la consola.');
    } else {
      setMensaje('');
    }
    setCargando(false);
  };

  const getNombreEmpleado = (email) => {
    const emp = empleados.find(e => e.email === email);
    return emp ? emp.nombre : email;
  };

  const getNombreProyecto = (idProyecto) => {
    if (idProyecto === 'SIN_PROYECTO') return 'Oficina';
    const proy = proyectos.find(p => p._id === idProyecto || p._id?.toString() === idProyecto);
    return proy ? (proy.nombre || proy.idProyecto || proy.codigo) : idProyecto;
  };

  const registrosFiltrados = (() => {
    let base = [];
    if (tabActiva === 'pendientes') base = pendientes.filter(r => r.extrasPendientesAprobacion === true);
    else if (tabActiva === 'aprobadas') base = pendientes.filter(r => r.extrasAprobadas === true && !r.extrasPendientesAprobacion);
    else if (tabActiva === 'rechazadas') base = pendientes.filter(r => r.estado === 'rechazado');
    else base = pendientes;

    if (fechaDesde || fechaHasta) {
      base = base.filter(reg => {
        const fechaReg = new Date(reg.fecha);
        const desde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
        const hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null;
        if (desde && fechaReg < desde) return false;
        if (hasta && fechaReg > hasta) return false;
        return true;
      });
    }

    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase().trim();
      base = base.filter(reg => {
        const nombre = getNombreEmpleado(reg.email).toLowerCase();
        const email = (reg.email || '').toLowerCase();
        const proyecto = getNombreProyecto(reg.idProyecto).toLowerCase();
        return nombre.includes(termino) || email.includes(termino) || proyecto.includes(termino);
      });
    }
    return base;
  })();

  const totales = registrosFiltrados.reduce((acc, reg) => ({
    diurnas: acc.diurnas + (reg.horasExtrasDiurnas || 0),
    nocturnas: acc.nocturnas + (reg.horasExtrasNocturnas || 0),
    dominicales: acc.dominicales + (reg.horasExtrasDominical || 0),
    nocturnasDom: acc.nocturnasDom + (reg.horasExtrasNocturnasDominical || 0),
    recNoct: acc.recNoct + (reg.recargoNocturno || 0),
    recDom: acc.recDom + (reg.recargoDominical || 0),
  }), { diurnas: 0, nocturnas: 0, dominicales: 0, nocturnasDom: 0, recNoct: 0, recDom: 0 });

  const calcularExtrasMensual = (email) => {
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    const extrasDelMes = pendientes.filter(reg => {
      const fechaReg = new Date(reg.fecha);
      return reg.email === email &&
             fechaReg.getMonth() === mesActual &&
             fechaReg.getFullYear() === anioActual &&
             (reg.extrasAprobadas || reg.extrasPendientesAprobacion);
    });
    const total = extrasDelMes.reduce((sum, reg) => sum +
      (reg.horasExtrasDiurnas || 0) +
      (reg.horasExtrasNocturnas || 0) +
      (reg.horasExtrasDominical || 0) +
      (reg.horasExtrasNocturnasDominical || 0), 0);
    return { total, registros: extrasDelMes.length };
  };

  const LIMITE_EXTRAS_MES = 30;

  const exportarExcel = () => {
    if (registrosFiltrados.length === 0) {
      setMensaje('❌ No hay registros para exportar');
      return;
    }
    const SEP = ';';
    const NEWLINE = '\r\n';
    const BOM = '\uFEFF';
    const headers = [
      'Fecha', 'Empleado', 'Email', 'Proyecto', 'Extra Diurna', 'Extra Nocturna',
      'Extra Dom/Fest', 'Extra Noct Dom', 'Recargo Noct', 'Recargo Dom',
      'Notas', 'Registrado Por', 'Estado', 'Aprobado/Rechazado Por', 'Fecha Aprob/Rech'
    ];
    const filas = registrosFiltrados.map(reg => [
      new Date(reg.fecha).toLocaleDateString('es-CO'),
      getNombreEmpleado(reg.email), reg.email, getNombreProyecto(reg.idProyecto),
      reg.horasExtrasDiurnas || 0, reg.horasExtrasNocturnas || 0,
      reg.horasExtrasDominical || 0, reg.horasExtrasNocturnasDominical || 0,
      reg.recargoNocturno || 0, reg.recargoDominical || 0,
      (reg.notas || '').replace(/[;\n\r]/g, ' '),
      reg.registradoPor || '', reg.estado,
      reg.extrasAprobadasPor || reg.extrasRechazadasPor || '',
      reg.extrasAprobadasFecha ? new Date(reg.extrasAprobadasFecha).toLocaleDateString('es-CO') :
        reg.extrasRechazadasFecha ? new Date(reg.extrasRechazadasFecha).toLocaleDateString('es-CO') : ''
    ]);
    const escapar = (valor) => {
      const str = String(valor);
      if (str.includes(SEP) || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const csvContent = BOM + [
      headers.join(SEP),
      ...filas.map(fila => fila.map(escapar).join(SEP))
    ].join(NEWLINE);
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fechaHoy = new Date().toISOString().split('T')[0];
    const nombreArchivo = `extras_${tabActiva}_${fechaHoy}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMensaje(`✅ Exportados ${registrosFiltrados.length} registros a ${nombreArchivo}`);
  };

  const aprobar = async (id) => {
    if (!window.confirm('¿Aprobar estas horas extras?')) return;
    try {
      const res = await fetchConAuth(`${API_URL}/api/asistencia/${id}/aprobar-extras`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Extras aprobadas correctamente');
        cargarDatos();
      } else {
        setMensaje('❌ Error al aprobar: ' + (data.error || ''));
      }
    } catch (err) {
      setMensaje('❌ Error de conexión al aprobar');
    }
  };

  const abrirModalRechazo = (id) => {
    setModalRechazo({ abierto: true, id, motivo: '' });
  };

  const rechazar = async () => {
    const { id, motivo } = modalRechazo;
    if (!motivo.trim()) {
      setMensaje('❌ Debe indicar un motivo de rechazo');
      return;
    }
    try {
      const res = await fetchConAuth(`${API_URL}/api/asistencia/${id}/rechazar-extras`, {
        method: 'PUT',
        body: JSON.stringify({ motivoRechazo: motivo })
      });
      const data = await res.json();
      if (data.success) {
        setMensaje('❌ Extras rechazadas');
        setModalRechazo({ abierto: false, id: null, motivo: '' });
        cargarDatos();
      } else {
        setMensaje('❌ Error al rechazar: ' + (data.error || ''));
      }
    } catch (err) {
      setMensaje('❌ Error de conexión al rechazar');
    }
  };

  const aprobarTodos = async () => {
    if (!window.confirm(`¿Aprobar TODOS los ${registrosFiltrados.length} registros visibles?`)) return;
    setCargando(true);
    let exitos = 0, fallos = 0;
    for (const reg of registrosFiltrados) {
      try {
        const res = await fetchConAuth(`${API_URL}/api/asistencia/${reg._id}/aprobar-extras`, { method: 'PUT' });
        if (res.ok) exitos++; else fallos++;
      } catch { fallos++; }
    }
    setCargando(false);
    setMensaje(`✅ ${exitos} aprobados, ❌ ${fallos} fallidos`);
    cargarDatos();
  };

  const tabs = [
    { key: 'pendientes', label: '⏳ Pendientes', color: '#e67e22' },
    { key: 'aprobadas', label: '✅ Aprobadas', color: '#27ae60' },
    { key: 'rechazadas', label: '❌ Rechazadas', color: '#c0392b' },
    { key: 'todas', label: '📋 Todas', color: '#7f8c8d' },
  ];

  const contarTab = (key) => {
    if (key === 'pendientes') return pendientes.filter(r => r.extrasPendientesAprobacion).length;
    if (key === 'aprobadas') return pendientes.filter(r => r.extrasAprobadas && !r.extrasPendientesAprobacion).length;
    if (key === 'rechazadas') return pendientes.filter(r => r.estado === 'rechazado').length;
    return pendientes.length;
  };

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        <div className="dba-header-text">
          <h1 className="dba-title">✅ Aprobación de Horas Extras</h1>
          <p className="dba-subtitle">Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong></p>
        </div>

        {mensaje && (
          <div className={`dba-alert ${mensaje.includes('❌') ? 'dba-alert-error' : 'dba-alert-success'}`}>
            {mensaje}
            <button className="dba-alert-close" onClick={() => setMensaje('')}>✕</button>
          </div>
        )}

        {erroresEndpoint.length > 0 && (
          <div className="dba-alert dba-alert-warning">
            <strong>⚠️ Endpoints con problemas:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              {erroresEndpoint.map((err, i) => (
                <li key={i}><code style={{ background: '#ffe0b2', padding: '2px 6px', borderRadius: '3px' }}>{err}</code></li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabs */}
        <div className="dba-extras-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTabActiva(tab.key)}
              className={`dba-extras-tab ${tabActiva === tab.key ? 'dba-extras-tab--active' : ''}`}
              style={{ '--tab-color': tab.color }}
            >
              {tab.label}
              <span className="dba-extras-tab-badge">{contarTab(tab.key)}</span>
            </button>
          ))}
        </div>

        {/* Barra de herramientas */}
        <div className="dba-extras-toolbar">
          <input
            type="text"
            placeholder="🔍 Buscar empleado o proyecto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="dba-extras-search"
          />
          <div className="dba-extras-date-group">
            <label>Desde:</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="dba-extras-date-input" />
          </div>
          <div className="dba-extras-date-group">
            <label>Hasta:</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="dba-extras-date-input" />
          </div>
          <button onClick={cargarDatos} disabled={cargando} className="dba-btn dba-btn-secondary dba-btn-sm">
            {cargando ? '⏳ Cargando...' : '🔄 Actualizar'}
          </button>
          <button onClick={exportarExcel} disabled={registrosFiltrados.length === 0} className="dba-btn-excel">
            📥 Excel ({registrosFiltrados.length})
          </button>
          {tabActiva === 'pendientes' && registrosFiltrados.length > 0 && (
            <button onClick={aprobarTodos} disabled={cargando} className="dba-btn-aprobar-todos">
              ✓ Aprobar todos ({registrosFiltrados.length})
            </button>
          )}
          <span className="dba-extras-count">
            {registrosFiltrados.length} registro{registrosFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tarjetas de totales */}
        {registrosFiltrados.length > 0 && (
          <div className="dba-extras-totales">
            {totales.diurnas > 0 && (
              <div className="dba-extras-total-card dba-extras-total-card--diurna">
                <div className="dba-extras-total-value">{totales.diurnas}h</div>
                <div className="dba-extras-total-label">Extra Diurna</div>
              </div>
            )}
            {totales.nocturnas > 0 && (
              <div className="dba-extras-total-card dba-extras-total-card--nocturna">
                <div className="dba-extras-total-value">{totales.nocturnas}h</div>
                <div className="dba-extras-total-label">Extra Nocturna</div>
              </div>
            )}
            {totales.dominicales > 0 && (
              <div className="dba-extras-total-card dba-extras-total-card--dominical">
                <div className="dba-extras-total-value">{totales.dominicales}h</div>
                <div className="dba-extras-total-label">Extra Dom/Fest</div>
              </div>
            )}
            {totales.nocturnasDom > 0 && (
              <div className="dba-extras-total-card dba-extras-total-card--nocturna-dom">
                <div className="dba-extras-total-value">{totales.nocturnasDom}h</div>
                <div className="dba-extras-total-label">Extra Noct Dom</div>
              </div>
            )}
            {totales.recNoct > 0 && (
              <div className="dba-extras-total-card dba-extras-total-card--rec-noct">
                <div className="dba-extras-total-value">{totales.recNoct}h</div>
                <div className="dba-extras-total-label">Recargo Nocturno</div>
              </div>
            )}
            {totales.recDom > 0 && (
              <div className="dba-extras-total-card dba-extras-total-card--rec-dom">
                <div className="dba-extras-total-value">{totales.recDom}h</div>
                <div className="dba-extras-total-label">Recargo Dominical</div>
              </div>
            )}
            <div className="dba-extras-total-card dba-extras-total-card--general">
              <div className="dba-extras-total-value">
                {totales.diurnas + totales.nocturnas + totales.dominicales + totales.nocturnasDom + totales.recNoct + totales.recDom}h
              </div>
              <div className="dba-extras-total-label">Total General</div>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="dba-table-wrapper">
          <table className="dba-extras-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Proyecto</th>
                <th className="dba-extras-th-center">Extra Diurna</th>
                <th className="dba-extras-th-center">Extra Nocturna</th>
                <th className="dba-extras-th-center">Extra Dominical</th>
                <th className="dba-extras-th-center">Extra Nocturna Dominical</th>
                <th className="dba-extras-th-center">Recargo Nocturno</th>
                <th className="dba-extras-th-center">Recargo Domiminical</th>
                <th>Notas</th>
                <th>Registrado Por</th>
                <th className="dba-extras-th-center">Estado / Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map(reg => {
                const extrasMes = calcularExtrasMensual(reg.email);
                const superaLimite = extrasMes.total > LIMITE_EXTRAS_MES;
                return (
                  <tr key={reg._id}>
                    <td>{new Date(reg.fecha).toLocaleDateString('es-CO')}</td>
                    <td>
                      <div className="dba-extras-emp-nombre">
                        {getNombreEmpleado(reg.email)}
                        {superaLimite && (
                          <span className="dba-extras-warning" title={`⚠️ Este empleado tiene ${extrasMes.total}h extras este mes (límite: ${LIMITE_EXTRAS_MES}h)`}>
                            ⚠️ {extrasMes.total}h/mes
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{getNombreProyecto(reg.idProyecto)}</td>
                    <td className="dba-extras-td-center">
                      <span className={reg.horasExtrasDiurnas ? 'dba-extras-valor--diurna' : 'dba-extras-valor'}>
                        {reg.horasExtrasDiurnas || '-'}
                      </span>
                    </td>
                    <td className="dba-extras-td-center">
                      <span className={reg.horasExtrasNocturnas ? 'dba-extras-valor--nocturna' : 'dba-extras-valor'}>
                        {reg.horasExtrasNocturnas || '-'}
                      </span>
                    </td>
                    <td className="dba-extras-td-center">
                      <span className={reg.horasExtrasDominical ? 'dba-extras-valor--dominical' : 'dba-extras-valor'}>
                        {reg.horasExtrasDominical || '-'}
                      </span>
                    </td>
                    <td className="dba-extras-td-center">
                      <span className={reg.horasExtrasNocturnasDominical ? 'dba-extras-valor--nocturna-dom' : 'dba-extras-valor'}>
                        {reg.horasExtrasNocturnasDominical || '-'}
                      </span>
                    </td>
                    <td className="dba-extras-td-center">
                      <span className={reg.recargoNocturno ? 'dba-extras-valor--rec-noct' : 'dba-extras-valor'}>
                        {reg.recargoNocturno || '-'}
                      </span>
                    </td>
                    <td className="dba-extras-td-center">
                      <span className={reg.recargoDominical ? 'dba-extras-valor--rec-dom' : 'dba-extras-valor'}>
                        {reg.recargoDominical || '-'}
                      </span>
                    </td>
                    <td className="dba-extras-notas">
                      {reg.notas || '-'}
                      {reg.motivoRechazoExtras && (
                        <div className="dba-extras-rechazo">❌ Motivo: {reg.motivoRechazoExtras}</div>
                      )}
                    </td>
                    <td className="dba-extras-registrado">
                      {reg.registradoPor || '-'}
                      {reg.extrasAprobadasPor && (
                        <div className="dba-extras-aprobado-por">
                          ✓ Por: {reg.extrasAprobadasPor}<br/>
                          📅 {reg.extrasAprobadasFecha ? new Date(reg.extrasAprobadasFecha).toLocaleDateString('es-CO') : ''}
                        </div>
                      )}
                      {reg.extrasRechazadasPor && (
                        <div className="dba-extras-rechazado-por">
                          ✕ Por: {reg.extrasRechazadasPor}<br/>
                          📅 {reg.extrasRechazadasFecha ? new Date(reg.extrasRechazadasFecha).toLocaleDateString('es-CO') : ''}
                        </div>
                      )}
                    </td>
                    <td className="dba-extras-td-center">
                      {tabActiva === 'pendientes' ? (
                        <>
                          <button className="dba-btn-aprobar-sm" onClick={() => aprobar(reg._id)}>✓ Aprobar</button>
                          <button className="dba-btn-rechazar-sm" onClick={() => abrirModalRechazo(reg._id)}>✕ Rechazar</button>
                        </>
                      ) : (
                        <span className={`dba-extras-estado-badge dba-extras-estado-badge--${reg.estado === 'validado' ? 'aprobada' : reg.estado === 'rechazado' ? 'rechazada' : 'pendiente'}`}>
                          {reg.estado === 'validado' ? '✅ Aprobada' : reg.estado === 'rechazado' ? '❌ Rechazada' : '⏳ Pendiente'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {registrosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="12" className="dba-extras-empty">
                    🎉 No hay registros en esta categoría
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal de rechazo */}
        {modalRechazo.abierto && (
          <div className="dba-modal-overlay">
            <div className="dba-modal">
              <div className="dba-modal-header">
                <h3>❌ Rechazar Horas Extras</h3>
              </div>
              <p style={{ color: '#666', fontSize: '14px' }}>Indique el motivo del rechazo:</p>
              <textarea
                value={modalRechazo.motivo}
                onChange={e => setModalRechazo({ ...modalRechazo, motivo: e.target.value })}
                placeholder="Ej: Las horas no corresponden al turno asignado..."
                className="dba-modal-textarea"
              />
              <div className="dba-modal-footer">
                <button onClick={() => setModalRechazo({ abierto: false, id: null, motivo: '' })} className="dba-btn dba-btn-secondary dba-btn-sm">
                  Cancelar
                </button>
                <button onClick={rechazar} className="dba-btn dba-btn-danger dba-btn-sm">
                  Confirmar Rechazo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AprobacionExtras;