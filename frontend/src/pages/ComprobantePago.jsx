import React, { useState, useEffect, useCallback } from 'react';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

const fmt = (v) => (v || 0).toLocaleString('es-CO');

const fmtFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const str = fechaStr.toString();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return new Date(fechaStr).toLocaleDateString('es-CO');
};

const getValorExtras = (emp, tipo) => {
  if (emp.valorExtrasDiurnas !== undefined && tipo === 'diurnas') return emp.valorExtrasDiurnas;
  if (emp.valorExtrasNocturnas !== undefined && tipo === 'nocturnas') return emp.valorExtrasNocturnas;
  if (emp.valorExtrasDominical !== undefined && tipo === 'dominical') return emp.valorExtrasDominical;
  if (emp.valorExtrasNocturnasDominical !== undefined && tipo === 'nocturnasDom') return emp.valorExtrasNocturnasDominical;

  const vh = emp.valorHora || (emp.salarioBase / 240) || 0;
  if (tipo === 'diurnas') return Math.round((emp.horasExtrasDiurnas || 0) * vh * 1.25);
  if (tipo === 'nocturnas') return Math.round((emp.horasExtrasNocturnas || 0) * vh * 1.75);
  if (tipo === 'dominical') return Math.round((emp.horasExtrasDominical || 0) * vh * 2.0);
  if (tipo === 'nocturnasDom') return Math.round((emp.horasExtrasNocturnasDominical || 0) * vh * 2.5);
  return 0;
};

function ComprobantePago() {
  const rol = localStorage.getItem('rol');
  const emailUsuario = localStorage.getItem('email');
  const esAdmin = ['admin', 'gerente', 'secretaria', 'contabilidad'].includes(rol);

  const [nominas, setNominas] = useState([]);
  const [nominaSeleccionada, setNominaSeleccionada] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  // Detectar rol del usuario desde localStorage o default
  const userRol = localStorage.getItem('rol') || 'ADMIN';

  const cargarEmpleados = useCallback(async () => {
    try {
      const res = await fetchConAuth('${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/usuarios');
      const data = await res.json();
      if (data.success) setEmpleados(data.data);
    } catch (err) { console.error(err); }
  }, []);

  const cargarNominas = useCallback(async () => {
    setCargando(true);
    setMensaje('');
    try {
      const res = await fetchConAuth(`${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/nomina?anio=${anio}`);
      const data = await res.json();

      if (!res.ok) {
        setMensaje(`❌ Error del servidor: ${data.message || 'No se pudieron cargar las nóminas'}`);
        setNominas([]);
        setCargando(false);
        return;
      }

      if (data.success) {
        const estadosPermitidos = esAdmin ? ['aprobada', 'pagada'] : ['pagada'];
        const filtradas = data.data.filter(n => estadosPermitidos.includes(n.estado));
        setNominas(filtradas);

        if (filtradas.length === 0) {
          setMensaje(esAdmin
            ? `📋 No hay nóminas aprobadas o pagadas para el año ${anio}. Ve a "Generar Nómina" para crear una.`
            : `📋 No hay nóminas pagadas disponibles para el año ${anio}.`
          );
        }
      } else {
        setMensaje('❌ ' + (data.error || 'Error al cargar nóminas'));
        setNominas([]);
      }
    } catch (err) {
      console.error(err);
      setMensaje('❌ Error de conexión al cargar nóminas');
      setNominas([]);
    }
    setCargando(false);
  }, [anio, esAdmin]);

  useEffect(() => {
    cargarEmpleados();
    cargarNominas();
  }, [cargarEmpleados, cargarNominas]);

  const getNombreEmpleado = (email) => {
    const emp = empleados.find(e => e.email === email);
    return emp ? emp.nombre : email;
  };

  const getCargoEmpleado = (email) => {
    if (empleados.length === 0) return 'N/A';
    const emp = empleados.find(e => e.email === email);
    return emp?.cargo || emp?.rol || 'N/A';
  };

  const verComprobante = async () => {
    if (!nominaSeleccionada) return;
    setCargando(true);
    setMensaje('');
    try {
      const res = await fetchConAuth(`${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/nomina/${nominaSeleccionada}`);
      const data = await res.json();
      if (data.success) {
        if (!esAdmin) {
          const miComprobante = data.data.empleados.find(e => e.email === emailUsuario);
          setDetalle({ ...data.data, empleados: miComprobante ? [miComprobante] : [] });
        } else {
          setDetalle(data.data);
        }
      } else {
        setMensaje('❌ ' + (data.error || 'Error al cargar comprobante'));
      }
    } catch (err) {
      setMensaje('❌ Error de conexión al cargar comprobante');
    }
    setCargando(false);
  };

  const empleadosFiltrados = detalle?.empleados?.filter(emp => {
    if (!busquedaEmpleado.trim()) return true;
    const termino = busquedaEmpleado.toLowerCase();
    const nombre = getNombreEmpleado(emp.email).toLowerCase();
    return nombre.includes(termino) || emp.email.toLowerCase().includes(termino);
  }) || [];

  const imprimir = () => {
    // Asegurar que no haya comprobantes marcados como activos
    document.querySelectorAll('.imprimir-activo').forEach(el => el.classList.remove('imprimir-activo'));
    const originalTitle = document.title;
    document.title = `Comprobante_${detalle?.idNomina || 'nomina'}`;
    window.print();
    document.title = originalTitle;
  };

  const imprimirComprobanteIndividual = (idx) => {
    const comprobante = document.getElementById(`comprobante-${idx}`);
    if (!comprobante) return;

    // Quitar marca de cualquier otro comprobante
    document.querySelectorAll('.imprimir-activo').forEach(el => el.classList.remove('imprimir-activo'));
    
    // Marcar este comprobante como activo
    comprobante.classList.add('imprimir-activo');

    const originalTitle = document.title;
    document.title = `Comprobante_${detalle?.idNomina || 'nomina'}_${idx}`;
    window.print();
    document.title = originalTitle;

    // Quitar la marca después de imprimir
    setTimeout(() => {
      comprobante.classList.remove('imprimir-activo');
    }, 500);
  };

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        <div className="dba-header-text no-print">
          <h1 className="dba-title">🧾 Comprobante de Pago</h1>
          <p className="dba-subtitle">Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong></p>
        </div>

        {mensaje && (
          <div className={`dba-alert ${mensaje.includes('❌') ? 'dba-alert-error' : 'dba-alert-info'} no-print`}>
            <span>{mensaje}</span>
            <button onClick={() => setMensaje('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Filtros */}
        <div className="dba-filters no-print">
          <div className="dba-form-group">
            <label className="dba-label">Año</label>
            <select className="dba-select" value={anio} onChange={e => setAnio(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="dba-form-group">
            <label className="dba-label">Seleccionar Nómina</label>
            <select
              className="dba-select"
              value={nominaSeleccionada}
              onChange={e => setNominaSeleccionada(e.target.value)}
              disabled={nominas.length === 0}
              style={{ minWidth: '280px' }}
            >
              <option value="">
                {nominas.length === 0 ? '-- No hay nóminas disponibles --' : '-- Seleccione --'}
              </option>
              {nominas.map(n => (
                <option key={n._id} value={n.idNomina}>
                  {n.idNomina} ({n.anio}-{String(n.mes).padStart(2,'0')} Q{n.quincena}) - {n.estado === 'pagada' ? '💰 Pagada' : '✅ Aprobada'}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={verComprobante}
            disabled={cargando || !nominaSeleccionada || nominas.length === 0}
            className="dba-btn dba-btn-primary"
            style={{ opacity: cargando || !nominaSeleccionada ? 0.6 : 1 }}
          >
            {cargando ? '⏳ Cargando...' : '👁️ Ver Comprobantes'}
          </button>
        </div>

        {/* Empty state */}
        {nominas.length === 0 && esAdmin && !cargando && !mensaje.includes('❌') && (
          <div className="dba-empty no-print">
            <div className="dba-empty-icon">📋</div>
            <h3>No hay nóminas disponibles</h3>
            <p>No se encontraron nóminas {esAdmin ? 'aprobadas o pagadas' : 'pagadas'} para el año {anio}.</p>
            {esAdmin && (
              <a href="/nomina/generar" className="dba-btn dba-btn-primary" style={{ marginTop: '15px', textDecoration: 'none' }}>
                💰 Ir a Generar Nómina
              </a>
            )}
          </div>
        )}

        {/* Detalle de nómina */}
        {detalle && (
          <div>
            {/* Info general */}
            <div className="dba-info-box dba-info-box-blue no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: 'var(--gris-800)' }}>📋 {detalle.idNomina}</h3>
                <p style={{ margin: 0, color: 'var(--gris-600)' }}>
                  Período: {fmtFecha(detalle.fechaInicio)} - {fmtFecha(detalle.fechaFin)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`dba-estado dba-estado-${detalle.estado}`}>
                  {detalle.estado === 'pagada' ? '💰 Pagada' : '✅ Aprobada'}
                </span>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--gris-500)' }}>
                  {detalle.empleados?.length || 0} empleados
                </p>
              </div>
            </div>

            {/* Buscador + Botón Imprimir Todos (arriba, fuera de los comprobantes) */}
            {esAdmin && (
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }} className="no-print">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="dba-input"
                    placeholder="🔍 Buscar empleado..."
                    value={busquedaEmpleado}
                    onChange={e => setBusquedaEmpleado(e.target.value)}
                    style={{ maxWidth: '300px' }}
                  />
                  <span style={{ color: 'var(--gris-500)', fontSize: '0.9rem' }}>
                    {empleadosFiltrados.length} de {detalle.empleados?.length || 0} empleados
                  </span>
                </div>
                {empleadosFiltrados.length > 1 && (
                  <button
                    onClick={imprimir}
                    className="dba-btn dba-btn-secondary"
                    style={{ background: '#333', color: 'white' }}
                  >
                    📑 Imprimir todos ({empleadosFiltrados.length})
                  </button>
                )}
              </div>
            )}

            {/* Lista de comprobantes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {empleadosFiltrados.map((emp, idx) => {
                const vExtrasDiurnas = getValorExtras(emp, 'diurnas');
                const vExtrasNocturnas = getValorExtras(emp, 'nocturnas');
                const vExtrasDominical = getValorExtras(emp, 'dominical');
                const vExtrasNocturnasDom = getValorExtras(emp, 'nocturnasDom');
                const recargos = (emp.recargoNocturno || 0) + (emp.recargoDominical || 0);
                const cargo = emp.cargo && emp.cargo !== 'N/A' ? emp.cargo : getCargoEmpleado(emp.email);
                const valorDia = Math.round((emp.salarioBase || 0) / 30);
                const salarioProporcional = Math.round(valorDia * (emp.diasTrabajados || 0));

                return (
                  <div key={idx} id={`comprobante-${idx}`} className="dba-comprobante">
                    {/* ENCABEZADO EMPRESA */}
                    <div className="dba-comprobante-header">
                      <h2>NEOCONSTRUCCIONES INTEGRALES SAS</h2>
                      <p>NIT: 901421096-1 | Dirección: Calle 11C No. 80b-70</p>
                      <div className="dba-comprobante-header-meta">
                        <span><strong>Nómina:</strong> {detalle.idNomina}</span>
                        <span><strong>Período:</strong> {fmtFecha(detalle.fechaInicio)} - {fmtFecha(detalle.fechaFin)}</span>
                      </div>
                    </div>

                    {/* INFO EMPLEADO */}
                    <div className="dba-comprobante-info">
                      <div className="dba-comprobante-info-row">
                        <div>
                          <h3>👤 {getNombreEmpleado(emp.email)}</h3>
                          <p>
                            <strong>Correo:</strong> {emp.email} | <strong>Cargo:</strong> {cargo} | <strong>Días trabajados:</strong> {emp.diasTrabajados || 0}
                          </p>
                        </div>
                        <div className="dba-comprobante-salario-box">
                          <span><strong>Salario Base:</strong> ${fmt(emp.salarioBase)}</span>
                          <span><strong>Valor Día:</strong> ${fmt(valorDia)}</span>
                        </div>
                      </div>
                    </div>

                    {/* GRID DEVENGADOS + DEDUCCIONES */}
                    <div className="dba-comprobante-grid">
                      {/* DEVENGADOS */}
                      <div className="dba-comprobante-section devengados">
                        <h4>💰 DEVENGADOS</h4>
                        <div className="dba-comprobante-item">
                          <span>Salario por Días Trabajados</span>
                          <span>${fmt(salarioProporcional)}</span>
                        </div>
                        <div className="dba-comprobante-item">
                          <span>Auxilio Transporte</span>
                          <span>${fmt(emp.auxilioTransporte)}</span>
                        </div>
                        {(emp.horasExtrasDiurnas > 0 || vExtrasDiurnas > 0) && (
                          <div className="dba-comprobante-item">
                            <span>Horas Extras Diurnas ({emp.horasExtrasDiurnas || 0}h)</span>
                            <span>${fmt(vExtrasDiurnas)}</span>
                          </div>
                        )}
                        {(emp.horasExtrasNocturnas > 0 || vExtrasNocturnas > 0) && (
                          <div className="dba-comprobante-item">
                            <span>Horas Extras Nocturnas ({emp.horasExtrasNocturnas || 0}h)</span>
                            <span>${fmt(vExtrasNocturnas)}</span>
                          </div>
                        )}
                        {(emp.horasExtrasDominical > 0 || vExtrasDominical > 0) && (
                          <div className="dba-comprobante-item">
                            <span>Horas Extras Dominical ({emp.horasExtrasDominical || 0}h)</span>
                            <span>${fmt(vExtrasDominical)}</span>
                          </div>
                        )}
                        {(emp.horasExtrasNocturnasDominical > 0 || vExtrasNocturnasDom > 0) && (
                          <div className="dba-comprobante-item">
                            <span>Horas Extras Noct. Dom. ({emp.horasExtrasNocturnasDominical || 0}h)</span>
                            <span>${fmt(vExtrasNocturnasDom)}</span>
                          </div>
                        )}
                        {recargos > 0 && (
                          <div className="dba-comprobante-item">
                            <span>Recargos</span>
                            <span>${fmt(recargos)}</span>
                          </div>
                        )}
                        {(emp.vacacionesPagadas > 0) && (
                          <div className="dba-comprobante-item novedad">
                            <span>Vacaciones pagadas</span>
                            <span>${fmt(emp.vacacionesPagadas)}</span>
                          </div>
                        )}
                        {(emp.licenciaRemunerada > 0) && (
                          <div className="dba-comprobante-item novedad">
                            <span>Licencia remunerada</span>
                            <span>${fmt(emp.licenciaRemunerada)}</span>
                          </div>
                        )}
                        {(emp.incapacidadPagadaEmpresa > 0) && (
                          <div className="dba-comprobante-item novedad">
                            <span>Incapacidad (empresa)</span>
                            <span>${fmt(emp.incapacidadPagadaEmpresa)}</span>
                          </div>
                        )}
                        <div className="dba-comprobante-item total">
                          <span>TOTAL DEVENGADO</span>
                          <span>${fmt(emp.totalDevengado)}</span>
                        </div>
                      </div>

                      {/* DEDUCCIONES */}
                      <div className="dba-comprobante-section deducciones">
                        <h4>💸 DEDUCCIONES</h4>
                        <div className="dba-comprobante-item">
                          <span>Salud (4%)</span>
                          <span>${fmt(emp.saludEmpleado)}</span>
                        </div>
                        <div className="dba-comprobante-item">
                          <span>Pensión (4%)</span>
                          <span>${fmt(emp.pensionEmpleado)}</span>
                        </div>
                        <div className="dba-comprobante-item">
                          <span>
                            Otros descuentos
                            {emp.detalleDescuentos?.length > 0 && (
                              <span style={{ color: '#c0392b', fontSize: '12px', marginLeft: '4px' }}>
                                ({emp.detalleDescuentos.map(d => d.descripcion || d.tipo).join(', ')})
                              </span>
                            )}
                          </span>
                          <span>${fmt(emp.otrosDescuentos)}</span>
                        </div>
                        <div className="dba-comprobante-item total">
                          <span>TOTAL DEDUCCIONES</span>
                          <span>${fmt(emp.totalDeducciones)}</span>
                        </div>
                      </div>
                    </div>

                    {/* NETO A PAGAR */}
                    <div className="dba-neto">
                      <p>NETO A PAGAR</p>
                      <h2>${fmt(emp.netoAPagar)}</h2>
                    </div>

                    {/* APORTES EMPLEADOR */}
                    <div className="dba-aportes">
                      <h4>🏢 Aportes del Empleador</h4>
                      <div className="dba-aportes-row">
                        <span><strong>Salud (8.5%):</strong> ${fmt(emp.saludEmpleador)}</span>
                        <span><strong>Pensión (12%):</strong> ${fmt(emp.pensionEmpleador)}</span>
                        <span><strong>ARL:</strong> ${fmt(emp.arl)}</span>
                        <span><strong>Caja Comp.:</strong> ${fmt(emp.cajaCompensacion)}</span>
                      </div>
                      <p className="dba-aportes-costo-total">
                        <strong>Costo Total Empleador:</strong> ${fmt(emp.costoTotalEmpleador)}
                      </p>
                    </div>

                    {/* FIRMAS */}
                    <div className="dba-firmas">
                      <div className="dba-firma-box">
                        <div className="dba-firma-line">
                          <p>Firma Empleado</p>
                        </div>
                      </div>
                      <div className="dba-firma-box">
                        <div className="dba-firma-line">
                          <p>Firma Empleador</p>
                        </div>
                      </div>
                    </div>

                    {/* BOTÓN SOLO PARA IMPRIMIR ESTE COMPROBANTE */}
                    <div className="dba-comprobante-actions no-print">
                      <button
                        onClick={() => imprimirComprobanteIndividual(idx)}
                        className="dba-btn dba-btn-primary"
                      >
                        🖨️ Imprimir este comprobante
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComprobantePago;