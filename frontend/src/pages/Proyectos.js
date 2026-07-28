import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import CotizacionAdicionalModal from '../components/CotizacionAdicionalModal';
import FacturaProyectoModal from '../components/FacturaProyectoModal';
import '../style/proyectos.css';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;

function Proyectos() {
  const navigate = useNavigate();
  const [accesoPermitido, setAccesoPermitido] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroCliente, setFiltroCliente] = useState('Todos');

  // Datos
  const [proyectos, setProyectos] = useState([]);
  const [cotizacionesAprobadas, setCotizacionesAprobadas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clientesUnicos, setClientesUnicos] = useState([]);

  // Modal de detalle
  const [showDetalle, setShowDetalle] = useState(false);
  const [proyectoDetalle, setProyectoDetalle] = useState(null);

  // Modal cotizacion adicional
  const [showCotizacionFull, setShowCotizacionFull] = useState(false);
  const [proyectoParaCotizacion, setProyectoParaCotizacion] = useState(null);
  const [cotizacionParaEditar, setCotizacionParaEditar] = useState(null);

  // Modal factura
  const [showFacturaFull, setShowFacturaFull] = useState(false);
  const [proyectoParaFactura, setProyectoParaFactura] = useState(null);
  const [facturaParaEditar, setFacturaParaEditar] = useState(null);

  // Modal seguimientos
  const [showSeguimientos, setShowSeguimientos] = useState(false);
  const [seguimientoData, setSeguimientoData] = useState({
    tipo: 'avance', descripcion: '', porcentajeAvance: 0, evidencias: []
  });

  // Edicion inline
  const [editandoID, setEditandoID] = useState(null);
  const [camposEditar, setCamposEditar] = useState({
    porcentajeAvance: 0, seguimiento: '', nombreProyecto: '', estado: 'Creado'
  });

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const proyectoId = searchParams.get('proyecto');
    if (proyectoId) setFiltroTexto(proyectoId);
  }, [searchParams]);

  useEffect(() => {
    const rol = localStorage.getItem('rol');
    const isAuth = localStorage.getItem('auth');
    const permisos = ['admin', 'comercial', 'gerente', 'ingeniero'];
    if (!isAuth || !permisos.includes(rol)) {
      alert("Acceso denegado");
      navigate('/admin');
    } else {
      setAccesoPermitido(true);
      cargarDatos();
    }
  }, [navigate]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resProyectos, resCotizaciones, resClientes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/proyectos`).catch(() => ({ data: { data: [] } })),
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/proyectos/cotizaciones-aprobadas`).catch(() => ({ data: { data: [] } })),
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/clientes`).catch(() => ({ data: { data: [] } }))
      ]);
      const proyectosData = resProyectos.data?.data || [];
      const clientesData = resClientes.data?.data || [];
      setProyectos(proyectosData);
      setCotizacionesAprobadas(resCotizaciones.data?.data || []);
      setClientes(clientesData);
      const clientesEnProyectos = [...new Set(proyectosData.map(p => p.idCliente))];
      setClientesUnicos(clientesData.filter(c => clientesEnProyectos.includes(c.idCliente)));
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const obtenerInfoCliente = (idCliente, idSede) => {
    const cliente = clientes.find(c => c.idCliente === idCliente);
    if (!cliente) return { nombre: 'N/A', sede: 'N/A', nit: '', direccion: '', contacto: '' };
    const nombreEmp = cliente.nombreEmp || "Empresa";
    if (String(idSede).includes("PRINCIPAL")) {
      return { nombre: nombreEmp, sede: "Principal", nit: cliente.nit, direccion: cliente.direccion, contacto: cliente.telefono || cliente.celular };
    }
    const sede = cliente.sedes?.find(s => s.id === idSede);
    return { nombre: nombreEmp, sede: sede ? sede.nombreSede : "Sede no encontrada", nit: cliente.nit, direccion: sede?.direccion || cliente.direccion, contacto: sede?.celular || cliente.telefono };
  };

  const iniciarEdicion = (p) => { 
    setEditandoID(p.idProyecto); 
    setCamposEditar({ 
      porcentajeAvance: p.porcentajeAvance || 0, 
      seguimiento: p.seguimiento || '', 
      nombreProyecto: p.nombreProyecto || '', 
      estado: p.estado || 'Creado' 
    }); 
  };

  const guardarCambios = async (idProyecto) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/proyectos/${idProyecto}`, { 
    porcentajeAvance: Number(camposEditar.porcentajeAvance), 
    seguimiento: camposEditar.seguimiento, 
    nombreProyecto: camposEditar.nombreProyecto.toUpperCase(), 
    estado: camposEditar.estado 
});
      alert('Proyecto actualizado'); 
      setEditandoID(null); 
      cargarDatos();
    } catch (error) { 
      alert("Error: " + (error.response?.data?.message || error.message)); 
    }
  };

  const eliminarProyecto = async (id) => {
    if (!window.confirm("¿Eliminar este proyecto? Se eliminarán también las facturas no pagadas asociadas.")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/proyectos/${id}`);
      alert("Proyecto eliminado");
      cargarDatos();
    } catch (error) {
      const mensaje = error.response?.data?.message || error.message;
      const facturasPagadas = error.response?.data?.facturasPagadas;
      if (facturasPagadas && facturasPagadas.length > 0) {
        alert(`NO SE PUEDE ELIMINAR:
${mensaje}

Facturas pagadas:
${facturasPagadas.join('\n')}`);
      } else {
        alert("Error: " + mensaje);
      }
    }
  };

  const verDetalle = async (proyecto) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/proyectos/${proyecto.idProyecto}`);
      setProyectoDetalle(res.data.data);
      setShowDetalle(true);
    } catch (error) {
      setProyectoDetalle(proyecto);
      setShowDetalle(true);
    }
  };

  const abrirCotizacionFull = (proyecto, cotizacion = null) => {
    setProyectoParaCotizacion(proyecto);
    setCotizacionParaEditar(cotizacion);
    setShowCotizacionFull(true);
  };

  const cerrarCotizacionFull = () => { 
    setShowCotizacionFull(false); 
    setProyectoParaCotizacion(null); 
    setCotizacionParaEditar(null); 
  };

  const abrirFacturaFull = (proyecto, factura = null, opciones = null) => {
    if (opciones?.esSaldoProyecto) {
      const facturaSaldo = {
        ...opciones,
        _esSaldoProyecto: true,
        idFactura: null,
        idCotizacionAdicional: null
      };
      setProyectoParaFactura({...proyecto, _cotizacionAdicionalSeleccionada: null});
      setFacturaParaEditar(facturaSaldo);
      setShowFacturaFull(true);
      return;
    }

    if (opciones?.cotizacionAdicional) {
      setProyectoParaFactura({...proyecto, _cotizacionAdicionalSeleccionada: opciones.cotizacionAdicional});
    } else {
      setProyectoParaFactura({...proyecto, _cotizacionAdicionalSeleccionada: null});
    }

    setFacturaParaEditar(factura);
    setShowFacturaFull(true);
  };

  const cerrarFacturaFull = () => { 
    setShowFacturaFull(false); 
    setProyectoParaFactura(null); 
    setFacturaParaEditar(null); 
  };

  const onSuccessCotizacion = () => { 
    cargarDatos(); 
    if (showDetalle && proyectoDetalle) verDetalle(proyectoDetalle); 
  };

  const abrirSeguimientos = (proyecto) => { 
    setProyectoDetalle(proyecto); 
    setSeguimientoData({ tipo: 'avance', descripcion: '', porcentajeAvance: proyecto.porcentajeAvance || 0, evidencias: [] }); 
    setShowSeguimientos(true); 
  };

  const guardarSeguimiento = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/proyectos/${proyectoDetalle.idProyecto}/seguimientos`, seguimientoData, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
      });
      alert('Seguimiento agregado'); 
      setShowSeguimientos(false); 
      cargarDatos(); 
      if (showDetalle) verDetalle(proyectoDetalle);
    } catch (error) { 
      alert('Error: ' + (error.response?.data?.message || error.message)); 
    }
  };

  const proyectosFiltrados = proyectos.filter(p => {
    const info = obtenerInfoCliente(p.idCliente, p.idSede);
    const texto = filtroTexto.toLowerCase();
    const coincideTexto = p.nombreProyecto.toLowerCase().includes(texto) || 
                         p.idProyecto.toLowerCase().includes(texto) || 
                         info.nombre.toLowerCase().includes(texto) || 
                         info.sede.toLowerCase().includes(texto);
    const coincideEstado = filtroEstado === 'Todos' || p.estado === filtroEstado;
    const coincideCliente = filtroCliente === 'Todos' || p.idCliente === filtroCliente;
    return coincideTexto && coincideEstado && coincideCliente;
  });

  const colorProgreso = (p) => { 
    if (p <= 20) return '#018cfd'; 
    if (p <= 50) return '#c769f3'; 
    if (p <= 80) return '#e8fc38'; 
    return '#27ae60'; 
  };

  const colorEstado = (e) => { 
    switch (e) { 
      case 'Creado': return '#95a5a6'; 
      case 'Activo': 
      case 'Iniciado': return '#27ae60'; 
      case 'En Ejecucion': return '#17a2b8'; 
      case 'Pausado': return '#f39c12'; 
      case 'Finalizado': return '#3498db'; 
      case 'Cancelado': return '#e74c3c'; 
      default: return '#95a5a6'; 
    } 
  };

  if (!accesoPermitido) return null;

  const userRol = localStorage.getItem('rol') || 'ADMIN';

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        {/* HEADER */}
        <div className="dba-header-text">
          <h1 className="dba-title">📋 Gestión de Proyectos</h1>
          <p className="dba-subtitle">
            Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
          </p>
          <p>Total: <strong>{proyectos.length}</strong> | Mostrando: <strong>{proyectosFiltrados.length}</strong></p>
        </div>

        {/* FILTROS */}
        <div className="filtro-container">
          <input 
            type="text" 
            placeholder="🔍 Buscar por proyecto, cliente o ID..."
            value={filtroTexto} 
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="filtro-input" 
          />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="Todos">Todos los estados</option>
            <option value="Creado">Creado</option>
            <option value="En Espera de Anticipo">En Espera de Anticipo</option>
            <option value="Iniciado">Iniciado</option>
            <option value="En Ejecucion">En Ejecucion</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
            <option value="Todos">Todos los clientes</option>
            {clientesUnicos.map(c => (
              <option key={c.idCliente} value={c.idCliente}>{c.nombreEmp}</option>
            ))}
          </select>
          <button 
            onClick={() => { setFiltroTexto(''); setFiltroEstado('Todos'); setFiltroCliente('Todos'); }}
            className="btn-secondary btn-sm"
          >
            🔄 Limpiar
          </button>
        </div>

        {/* TABLERO */}
        <section className="tablero-container">
          <div className="tablero-list">
            {proyectosFiltrados.map(p => {
              const info = obtenerInfoCliente(p.idCliente, p.idSede);
              return (
                <article 
                  key={p.idProyecto} 
                  className="proyecto-item"
                  style={{ borderLeft: `6px solid ${colorProgreso(p.porcentajeAvance)}` }}
                >
                  {/* HEADER TARJETA */}
                  <div className="item-header">
                    <span className="proyecto-id">{p.idProyecto}</span>
                    <span 
                      className="estado-badge" 
                      style={{ backgroundColor: colorEstado(p.estado) }}
                    >
                      {p.estado}
                    </span>
                    {p.tieneHitos && <span className="hito-badge">HITOS</span>}
                    <span className="sede-text">{info.sede}</span>
                    <span className="fecha-text">{new Date(p.fechaInicio).toLocaleDateString()}</span>
                  </div>

                  {/* INFO PRINCIPAL */}
                  <div className="info-main">
                    <h3>{p.nombreProyecto}</h3>
                    <div className="info-grid">
                      <p><strong>Cliente:</strong> {info.nombre}</p>
                      <p><strong>NIT:</strong> {info.nit || 'N/A'}</p>
                      <p><strong>Direccion:</strong> {info.direccion || 'N/A'}</p>
                      <p><strong>Contacto:</strong> {info.contacto || 'N/A'}</p>
                      {p.idCotizacion && <p><strong>Cotizacion Base:</strong> {p.idCotizacion}</p>}
                    </div>
                  </div>

                  {/* BARRA PROGRESO */}
                  <div className="progreso-container">
                    <div className="progreso-labels">
                      <span>Avance: {p.porcentajeAvance}%</span>
                      <span>Presupuesto: ${Number(p.presupuestoTotal).toLocaleString()}</span>
                    </div>
                    <div className="progreso-barra-bg">
                      <div 
                        className="progreso-barra-fill" 
                        style={{ 
                          width: `${p.porcentajeAvance}%`, 
                          background: colorProgreso(p.porcentajeAvance) 
                        }} 
                      />
                    </div>
                  </div>

                  {/* RESUMEN FINANCIERO */}
                  <div className="resumen-financiero">
                    <span>Ejecutado: ${Number(p.valorTotalEjecutado || 0).toLocaleString()}</span>
                    <span>Facturado: ${Number(p.valorTotalFacturado || 0).toLocaleString()}</span>
                    <span>Cotiz. Adic: {p.cotizacionesAdicionales?.length || 0}</span>
                    <span>Facturas: {p.facturas?.length || 0}</span>
                  </div>

                  {/* SEGUIMIENTO */}
                  <p className="seguimiento-text">{p.seguimiento || 'Sin novedades'}</p>

                  {/* ACCIONES */}
                  {editandoID === p.idProyecto ? (
                    <div className="edicion-inline">
                      <div className="edicion-grid">
                        <div>
                          <label>Nombre:</label>
                          <input 
                            value={camposEditar.nombreProyecto} 
                            onChange={(e) => setCamposEditar(prev => ({ ...prev, nombreProyecto: e.target.value }))} 
                          />
                        </div>
                        <div>
                          <label>Estado:</label>
                          <select 
                            value={camposEditar.estado} 
                            onChange={(e) => setCamposEditar(prev => ({ ...prev, estado: e.target.value }))}
                          >
                            <option value="Creado">Creado</option>
                            <option value="En Espera de Anticipo">En Espera de Anticipo</option>
                            <option value="Iniciado">Iniciado</option>
                            <option value="En Ejecucion">En Ejecucion</option>
                            <option value="Finalizado">Finalizado</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </div>
                        <div>
                          <label>Avance: {camposEditar.porcentajeAvance}%</label>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={camposEditar.porcentajeAvance} 
                            onChange={(e) => setCamposEditar(prev => ({ ...prev, porcentajeAvance: e.target.value }))} 
                          />
                        </div>
                        <div>
                          <label>Seguimiento:</label>
                          <input 
                            value={camposEditar.seguimiento} 
                            onChange={(e) => setCamposEditar(prev => ({ ...prev, seguimiento: e.target.value }))} 
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => guardarCambios(p.idProyecto)} className="btn-success btn-sm">
                          💾 Guardar
                        </button>
                        <button onClick={() => setEditandoID(null)} className="btn-secondary btn-sm">
                          ❌ Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="acciones-container">
                      <button onClick={() => verDetalle(p)} className="btn-info btn-xs">
                        👁️ Ver
                      </button>
                      <button onClick={() => iniciarEdicion(p)} className="btn-warning btn-xs">
                        ✏️ Editar
                      </button>
                      <button onClick={() => abrirCotizacionFull(p)} className="btn-purple btn-xs">
                        + Cotizacion
                      </button>
                      <button onClick={() => abrirSeguimientos(p)} className="btn-teal btn-xs">
                        Seguimiento
                      </button>

                      {/* Boton +Factura con verificacion de saldo pendiente */}
                      {(() => {
                        const totalFacturadoBase = p.facturas?.reduce((sum, f) => {
                          if (!f.esFacturaAdicional && !f.idCotizacionAdicional) {
                            return sum + (f.valor || 0);
                          }
                          return sum;
                        }, 0) || 0;
                        const presupuestoBase = p.presupuestoTotal || 0;
                        const saldoPendienteBase = presupuestoBase - totalFacturadoBase;

                        const tieneCotizacionesConSaldo = p.cotizacionesAdicionales?.some(c => {
                          if (c.estado !== 'Aprobada' && c.estado !== 'En Proceso') return false;
                          const facturasDeCotizacion = p.facturas?.filter(
                            f => f.idCotizacionAdicional === c.idCotizacion && 
                                 (f.estado === 'Pagada' || f.estado === 'Anticipo ya Pagado')
                          ) || [];
                          const totalFacturado = facturasDeCotizacion.reduce((sum, f) => sum + (f.valor || 0), 0);
                          const totalCotizacion = c.total || c.valor || 0;
                          return totalFacturado < totalCotizacion;
                        });

                        const mostrarBoton = saldoPendienteBase > 100 || tieneCotizacionesConSaldo;
                        return mostrarBoton ? (
                          <button onClick={() => abrirFacturaFull(p)} className="btn-orange btn-xs">
                            + Factura
                          </button>
                        ) : null;
                      })()}

                      <button onClick={() => eliminarProyecto(p.idProyecto)} className="btn-danger btn-xs">
                        🗑️ Eliminar
                      </button>
                    </div>
                  )}
                </article>
              );
            })}

            {proyectosFiltrados.length === 0 && (
              <div className="no-results">
                No se encontraron proyectos con los filtros aplicados.
              </div>
            )}
          </div>
        </section>

        {/* ============================================ */}
        {/* MODAL DETALLE / HISTORICO */}
        {/* ============================================ */}
        {showDetalle && proyectoDetalle && (
          <div className="modal-overlay" onClick={() => setShowDetalle(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">{proyectoDetalle.nombreProyecto}</h2>
                  <p className="modal-subtitle">{proyectoDetalle.idProyecto}</p>
                </div>
                <button onClick={() => setShowDetalle(false)} className="btn-link">✕</button>
              </div>

              <div className="modal-body">
                {(() => {
                  const info = obtenerInfoCliente(proyectoDetalle.idCliente, proyectoDetalle.idSede);
                  return (
                    <div className="modal-section">
                      <h4 className="modal-section-title">📋 Informacion General</h4>
                      <div className="info-grid">
                        <p><strong>ID:</strong> {proyectoDetalle.idProyecto}</p>
                        <p><strong>Cliente:</strong> {info.nombre}</p>
                        <p><strong>Sede:</strong> {info.sede}</p>
                        <p>
                          <strong>Estado:</strong>{' '}
                          <span style={{ color: colorEstado(proyectoDetalle.estado) }}>
                            {proyectoDetalle.estado}
                          </span>
                        </p>
                        <p><strong>Presupuesto Base:</strong> ${Number(proyectoDetalle.presupuestoTotal).toLocaleString()}</p>
                        <p><strong>Avance:</strong> {proyectoDetalle.porcentajeAvance}%</p>
                        {proyectoDetalle.idCotizacion && <p><strong>Cotizacion Base:</strong> {proyectoDetalle.idCotizacion}</p>}
                      </div>
                    </div>
                  );
                })()}

                {/* COTIZACIONES ADICIONALES */}
                <div className="modal-section">
                  <h4 className="modal-section-title">
                    📎 Cotizaciones Adicionales ({proyectoDetalle.cotizacionesAdicionales?.length || 0})
                  </h4>
                  {proyectoDetalle.cotizacionesAdicionales?.length > 0 ? (
                    <div className="modal-table-container">
                      <table className="modal-table">
                        <thead>
                          <tr>
                            <th>ID Cotizacion</th>
                            <th className="text-right">Total</th>
                            <th>Notas/Descripcion</th>
                            <th className="text-center">Estado</th>
                            <th>Fecha</th>
                            <th className="text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proyectoDetalle.cotizacionesAdicionales.map((c) => (
                            <tr key={c.idCotizacion || c._id || Math.random()}>
                              <td><strong>{c.idCotizacion}</strong></td>
                              <td className="text-right">${Number(c.total || c.valor || 0).toLocaleString()}</td>
                              <td style={{ maxWidth: '200px' }}>{c.notas || c.descripcion || 'Sin descripcion'}</td>
                              <td className="text-center">
                                <span style={{
                                  background: c.estado === 'Aprobada' ? '#28a745' : c.estado === 'Pendiente' ? '#ffc107' : '#6c757d',
                                  color: c.estado === 'Pendiente' ? '#212529' : 'white',
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600
                                }}>
                                  {c.estado || 'Pendiente'}
                                </span>
                              </td>
                              <td>{c.fecha ? new Date(c.fecha).toLocaleDateString() : (c.fechaAgregado ? new Date(c.fechaAgregado).toLocaleDateString() : 'N/A')}</td>
                              <td className="text-center">
                                {c.estado === 'Pendiente' && (
                                  <>
                                    <button 
                                      onClick={() => { setShowDetalle(false); abrirCotizacionFull(proyectoDetalle, c); }}
                                      className="btn-purple btn-xs"
                                      style={{ marginRight: '4px' }}
                                    >
                                      Editar
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        if (!window.confirm('¿Aprobar esta cotizacion adicional? Se generara la factura de anticipo.')) return;
                                        try {
                                          await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/proyectos/${proyectoDetalle.idProyecto}/cotizaciones-adicionales/${c.idCotizacion}/aprobar`, {}, {
                                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                          });
                                          alert('Cotizacion adicional aprobada!');
                                          cargarDatos(); 
                                          verDetalle(proyectoDetalle);
                                        } catch (e) { alert('Error: ' + (e.response?.data?.message || e.message)); }
                                      }}
                                      className="btn-success btn-xs"
                                    >
                                      Aprobar
                                    </button>
                                  </>
                                )}
                                {c.estado === 'Aprobada' && (
                                  <span className="font-size-11 text-green font-bold">✓ Aprobada</span>
                                )}
                                {c.historialVersiones?.length > 0 && (
                                  <div className="font-size-10 text-gray mt-1">
                                    {c.historialVersiones.length} version(es) anterior(es)
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-gray font-size-13" style={{ fontStyle: 'italic' }}>No hay cotizaciones adicionales</p>}
                </div>

                {/* HITOS DEL PROYECTO */}
                <div className="modal-section">
                  <h4 className="modal-section-title">
                    🎯 Hitos del Proyecto ({proyectoDetalle.hitos?.length || 0})
                  </h4>
                  {proyectoDetalle.hitos?.length > 0 ? (
                    <div className="modal-table-container">
                      <table className="modal-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Hito</th>
                            <th className="text-right">%</th>
                            <th className="text-right">Monto</th>
                            <th className="text-center">Estado</th>
                            <th className="text-center">Factura</th>
                            <th className="text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proyectoDetalle.hitos.map((hito) => {
                            const facturaAsociada = proyectoDetalle.facturas?.find(f => f.idHito === hito.idHito);
                            return (
                              <tr key={hito.idHito} style={{ 
                                background: hito.completado ? '#d4edda' : hito.facturaGenerada ? '#fff3cd' : 'white'
                              }}>
                                <td style={{ fontWeight: 'bold' }}>{hito.numeroHito}</td>
                                <td>
                                  <strong>{hito.nombre}</strong><br/>
                                  <span className="font-size-11 text-gray">{hito.descripcion}</span>
                                </td>
                                <td className="text-right">{hito.porcentajePago}%</td>
                                <td className="text-right">${Number(hito.montoEstimado).toLocaleString()}</td>
                                <td className="text-center">
                                  {hito.completado ? (
                                    <span className="font-size-11" style={{ background: '#28a745', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>
                                      ✓ Completado
                                    </span>
                                  ) : hito.cubiertoPorSaldo ? (
                                    <span className="font-size-11" style={{ background: '#6c757d', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>
                                      Cubierto por Saldo
                                    </span>
                                  ) : hito.facturaGenerada ? (
                                    <span className="font-size-11" style={{ background: '#17a2b8', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>
                                      {hito.idFactura ? 'Facturado' : 'En Proceso'}
                                    </span>
                                  ) : (
                                    <span className="font-size-11" style={{ background: '#ffc107', color: '#212529', padding: '2px 8px', borderRadius: '4px' }}>
                                      Pendiente
                                    </span>
                                  )}
                                </td>
                                <td className="text-center">
                                  {hito.cubiertoPorSaldo && hito.idFacturaSaldo ? (
                                    <span className="font-size-11" style={{ background: '#6c757d', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                                      {hito.idFacturaSaldo}
                                    </span>
                                  ) : hito.facturaGenerada && hito.idFactura ? (
                                    <span className="font-size-11" style={{ 
                                      background: facturaAsociada?.estado === 'Pagada' ? '#28a745' : 
                                                   facturaAsociada?.estado === 'Anticipo ya Pagado' ? '#17a2b8' : '#ffc107',
                                      color: facturaAsociada?.estado === 'Pendiente de Anticipo' ? '#212529' : 'white',
                                      padding: '2px 6px', borderRadius: '4px' 
                                    }}>
                                      {hito.idFactura}
                                    </span>
                                  ) : (
                                    <span className="font-size-11 text-gray">Sin factura</span>
                                  )}
                                </td>
                                <td className="text-center">
                                  {hito.facturaGenerada && facturaAsociada?.estado === 'Pagada' && !hito.completado && !hito.cubiertoPorSaldo && (
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm(`¿Marcar el hito "${hito.nombre}" como completado?`)) return;
                                        try {
                                          await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/proyectos/${proyectoDetalle.idProyecto}/hitos/${hito.idHito}/completar`,{},
                                          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                                          );
                                          alert(`Hito ${hito.nombre} completado!`);
                                          cargarDatos();
                                          verDetalle(proyectoDetalle);
                                        } catch (e) {
                                          alert('Error: ' + (e.response?.data?.message || e.message));
                                        }
                                      }}
                                      className="btn-success btn-xs"
                                      style={{ marginRight: '4px' }}
                                    >
                                      Completar
                                    </button>
                                  )}
                                  {!hito.facturaGenerada && !hito.completado && !hito.cubiertoPorSaldo && (
                                    <button
                                      onClick={() => {
                                        setShowDetalle(false);
                                        abrirFacturaFull(proyectoDetalle, {
                                          _esDesdeHito: true,
                                          idHito: hito.idHito,
                                          concepto: `${hito.nombre} (${hito.porcentajePago}%)`
                                        });
                                      }}
                                      className="btn-orange btn-xs"
                                    >
                                      + Factura
                                    </button>
                                  )}
                                  {hito.facturaGenerada && hito.idFactura && !hito.cubiertoPorSaldo && (
                                    <button
                                      onClick={() => { 
                                        setShowDetalle(false); 
                                        navigate(`/facturas?factura=${hito.idFactura}`); 
                                      }}
                                      className="btn-info btn-xs"
                                      style={{ marginLeft: '4px' }}
                                    >
                                      Ver
                                    </button>
                                  )}
                                  {hito.cubiertoPorSaldo && hito.idFacturaSaldo && (
                                    <button
                                      onClick={() => { 
                                        setShowDetalle(false); 
                                        navigate(`/facturas?factura=${hito.idFacturaSaldo}`); 
                                      }}
                                      className="btn-secondary btn-xs"
                                      style={{ marginLeft: '4px' }}
                                    >
                                      Ver Saldo
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray font-size-13" style={{ fontStyle: 'italic' }}>
                      Este proyecto no tiene hitos configurados. Tipo de pago: {proyectoDetalle.tipoPago || 'No definido'}
                    </p>
                  )}
                </div>

                {/* FACTURAS */}
                <div className="modal-section">
                  <h4 className="modal-section-title">
                    💳 Facturas ({proyectoDetalle.facturas?.length || 0})
                  </h4>

                  {/* Boton para generar factura de saldo */}
                  {(() => {
                    const totalFacturadoBase = proyectoDetalle.facturas?.reduce((sum, f) => {
                      if (!f.esFacturaAdicional && !f.idCotizacionAdicional) {
                        return sum + (f.valor || 0);
                      }
                      return sum;
                    }, 0) || 0;
                    const presupuestoBase = proyectoDetalle.presupuestoTotal || 0;
                    const saldoPendienteBase = presupuestoBase - totalFacturadoBase;

                    const facturasBase = proyectoDetalle.facturas?.filter(
                      f => !f.esFacturaAdicional && !f.idCotizacionAdicional
                    ) || [];

                    const facturasBaseValidas = facturasBase.filter(f => f.estado !== 'Anulada');
                    const ultimaFacturaBase = facturasBaseValidas[facturasBaseValidas.length - 1];
                    const puedeGenerarSiguiente = saldoPendienteBase > 100 && 
                      (!ultimaFacturaBase || ultimaFacturaBase.estado === 'Pagada' || ultimaFacturaBase.estado === 'Anticipo ya Pagado');

                    return puedeGenerarSiguiente ? (
                      <div className="alert-banner alert-warning" style={{ marginBottom: '15px' }}>
                        <p style={{ margin: '0 0 8px 0' }}>
                          <strong>Saldo pendiente:</strong> ${saldoPendienteBase.toLocaleString()} 
                          ({Math.round((saldoPendienteBase / presupuestoBase) * 100)}% del presupuesto)
                        </p>
                        <button
                          onClick={() => {
                            setShowDetalle(false);
                            abrirFacturaFull(proyectoDetalle, null, { 
                              esSaldoProyecto: true,           
                              concepto: `Saldo proyecto - ${proyectoDetalle.nombreProyecto}`,
                              estado: 'Pendiente de Saldo'
                            });
                          }}
                          className="btn-orange btn-sm"
                        >
                          + Generar Factura de Saldo
                        </button>
                      </div>
                    ) : null;
                  })()}

                  {proyectoDetalle.facturas?.length > 0 ? (
                    <div className="modal-table-container">
                      <table className="modal-table">
                        <thead>
                          <tr>
                            <th>ID Factura</th>
                            <th className="text-right">Valor</th>
                            <th>Concepto</th>
                            <th className="text-center">Hito</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            <th className="text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proyectoDetalle.facturas.map((f) => {
                            const hitoAsociado = proyectoDetalle.hitos?.find(h => h.idHito === f.idHito);

                            let mostrarBotonFactura = false;
                            if (f.esFacturaAdicional && f.idCotizacionAdicional) {
                              const cotizacionAdic = proyectoDetalle.cotizacionesAdicionales?.find(
                                c => c.idCotizacion === f.idCotizacionAdicional
                              );
                              if (cotizacionAdic) {
                                const facturasDeEstaCotizacion = proyectoDetalle.facturas?.filter(
                                  fac => fac.idCotizacionAdicional === f.idCotizacionAdicional && 
                                         (fac.estado === 'Pagada' || fac.estado === 'Anticipo ya Pagado')
                                ) || [];
                                const totalFacturado = facturasDeEstaCotizacion.reduce((sum, fac) => sum + (fac.valor || 0), 0);
                                const totalCotizacion = cotizacionAdic.total || cotizacionAdic.valor || 0;
                                const saldoPendiente = totalCotizacion - totalFacturado;
                                mostrarBotonFactura = saldoPendiente > 100 && f.estado === 'Pagada';
                              }
                            }

                            return (
                              <tr key={f.idFactura || f._id || Math.random()}>
                                <td>{f.idFactura}</td>
                                <td className="text-right">${Number(f.valor).toLocaleString()}</td>
                                <td>{f.concepto}</td>
                                <td className="text-center">
                                  {hitoAsociado ? (
                                    <span className="font-size-11" style={{ 
                                      background: '#17a2b8', color: 'white', padding: '2px 6px', borderRadius: '4px' 
                                    }}>
                                      {hitoAsociado.nombre}
                                    </span>
                                  ) : (
                                    <span className="font-size-11 text-gray">-</span>
                                  )}
                                </td>
                                <td>
                                  <span style={{
                                    background: f.estado === 'Pagada' ? '#28a745' : 
                                     f.estado === 'Pendiente de Anticipo' ? '#ffc107' :
                                     f.estado === 'Anticipo ya Pagado' ? '#17a2b8' :
                                     f.estado === 'Pendiente de Saldo' ? '#fd7e14' :
                                     f.estado === 'Pendiente de 2da Etapa' ? '#6f42c1' :
                                     '#dc3545',
                                    color: f.estado === 'Pendiente de Anticipo' ? '#212529' : 'white',
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600
                                  }}>
                                    {f.estado}
                                  </span>
                                </td>
                                <td>{new Date(f.fecha).toLocaleDateString()}</td>
                                <td className="text-center">
                                  <button 
                                    onClick={() => { setShowDetalle(false); navigate(`/facturas?factura=${f.idFactura}`); }}
                                    className="btn-info btn-xs"
                                  >
                                    Ver
                                  </button>
                                  {mostrarBotonFactura && (
                                    <button 
                                      onClick={() => {
                                        setShowDetalle(false);
                                        const cotizacionAdic = proyectoDetalle.cotizacionesAdicionales?.find(
                                          c => c.idCotizacion === f.idCotizacionAdicional
                                        );
                                        abrirFacturaFull(proyectoDetalle, f, cotizacionAdic);
                                      }} 
                                      className="btn-orange btn-xs"
                                      style={{ marginLeft: '4px' }}
                                    >
                                      + Factura
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray font-size-13" style={{ fontStyle: 'italic' }}>No hay facturas registradas</p>
                  )}
                </div>

                {/* RESUMEN FINANCIERO */}
                <div className="resumen-card">
                  <h4>💰 Resumen Financiero</h4>
                  <div className="resumen-grid">
                    <div className="resumen-item">
                      <p className="resumen-label">Presupuesto Base</p>
                      <p className="resumen-value">${Number(proyectoDetalle.presupuestoTotal).toLocaleString()}</p>
                    </div>
                    <div className="resumen-item">
                      <p className="resumen-label">Total Ejecutado</p>
                      <p className="resumen-value">${Number(proyectoDetalle.valorTotalEjecutado || 0).toLocaleString()}</p>
                    </div>
                    <div className="resumen-item">
                      <p className="resumen-label">Total Facturado</p>
                      <p className="resumen-value">${Number(proyectoDetalle.valorTotalFacturado || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  onClick={() => { setShowDetalle(false); abrirCotizacionFull(proyectoDetalle); }}
                  className="btn-purple"
                >
                  + Cotizacion Adicional
                </button>
                <button 
                  onClick={() => { setShowDetalle(false); abrirFacturaFull(proyectoDetalle); }}
                  className="btn-orange"
                >
                  + Nueva Factura
                </button>
                <button 
                  onClick={() => setShowDetalle(false)}
                  className="btn-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* MODAL COTIZACION ADICIONAL */}
        {/* ============================================ */}
        {showCotizacionFull && proyectoParaCotizacion && (
          <CotizacionAdicionalModal
            proyecto={proyectoParaCotizacion}
            clientes={clientes}
            cotizacionExistente={cotizacionParaEditar}
            onClose={cerrarCotizacionFull}
            onSuccess={onSuccessCotizacion}
          />
        )}

        {/* ============================================ */}
        {/* MODAL FACTURA */}
        {/* ============================================ */}
        {showFacturaFull && proyectoParaFactura && (
          <FacturaProyectoModal
            proyecto={proyectoParaFactura}
            clientes={clientes}
            facturaExistente={facturaParaEditar}
            onClose={cerrarFacturaFull}
            onSuccess={onSuccessCotizacion}
          />
        )}

        {/* Modal Seguimientos */}
        {showSeguimientos && proyectoDetalle && (
          <div className="modal-overlay" onClick={() => setShowSeguimientos(false)}>
            <div className="modal-content modal-seguimiento" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">📊 Seguimiento del Proyecto</h2>
                  <p className="modal-subtitle">{proyectoDetalle.nombreProyecto}</p>
                </div>
                <button onClick={() => setShowSeguimientos(false)} className="btn-link">✕</button>
              </div>

              <div className="modal-body">
                <div className="timeline-container">
                  {proyectoDetalle.seguimientos?.length > 0 ? proyectoDetalle.seguimientos
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                    .map((seg, index) => (
                      <div key={index} className={`timeline-item tipo-${seg.tipo}`}>
                        <div className="timeline-fecha">{new Date(seg.fecha).toLocaleDateString('es-CO')}</div>
                        <div className="timeline-contenido">
                          <span className="timeline-tipo">{seg.tipo.toUpperCase()}</span>
                          <p>{seg.descripcion}</p>
                          {seg.porcentajeAvance > 0 && <span className="timeline-avance">Avance: {seg.porcentajeAvance}%</span>}
                          <small className="font-size-11 text-gray">Por: {seg.creadoPor}</small>
                        </div>
                      </div>
                    )) : <p className="sin-seguimientos">No hay seguimientos registrados</p>}
                </div>

                <div className="nuevo-seguimiento">
                  <h4>Agregar Seguimiento</h4>
                  <select 
                    value={seguimientoData.tipo} 
                    onChange={(e) => setSeguimientoData(prev => ({ ...prev, tipo: e.target.value }))}
                  >
                    <option value="avance">Avance</option>
                    <option value="novedad">Novedad</option>
                    <option value="retraso">Retraso</option>
                    <option value="visita">Visita</option>
                    <option value="entrega">Entrega</option>
                    <option value="pago">Pago</option>
                  </select>
                  <textarea 
                    placeholder="Descripcion del seguimiento..." 
                    value={seguimientoData.descripcion} 
                    onChange={(e) => setSeguimientoData(prev => ({ ...prev, descripcion: e.target.value }))} 
                  />
                  <div className="avance-input">
                    <label>% Avance: {seguimientoData.porcentajeAvance}%</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={seguimientoData.porcentajeAvance} 
                      onChange={(e) => setSeguimientoData(prev => ({ ...prev, porcentajeAvance: Number(e.target.value) }))} 
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowSeguimientos(false)}>Cerrar</button>
                <button className="btn-success" onClick={guardarSeguimiento}>Guardar Seguimiento</button>
              </div>
            </div>
          </div>
        )}

        {/* Barra de Operaciones Inferior */}
        <div className="db-actions-group" style={{ marginTop: '20px' }}>
          <button onClick={() => navigate('/admin')} className="btn-primary">⚙️ Inicio</button>
        </div>
      </div>
    </div>
  );
}

export default Proyectos;