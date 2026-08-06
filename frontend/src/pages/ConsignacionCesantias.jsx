import React, { useState, useEffect } from 'react';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

const fmt = (v) => (v || 0).toLocaleString('es-CO');

const fondos = [
  { value: 'PORVENIR', label: 'Porvenir', color: '#d17325' },
  { value: 'PROTECCION', label: 'Protección', color: '#0055a4' },
  { value: 'COLFONDOS', label: 'Colfondos', color: '#2a51a5' },
  { value: 'SKANDIA', label: 'Skandia', color: '#41a837' },
  { value: 'FNA', label: 'FNA', color: '#1e88e5' }
];

function ConsignacionCesantias() {
  const [anio, setAnio] = useState(new Date().getFullYear() - 1);
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [fondoFiltro, setFondoFiltro] = useState('');
  
  const [tabActiva, setTabActiva] = useState('generar');
  
  const userRol = localStorage.getItem('rol') || 'ADMIN';

  // Al cargar el componente, traemos el historial del localStorage
  useEffect(() => {
    cargarHistorialLocal();
  }, []);

  // Cargar historial desde el almacenamiento local del navegador
  const cargarHistorialLocal = () => {
    try {
      const guardado = localStorage.getItem('cesantias_historial');
      if (guardado) {
        setHistorial(JSON.parse(guardado));
      }
    } catch (err) {
      console.error("Error cargando historial local:", err);
    }
  };

  // Guardar en el almacenamiento local
  const guardarEnHistorialLocal = (nuevoRegistro) => {
    try {
      // 1. Obtenemos el historial actual
      const actual = localStorage.getItem('cesantias_historial');
      let historialActualizado = actual ? JSON.parse(actual) : [];
      
      // 2. Verificamos si ya existe un registro para ese año para no duplicarlo
      const existe = historialActualizado.some(item => item.anio === nuevoRegistro.anio);
      
      if (!existe) {
        // 3. Agregamos el nuevo y lo guardamos
        historialActualizado.unshift(nuevoRegistro); // Lo ponemos al inicio
        localStorage.setItem('cesantias_historial', JSON.stringify(historialActualizado));
        setHistorial(historialActualizado);
      }
    } catch (err) {
      console.error("Error guardando historial local:", err);
    }
  };

  const generar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');
   try {
      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/nomina/cesantias-fondo`, {
        method: 'POST',
        body: JSON.stringify({ anio })
      });
      const data = await res.json();
      if (data.success) {
        // ✅ CAMBIO CLAVE: Tomamos el objeto de datos (puede venir como data.data o directamente como data)
        const resultadoGuardar = data.data || data;
        
        setResultado(resultadoGuardar);
        setMensaje('✅ Cálculo generado exitosamente');
        
        // ✅ Guardamos en el historial local (Frontend)
        guardarEnHistorialLocal(resultadoGuardar);
        
      } else {
        setMensaje('❌ ' + (data.error || 'Error al generar'));
      }
    } catch (err) {
      setMensaje('❌ Error de conexión');
    }
    setCargando(false);
  };

  const exportarExcel = (data = null, year = null, filter = null) => {
    const datosAExportar = data || resultado;
    if (!datosAExportar) return;
    
    const SEP = ';';
    const filtrados = filter
      ? datosAExportar.empleados.filter(e => e.fondoCesantias === filter)
      : datosAExportar.empleados;

    const headers = [
      'Nombre', 'Documento', 'Tipo Empleado', 'Cargo', 'Fondo Cesantias',
      'Numero Cuenta', 'Salario Base', 'Auxilio Transporte', 'Base Liquidacion',
      'Dias Trabajados', 'Cesantias', 'Intereses', 'Total a Consignar',
      'Fecha Ingreso', 'Estado'
    ];

    const filas = filtrados.map(emp => [
      emp.nombre, emp.documento, emp.tipoEmpleado, emp.cargo, emp.fondoCesantias,
      emp.numeroCuenta, emp.salarioBase, emp.auxilioTransporte, emp.baseLiquidacion,
      emp.diasTrabajados, emp.cesantias, emp.intereses, emp.total,
      emp.fechaIngreso ? new Date(emp.fechaIngreso).toLocaleDateString('es-CO') : '', emp.estado
    ]);

    const escapar = (valor) => {
      const str = String(valor);
      if (str.includes(SEP) || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csv = [headers.join(SEP), ...filas.map(f => f.map(escapar).join(SEP))].join('\r\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const nombreFiltro = filter ? filter : 'TODOS';
    const anioDesc = year || anio;
    link.download = `Cesantias_Fondo_${anioDesc}_${nombreFiltro}.csv`;
    link.click();
  };

  const empleadosFiltrados = fondoFiltro && resultado
    ? resultado.empleados.filter(e => e.fondoCesantias === fondoFiltro)
    : resultado?.empleados || [];

  const totalFiltrado = empleadosFiltrados.reduce((s, e) => s + e.total, 0);

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        <div className="dba-header-text">
          <h1 className="dba-title">🏦 Consignación de Cesantías a Fondo</h1>
          <p className="dba-subtitle">Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong></p>
        </div>

        {mensaje && (
          <div className={`dba-alert ${mensaje.includes('❌') ? 'dba-alert-error' : 'dba-alert-success'}`}>
            <span>{mensaje}</span>
            <button onClick={() => setMensaje('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="dba-tabs">
          {[
            { key: 'generar', label: '🧮 Generar Planilla', color: '#127782' },
            { key: 'historial', label: '📋 Historial de Cesantías', color: '#7b1fa2' },
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
            <div className="dba-form-section">
              <form onSubmit={generar}>
                <div className="dba-filters" style={{ marginBottom: 0 }}>
                  <div className="dba-form-group">
                    <label className="dba-label">Año a liquidar</label>
                    <select className="dba-select" value={anio} onChange={e => setAnio(Number(e.target.value))}>
                      {[2023, 2024, 2025, 2026].map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <small style={{ color: 'var(--gris-500)', fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>
                      Se consigna en febrero del año siguiente
                    </small>
                  </div>
                  <button type="submit" className="dba-btn dba-btn-primary" disabled={cargando} style={{ opacity: cargando ? 0.6 : 1 }}>
                    {cargando ? '⏳ Calculando...' : '📊 Generar Planilla'}
                  </button>
                </div>
              </form>
            </div>

            {resultado && (
              <div>
                {/* Stats */}
                <div className="dba-stats-grid">
                  <div className="dba-stat-card" style={{ background: '#127782' }}>
                    <div className="stat-label">Empleados</div>
                    <div className="stat-value">{resultado.totalEmpleados}</div>
                  </div>
                  <div className="dba-stat-card" style={{ background: '#1a3c40' }}>
                    <div className="stat-label">Total a consignar</div>
                    <div className="stat-value">${fmt(resultado.totalConsignar)}</div>
                  </div>
                  <div className="dba-stat-card" style={{ background: '#2c3e50' }}>
                    <div className="stat-label">Fecha límite</div>
                    <div className="stat-value" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)' }}>28 Feb {anio + 1}</div>
                  </div>
                </div>

                {/* Filtro por fondo */}
                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className="dba-label" style={{ marginBottom: 0 }}>Filtrar por fondo:</label>
                  <select className="dba-select" value={fondoFiltro} onChange={e => setFondoFiltro(e.target.value)} style={{ minWidth: '180px' }}>
                    <option value="">Todos los fondos</option>
                    {fondos.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  {fondoFiltro && (
                    <span className="dba-estado" style={{
                      background: fondos.find(f => f.value === fondoFiltro)?.color + '20',
                      color: fondos.find(f => f.value === fondoFiltro)?.color
                    }}>
                      {fondos.find(f => f.value === fondoFiltro)?.label}
                    </span>
                  )}
                  <button onClick={() => exportarExcel()} className="dba-btn dba-btn-primary" style={{ marginLeft: 'auto' }}>
                    📥 Descargar Excel
                  </button>
                </div>

                {/* Tabla */}
                <div className="dba-table-wrapper">
                  <table className="dba-table">
                    <thead>
                      <tr>
                        <th>Empleado</th>
                        <th>Documento</th>
                        <th>Fondo</th>
                        <th style={{ textAlign: 'right' }}>Salario Base</th>
                        <th style={{ textAlign: 'center' }}>Días</th>
                        <th style={{ textAlign: 'right' }}>Cesantías</th>
                        <th style={{ textAlign: 'right' }}>Intereses</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empleadosFiltrados.map((emp, idx) => (
                        <tr key={idx}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{emp.nombre}</div>
                            <div style={{ fontSize: '12px', color: 'var(--gris-500)' }}>{emp.email}</div>
                          </td>
                          <td>{emp.documento}</td>
                          <td>
                            <span className="dba-estado" style={{
                              background: fondos.find(f => f.value === emp.fondoCesantias)?.color + '15' || '#f0f0f0',
                              color: fondos.find(f => f.value === emp.fondoCesantias)?.color || '#666'
                            }}>
                              {fondos.find(f => f.value === emp.fondoCesantias)?.label || emp.fondoCesantias}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>${fmt(emp.salarioBase)}</td>
                          <td style={{ textAlign: 'center' }}>{emp.diasTrabajados}</td>
                          <td style={{ textAlign: 'right' }}>${fmt(emp.cesantias)}</td>
                          <td style={{ textAlign: 'right' }}>${fmt(emp.intereses)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#c0392b' }}>${fmt(emp.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--gris-100)', fontWeight: 'bold' }}>
                        <td colSpan="7" style={{ padding: '12px', textAlign: 'right' }}>
                          TOTAL {fondoFiltro ? fondos.find(f => f.value === fondoFiltro)?.label : 'TODOS LOS FONDOS'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#c0392b', fontSize: '16px' }}>${fmt(totalFiltrado)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Nota legal */}
                <div className="dba-info-box dba-info-box-orange" style={{ marginTop: '20px' }}>
                  <strong>⚠️ Importante:</strong> La consignación debe realizarse antes del <strong>28 de febrero de {anio + 1}</strong>.
                  Cada fondo tiene su propio formato de planilla — este archivo es genérico.
                  Verifica los requisitos específicos de {fondoFiltro ? fondos.find(f => f.value === fondoFiltro)?.label : 'cada fondo'} antes de cargar la planilla.
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB: HISTORIAL (Cargado desde localStorage) */}
        {tabActiva === 'historial' && (
          <div>
            <div className="dba-historial-filter" style={{ marginBottom: '20px' }}>
              <label>Historial de años generados:</label>
            </div>

            {historial.length === 0 ? (
              <div className="dba-historial-empty">
                <div className="dba-historial-empty-icon">📋</div>
                <h3>No hay cesantías generadas</h3>
                <p>Ve a "Generar Planilla" para crear el primer reporte.</p>
              </div>
            ) : (
              <div className="dba-historial-list">
                {historial.map((item, idx) => (
                  <div key={idx} className="dba-historial-item">
                    <div>
                      <h4>{item.idReporte || `Cesantías ${item.anio}`}</h4>
                      <p>
                        📅 Año: <strong>{item.anio}</strong>
                        {' | '}👥 {item.totalEmpleados || 0} empleados
                        {' | '}💰 Total: ${fmt(item.totalConsignar || 0)}
                      </p>
                    </div>
                    <div className="dba-historial-actions">
                      <button className="dba-btn-ver" onClick={() => { setResultado(item); setTabActiva('generar'); }}>
                        👁️ Ver Detalle
                      </button>
                      <button className="dba-btn-export" onClick={() => exportarExcel(item, item.anio, fondoFiltro)}>
                        📥 Descargar Excel
                      </button>
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

export default ConsignacionCesantias;