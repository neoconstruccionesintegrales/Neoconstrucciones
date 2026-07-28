import React, { useState, useEffect } from 'react';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

const fmtFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const str = fechaStr.toString();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return new Date(fechaStr).toLocaleDateString('es-CO');
};

const SMLV = 1750905;
const AUXILIO_TRANSPORTE = 249095;
const TOPE_AUXILIO = SMLV * 2;

function GenerarNomina() {
  const [form, setForm] = useState({
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    quincena: new Date().getDate() <= 15 ? 1 : 2,
    fechaInicio: '',
    fechaFin: '',
    fechaPago: ''
  });
  const [resultado, setResultado] = useState(null);
  const [nominasExistentes, setNominasExistentes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tabActiva, setTabActiva] = useState('generar');
  const [empleadoExpandido, setEmpleadoExpandido] = useState(null);
  // Detectar rol del usuario desde localStorage o default
  const userRol = localStorage.getItem('rol') || 'ADMIN';
  useEffect(() => {
    cargarEmpleados();
    cargarNominasExistentes();
  }, []);

  const cargarEmpleados = async () => {
    try {
      const res = await fetchConAuth('${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/usuarios');
      const data = await res.json();
      if (data.success) setEmpleados(data.data);
    } catch (err) { console.error(err); }
  };

  const cargarNominasExistentes = async () => {
    try {
      const res = await fetchConAuth(`${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/nomina?anio=${form.anio}`);
      const data = await res.json();
      if (data.success) setNominasExistentes(data.data);
    } catch (err) { console.error(err); }
  };

  const tipoLabels = {
    prestamo: 'Préstamo',
    falta_penalizacion: 'Penalización por falta',
    danos_perdidas: 'Daños o pérdidas',
    uniformes_epp: 'Uniformes / EPP',
    sancion_disciplinaria: 'Sanción disciplinaria',
    aporte_voluntario: 'Aporte voluntario',
    otro: 'Otro'
  };

  const getNombreEmpleado = (email) => {
    const emp = empleados.find(e => e.email === email);
    return emp ? emp.nombre : email;
  };

  const autoCalcularFechas = (anio, mes, quincena) => {
    const inicio = quincena === 1 ? 1 : 16;
    const fin = quincena === 1 ? 15 : new Date(anio, mes, 0).getDate();
    const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-${String(inicio).padStart(2, '0')}`;
    const fechaFin = `${anio}-${String(mes).padStart(2, '0')}-${String(fin).padStart(2, '0')}`;
    const fechaPago = quincena === 1
      ? `${anio}-${String(mes).padStart(2, '0')}-20`
      : `${anio}-${String(mes + 1).padStart(2, '0')}-05`;
    return { fechaInicio, fechaFin, fechaPago };
  };

  const handleChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    if (['anio', 'mes', 'quincena'].includes(field)) {
      const { fechaInicio, fechaFin, fechaPago } = autoCalcularFechas(
        Number(newForm.anio), Number(newForm.mes), Number(newForm.quincena)
      );
      newForm.fechaInicio = fechaInicio;
      newForm.fechaFin = fechaFin;
      newForm.fechaPago = fechaPago;
    }
    setForm(newForm);
  };

  useEffect(() => {
    const { fechaInicio, fechaFin, fechaPago } = autoCalcularFechas(form.anio, form.mes, form.quincena);
    setForm(prev => ({ ...prev, fechaInicio, fechaFin, fechaPago }));
  }, []);

  const calcular = async (e) => {
    e.preventDefault();
    if (!form.fechaInicio || !form.fechaFin) {
      setMensaje('❌ Debes seleccionar las fechas del período');
      return;
    }
    if (new Date(form.fechaFin) <= new Date(form.fechaInicio)) {
      setMensaje('❌ La fecha fin debe ser mayor a la fecha inicio');
      return;
    }
    setCargando(true);
    setMensaje('');
    try {
      const res = await fetchConAuth('${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/nomina/calcular', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setResultado(data.data);
        setMensaje('✅ Nómina calculada correctamente');
        cargarNominasExistentes();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al calcular'));
      }
    } catch (err) {
      setMensaje('❌ Error de conexión');
    }
    setCargando(false);
  };

  const aprobar = async () => {
    if (!resultado) return;
    if (!window.confirm('¿Aprobar esta nómina? No podrá modificarse después.')) return;
    try {
      const res = await fetchConAuth(`${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/nomina/${resultado.idNomina}/aprobar`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Nómina aprobada');
        setResultado(data.data);
        cargarNominasExistentes();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al aprobar'));
      }
    } catch (err) {
      setMensaje('❌ Error al aprobar');
    }
  };

  const marcarPagada = async (idNomina) => {
    if (!window.confirm('¿Marcar esta nómina como pagada?')) return;
    try {
      const res = await fetchConAuth(`${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/nomina/${idNomina}/pagar`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Nómina marcada como pagada');
        cargarNominasExistentes();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al pagar'));
      }
    } catch (err) {
      setMensaje('❌ Error al marcar como pagada');
    }
  };

  const exportarNominaExcel = () => {
    if (!resultado) return;
    const SEP = ';';
    const NEWLINE = '\r\n';
    const BOM = '\uFEFF';
    const headers = [
      'Email', 'Nombre', 'Días Trab', 'Días No Trab', 'Salario Base',
      'Horas Extras D', 'Horas Extras N', 'Horas Ext Dom', 'Horas Ext N Dom',
      'Recargo Noct', 'Recargo Dom', 'Aux Transporte', 'Total Devengado',
      'Salud (4%)', 'Pensión (4%)', 'Otros Desc', 'Total Deducciones',
      'Neto a Pagar', 'Salud Emp (8.5%)', 'Pensión Emp (12%)', 'ARL', 'Caja Comp',
      'Costo Total Empleador'
    ];
    const filas = resultado.empleados?.map(emp => [
      emp.email, getNombreEmpleado(emp.email), emp.diasTrabajados, emp.diasNoTrabajados,
      emp.salarioBase, emp.horasExtrasDiurnas, emp.horasExtrasNocturnas,
      emp.horasExtrasDominical, emp.horasExtrasNocturnasDominical,
      emp.recargoNocturno, emp.recargoDominical, emp.auxilioTransporte,
      emp.totalDevengado, emp.saludEmpleado, emp.pensionEmpleado,
      emp.otrosDescuentos, emp.totalDeducciones, emp.netoAPagar,
      emp.saludEmpleador, emp.pensionEmpleador, emp.arl,
      emp.cajaCompensacion, emp.costoTotalEmpleador
    ]) || [];
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
    link.setAttribute('href', url);
    link.setAttribute('download', `nomina_${resultado.idNomina}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMensaje('✅ Nómina exportada a Excel');
  };

  const getBadgeEstado = (estado) => {
    const badges = {
      abierta: 'dba-estado-badge--abierta',
      calculada: 'dba-estado-badge--calculada',
      aprobada: 'dba-estado-badge--aprobada',
      pagada: 'dba-estado-badge--pagada',
      cerrada: 'dba-estado-badge--cerrada'
    };
    const b = badges[estado] || badges.abierta;
    const textos = {
      abierta: '📝 Abierta',
      calculada: '🧮 Calculada',
      aprobada: '✅ Aprobada',
      pagada: '💰 Pagada',
      cerrada: '🔒 Cerrada'
    };
    return <span className={`dba-estado-badge ${b}`}>{textos[estado] || textos.abierta}</span>;
  };

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        <div className="dba-header-text">
          <h1 className="dba-title">💰 Generar Nómina</h1>
          <p className="dba-subtitle">Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong></p>
        </div>

        {mensaje && (
          <div className={`dba-alert ${mensaje.includes('❌') ? 'dba-alert-error' : 'dba-alert-success'}`}>
            {mensaje}
            <button className="dba-alert-close" onClick={() => setMensaje('')}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="dba-tabs">
          {[
            { key: 'generar', label: '🧮 Generar Nómina', color: '#127782' },
            { key: 'historial', label: '📋 Historial de Nóminas', color: '#7b1fa2' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setTabActiva(tab.key)}
              className={`dba-tab ${tabActiva === tab.key ? 'dba-tab--active' : ''}`}
              style={{ '--tab-color': tab.color }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: GENERAR */}
        {tabActiva === 'generar' && (
          <>
            <form onSubmit={calcular} className="dba-nomina-form">
              <div className="dba-nomina-grid">
                <div className="dba-input-group">
                  <label className="dba-label">Año</label>
                  <select className="dba-form-select" value={form.anio} onChange={e => handleChange('anio', Number(e.target.value))}>
                    {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="dba-input-group">
                  <label className="dba-label">Mes</label>
                  <select className="dba-form-select" value={form.mes} onChange={e => handleChange('mes', Number(e.target.value))}>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(2026, m - 1).toLocaleString('es-CO', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div className="dba-input-group">
                  <label className="dba-label">Quincena</label>
                  <select className="dba-form-select" value={form.quincena} onChange={e => handleChange('quincena', Number(e.target.value))}>
                    <option value={1}>Primera (1-15)</option>
                    <option value={2}>Segunda (16-30)</option>
                  </select>
                </div>
                <div className="dba-input-group">
                  <label className="dba-label">Fecha Inicio</label>
                  <input type="date" className="dba-form-input" value={form.fechaInicio} onChange={e => handleChange('fechaInicio', e.target.value)} required />
                </div>
                <div className="dba-input-group">
                  <label className="dba-label">Fecha Fin</label>
                  <input type="date" className="dba-form-input" value={form.fechaFin} onChange={e => handleChange('fechaFin', e.target.value)} required />
                </div>
                <div className="dba-input-group">
                  <label className="dba-label">Fecha de Pago</label>
                  <input type="date" className="dba-form-input" value={form.fechaPago} onChange={e => handleChange('fechaPago', e.target.value)} />
                </div>
              </div>

              <div className="dba-nomina-actions">
                <button type="submit" className="dba-btn dba-btn-primary" disabled={cargando} style={{ opacity: cargando ? 0.6 : 1 }}>
                  {cargando ? '⏳ Calculando...' : '🧮 Calcular Nómina'}
                </button>
                {resultado && (
                  <button type="button" className="dba-btn-export" onClick={exportarNominaExcel}>
                    📥 Exportar Excel
                  </button>
                )}
              </div>
            </form>

            {/* Resultado del cálculo */}
            {resultado && (
              <div className="dba-nomina-result">
                <div className="dba-nomina-header">
                  <div>
                    <h3>📋 {resultado.idNomina}</h3>
                    <p>{fmtFecha(resultado.fechaInicio)} - {fmtFecha(resultado.fechaFin)}</p>
                  </div>
                  <div className="dba-historial-actions">
                    {getBadgeEstado(resultado.estado)}
                    {resultado.estado === 'calculada' && (
                      <button className="dba-btn-aprobar" onClick={aprobar}>✅ Aprobar Nómina</button>
                    )}
                    {resultado.estado === 'aprobada' && (
                      <button className="dba-btn-pagar" onClick={() => marcarPagada(resultado.idNomina)}>💰 Marcar como Pagada</button>
                    )}
                  </div>
                </div>

                {/* Totales */}
                <div className="dba-nomina-stats">
                  <div className="dba-nomina-stat dba-nomina-stat--primary">
                    <div className="dba-nomina-stat-label">Total Nómina</div>
                    <div className="dba-nomina-stat-value">${resultado.totalNomina?.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="dba-nomina-stat dba-nomina-stat--dark">
                    <div className="dba-nomina-stat-label">Total Aportes</div>
                    <div className="dba-nomina-stat-value">${resultado.totalAportes?.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="dba-nomina-stat dba-nomina-stat--secondary">
                    <div className="dba-nomina-stat-label">Costo Total</div>
                    <div className="dba-nomina-stat-value">${resultado.totalCosto?.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="dba-nomina-stat dba-nomina-stat--success">
                    <div className="dba-nomina-stat-label">Empleados</div>
                    <div className="dba-nomina-stat-value">{resultado.empleados?.length || 0}</div>
                  </div>
                </div>

                {/* Tabla detalle con descuentos expandibles */}
                <h4 className="dba-nomina-detail-title">Detalle por Empleado</h4>
                <div className="dba-nomina-table-wrapper">
                  <table className="dba-nomina-table">
                    <thead>
                      <tr>
                        <th>Empleado</th>
                        <th className="dba-nomina-table th--center">Días</th>
                        <th className="dba-nomina-table th--right">Devengado</th>
                        <th className="dba-nomina-table th--right">Deducciones</th>
                        <th className="dba-nomina-table th--right">Neto</th>
                        <th className="dba-nomina-table th--right">Costo Empleador</th>
                        <th className="dba-nomina-table th--center">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.empleados?.map((emp, idx) => {
                        const expandido = empleadoExpandido === idx;
                        const tieneDescuentos = emp.detalleDescuentos?.length > 0;
                        return (
                          <React.Fragment key={idx}>
                            <tr
                              className={`dba-nomina-table tr--expandable ${expandido ? 'dba-nomina-table tr--expanded' : ''}`}
                              onClick={() => tieneDescuentos && setEmpleadoExpandido(expandido ? null : idx)}
                            >
                              <td>
                                <div className="dba-nomina-emp-nombre">{getNombreEmpleado(emp.email)}</div>
                                <div className="dba-nomina-emp-email">{emp.email}</div>
                              </td>
                              <td className="dba-nomina-table td--center">
                                <span className="dba-nomina-dias-ok">{emp.diasTrabajados}</span>
                                {emp.diasNoTrabajados > 0 && (
                                  <span className="dba-nomina-dias-faltas"> / {emp.diasNoTrabajados}</span>
                                )}
                              </td>
                              <td className="dba-nomina-table td--right">${emp.totalDevengado?.toLocaleString('es-CO')}</td>
                              <td className="dba-nomina-table td--right dba-nomina-deducciones">
                                ${emp.totalDeducciones?.toLocaleString('es-CO')}
                                {tieneDescuentos && (
                                  <span className="dba-nomina-deducciones-hint">(incluye descuentos)</span>
                                )}
                              </td>
                              <td className="dba-nomina-table td--right dba-nomina-neto">${emp.netoAPagar?.toLocaleString('es-CO')}</td>
                              <td className="dba-nomina-table td--right">${emp.costoTotalEmpleador?.toLocaleString('es-CO')}</td>
                              <td className="dba-nomina-table td--center">
                                {tieneDescuentos ? (
                                  <span className={`dba-nomina-chevron ${expandido ? 'dba-nomina-chevron--expanded' : ''}`}>▶</span>
                                ) : (
                                  <span className="dba-nomina-chevron--empty">—</span>
                                )}
                              </td>
                            </tr>
                            {expandido && tieneDescuentos && (
                              <tr>
                                <td colSpan="7" className="dba-descuentos-panel">
                                  <div className="dba-descuentos-box">
                                    <div className="dba-descuentos-title">💳 Descuentos aplicados</div>
                                    {emp.detalleDescuentos.map((desc, dIdx) => (
                                      <div key={dIdx} className="dba-descuento-item">
                                        <span>
                                          <span className="dba-descuento-tipo">{tipoLabels[desc.tipo] || desc.tipo}</span>
                                          {desc.descripcion}
                                          <span className="dba-descuento-cuota">(Cuota {desc.cuotaNumero}/{desc.cuotaTotal})</span>
                                        </span>
                                        <span className="dba-descuento-valor">-${desc.valor?.toLocaleString('es-CO')}</span>
                                      </div>
                                    ))}
                                    <div className="dba-descuentos-total">
                                      <span>Total descuentos</span>
                                      <span className="dba-descuentos-total-valor">-${emp.otrosDescuentos?.toLocaleString('es-CO')}</span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB: HISTORIAL */}
        {tabActiva === 'historial' && (
          <div>
            <div className="dba-historial-filter">
              <label>Filtrar por año:</label>
              <select className="dba-form-select" style={{ display: 'inline-block', width: 'auto' }}
                value={form.anio} onChange={e => { setForm({...form, anio: Number(e.target.value)}); cargarNominasExistentes(); }}>
                {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {nominasExistentes.length === 0 ? (
              <div className="dba-historial-empty">
                <div className="dba-historial-empty-icon">📋</div>
                <h3>No hay nóminas para {form.anio}</h3>
                <p>Ve a "Generar Nómina" para crear la primera.</p>
              </div>
            ) : (
              <div className="dba-historial-list">
                {nominasExistentes.map(nom => (
                  <div key={nom._id} className="dba-historial-item">
                    <div>
                      <h4>{nom.idNomina}</h4>
                      <p>
                        📅 {fmtFecha(nom.fechaInicio)} - {fmtFecha(nom.fechaFin)}
                        {' | '}👥 {nom.empleados?.length || 0} empleados
                        {' | '}💰 ${nom.totalNomina?.toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div className="dba-historial-actions">
                      {getBadgeEstado(nom.estado)}
                      {nom.estado === 'aprobada' && (
                        <button className="dba-btn-pagar-sm" onClick={() => marcarPagada(nom.idNomina)}>💰 Pagar</button>
                      )}
                      <button className="dba-btn-ver" onClick={() => { setResultado(nom); setTabActiva('generar'); }}>👁️ Ver</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GenerarNomina;