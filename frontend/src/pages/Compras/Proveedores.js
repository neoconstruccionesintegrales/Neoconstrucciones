import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../style/compras.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

const TIPOS_PROVEEDOR = [
  { value: 'materiales', label: 'Materiales' },
  { value: 'equipos', label: 'Equipos' },
  { value: 'subcontrato', label: 'Subcontrato' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'varios', label: 'Varios' }
];

const ESTADOS_PROVEEDOR = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Inactivo', label: 'Inactivo' },
  { value: 'Bloqueado', label: 'Bloqueado' }
];

function Proveedores() {
  const navigate = useNavigate();
  const userRol = localStorage.getItem('rol') || 'ADMIN';
  const puedeEditar = ['admin', 'contabilidad'].includes(userRol);

  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('crear'); // 'crear' | 'editar'
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    razonSocial: '',
    nit: '',
    digitoVerificacion: '',
    telefono: '',
    celular: '',
    correo: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    contactoNombre: '',
    contactoTelefono: '',
    contactoCorreo: '',
    tipo: 'materiales',
    banco: '',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '',
    estado: 'Activo',
    calificacion: 0,
    observaciones: ''
  });

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    setCargando(true);
    try {
      const res = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/proveedores`
      );
      const data = await res.json();
      if (data.success) {
        setProveedores(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      setMensaje('❌ Error al cargar proveedores');
    }
    setCargando(false);
  };

  const proveedoresFiltrados = proveedores.filter(p => {
    const text = filtroTexto.toLowerCase();
    const coincideTexto = 
      (p.nombre || '').toLowerCase().includes(text) ||
      (p.nit || '').includes(text) ||
      (p.idProveedor || '').toLowerCase().includes(text);
    const coincideTipo = !filtroTipo || p.tipo === filtroTipo;
    const coincideEstado = !filtroEstado || p.estado === filtroEstado;
    return coincideTexto && coincideTipo && coincideEstado;
  });

  const getTipoLabel = (tipo) => {
    const found = TIPOS_PROVEEDOR.find(t => t.value === tipo);
    return found ? found.label : tipo;
  };

  const getTipoClass = (tipo) => {
    const classes = {
      materiales: 'materiales',
      equipos: 'equipos',
      subcontrato: 'subcontrato',
      servicios: 'servicios',
      administrativo: 'administrativo',
      transporte: 'transporte',
      varios: 'varios'
    };
    return classes[tipo] || 'varios';
  };

  const getEstadoClass = (estado) => {
    const classes = {
      Activo: 'activo',
      Inactivo: 'inactivo',
      Bloqueado: 'bloqueado'
    };
    return classes[estado] || 'activo';
  };

  // ============================================================
  // CRUD - Proveedores
  // ============================================================
  const abrirModalCrear = () => {
    setModalMode('crear');
    setProveedorEditando(null);
    setFormData({
      nombre: '',
      razonSocial: '',
      nit: '',
      digitoVerificacion: '',
      telefono: '',
      celular: '',
      correo: '',
      direccion: '',
      ciudad: '',
      departamento: '',
      contactoNombre: '',
      contactoTelefono: '',
      contactoCorreo: '',
      tipo: 'materiales',
      banco: '',
      tipoCuenta: 'Ahorros',
      numeroCuenta: '',
      estado: 'Activo',
      calificacion: 0,
      observaciones: ''
    });
    setShowModal(true);
  };

  const abrirModalEditar = (proveedor) => {
    setModalMode('editar');
    setProveedorEditando(proveedor);
    setFormData({
      nombre: proveedor.nombre || '',
      razonSocial: proveedor.razonSocial || '',
      nit: proveedor.nit || '',
      digitoVerificacion: proveedor.digitoVerificacion || '',
      telefono: proveedor.telefono || '',
      celular: proveedor.celular || '',
      correo: proveedor.correo || '',
      direccion: proveedor.direccion || '',
      ciudad: proveedor.ciudad || '',
      departamento: proveedor.departamento || '',
      contactoNombre: proveedor.contactoNombre || '',
      contactoTelefono: proveedor.contactoTelefono || '',
      contactoCorreo: proveedor.contactoCorreo || '',
      tipo: proveedor.tipo || 'materiales',
      banco: proveedor.banco || '',
      tipoCuenta: proveedor.tipoCuenta || 'Ahorros',
      numeroCuenta: proveedor.numeroCuenta || '',
      estado: proveedor.estado || 'Activo',
      calificacion: proveedor.calificacion || 0,
      observaciones: proveedor.observaciones || ''
    });
    setShowModal(true);
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    try {
      const url = modalMode === 'crear'
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/proveedores`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/proveedores/${proveedorEditando.idProveedor}`;
      
      const method = modalMode === 'crear' ? 'POST' : 'PUT';
      
      const res = await fetchConAuth(url, {
        method,
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        setMensaje(modalMode === 'crear' ? '✅ Proveedor creado' : '✅ Proveedor actualizado');
        setShowModal(false);
        cargarProveedores();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al guardar'));
      }
    } catch (error) {
      setMensaje('❌ Error de conexión');
    }
    setCargando(false);
  };

  const eliminarProveedor = async (id) => {
    if (!window.confirm('¿Eliminar este proveedor? Solo si no tiene facturas asociadas.')) return;
    
    try {
      const res = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/proveedores/${id}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Proveedor eliminado');
        cargarProveedores();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al eliminar'));
      }
    } catch (error) {
      setMensaje('❌ Error de conexión');
    }
  };

  const verFacturas = (idProveedor) => {
    navigate(`/compras/facturas?proveedor=${idProveedor}`);
  };

 return (
    <div className="compras-container">
        <div className="compras-wrapper">
            {/* HEADER */}
            <div className="compras-header-text">
                <h1 className="compras-title">🏢 Proveedores</h1>
                <p className="compras-subtitle">
                    Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                </p>
            </div>

            {/* Acciones */}
            <div className="header-acciones">
                {puedeEditar && (
                    <button onClick={abrirModalCrear} className="btn-crear">
                        + Nuevo Proveedor
                    </button>
                )}
                <button onClick={cargarProveedores} className="btn-crear" style={{ background: 'var(--azul-claro)' }}>
                    🔄 Actualizar
                </button>
            </div>

            {/* Mensaje */}
            {mensaje && (
                <div className={`dba-alert ${mensaje.includes('❌') ? 'dba-alert-error' : 'dba-alert-success'}`}>
                    {mensaje}
                    <button className="dba-alert-close" onClick={() => setMensaje('')}>✕</button>
                </div>
            )}

            {/* Estadísticas */}
            <div className="compras-stats-grid">
                <div className="compras-stat-card stat-proveedores">
                    <div className="stat-label">Total Proveedores</div>
                    <div className="stat-value">{proveedores.length}</div>
                </div>
                <div className="compras-stat-card">
                    <div className="stat-label">Activos</div>
                    <div className="stat-value">{proveedores.filter(p => p.estado === 'Activo').length}</div>
                </div>
                <div className="compras-stat-card">
                    <div className="stat-label">Materiales</div>
                    <div className="stat-value">{proveedores.filter(p => p.tipo === 'materiales').length}</div>
                </div>
                <div className="compras-stat-card">
                    <div className="stat-label">Subcontratos</div>
                    <div className="stat-value">{proveedores.filter(p => p.tipo === 'subcontrato').length}</div>
                </div>
            </div>

            {/* Filtros */}
            <div className="compras-filtros">
                <div className="filtro-group">
                    <label>🔍 Buscar</label>
                    <input
                        type="text"
                        placeholder="Nombre, NIT o ID..."
                        value={filtroTexto}
                        onChange={(e) => setFiltroTexto(e.target.value)}
                    />
                </div>
                <div className="filtro-group">
                    <label>Tipo</label>
                    <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                        <option value="">Todos</option>
                        {TIPOS_PROVEEDOR.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
                <div className="filtro-group">
                    <label>Estado</label>
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                        <option value="">Todos</option>
                        {ESTADOS_PROVEEDOR.map(e => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => { setFiltroTexto(''); setFiltroTipo(''); setFiltroEstado(''); }}
                    class="btn-limpiar" title="Limpiar filtros">
                        🧹 Limpiar
                </button>
            </div>

            {/* Tabla */}
            {cargando && proveedores.length === 0 ? (
                <div className="no-results">Cargando proveedores...</div>
            ) : proveedoresFiltrados.length === 0 ? (
                <div className="no-results">No hay proveedores registrados</div>
            ) : (
                <div className="proveedores-table-wrapper">
                    <table className="proveedores-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre / Razón Social</th>
                                <th>NIT</th>
                                <th>Tipo</th>
                                <th>Contacto</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proveedoresFiltrados.map(p => (
                                <tr key={p._id || p.idProveedor}>
                                    <td data-label="ID">
                                        <span className="proveedor-id">{p.idProveedor}</span>
                                    </td>
                                    <td data-label="Nombre / Razón Social">
                                        <div className="proveedor-nombre">{p.nombre}</div>
                                        <div className="proveedor-nit">{p.razonSocial || ''}</div>
                                    </td>
                                    <td data-label="NIT">{p.nit}</td>
                                    <td data-label="Tipo">
                                        <span className={`tipo-badge ${getTipoClass(p.tipo)}`}>
                                            {getTipoLabel(p.tipo)}
                                        </span>
                                    </td>
                                    <td data-label="Contacto">
                                        <div style={{ fontSize: '13px' }}>{p.contactoNombre || p.telefono || '-'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--gris-500)' }}>{p.correo || ''}</div>
                                    </td>
                                    <td data-label="Estado">
                                        <span className={`estado-badge ${getEstadoClass(p.estado)}`}>
                                            {p.estado}
                                        </span>
                                    </td>
                                    <td data-label="Acciones">
                                        <div className="srv-actions-cell">
                                            <button
                                                onClick={() => verFacturas(p.idProveedor)}
                                                className="btn-compras btn-compras-outline btn-compras-sm"
                                            >
                                                📄 Ver Facturas
                                            </button>
                                            {puedeEditar && (
                                                <>
                                                    <button
                                                        onClick={() => abrirModalEditar(p)}
                                                        className="srv-btn-edit"
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => eliminarProveedor(p.idProveedor)}
                                                        className="srv-btn-delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal - Proveedor */}
            {showModal && (
                <div className="compras-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="compras-modal" onClick={e => e.stopPropagation()}>
                        <div className="compras-modal-header">
                            <h2>{modalMode === 'crear' ? '➕ Nuevo Proveedor' : '✏️ Editar Proveedor'}</h2>
                            <button className="compras-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="compras-modal-body">
                            <form onSubmit={guardarProveedor}>
                                <div className="compras-form-grid">
                                    {/* Datos básicos */}
                                    <div className="compras-form-group">
                                        <label>Nombre * <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Razón Social</label>
                                        <input
                                            type="text"
                                            value={formData.razonSocial}
                                            onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>NIT * <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.nit}
                                            onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Dígito Verificación</label>
                                        <input
                                            type="text"
                                            value={formData.digitoVerificacion}
                                            onChange={(e) => setFormData({ ...formData, digitoVerificacion: e.target.value })}
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Teléfono</label>
                                        <input
                                            type="text"
                                            value={formData.telefono}
                                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Celular</label>
                                        <input
                                            type="text"
                                            value={formData.celular}
                                            onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Correo</label>
                                        <input
                                            type="email"
                                            value={formData.correo}
                                            onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Dirección</label>
                                        <input
                                            type="text"
                                            value={formData.direccion}
                                            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Ciudad</label>
                                        <input
                                            type="text"
                                            value={formData.ciudad}
                                            onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Departamento</label>
                                        <input
                                            type="text"
                                            value={formData.departamento}
                                            onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                                        />
                                    </div>

                                    {/* Contacto interno */}
                                    <div className="compras-form-group">
                                        <label>Contacto (Nombre)</label>
                                        <input
                                            type="text"
                                            value={formData.contactoNombre}
                                            onChange={(e) => setFormData({ ...formData, contactoNombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Contacto (Teléfono)</label>
                                        <input
                                            type="text"
                                            value={formData.contactoTelefono}
                                            onChange={(e) => setFormData({ ...formData, contactoTelefono: e.target.value })}
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Contacto (Correo)</label>
                                        <input
                                            type="email"
                                            value={formData.contactoCorreo}
                                            onChange={(e) => setFormData({ ...formData, contactoCorreo: e.target.value })}
                                        />
                                    </div>

                                    {/* Clasificación */}
                                    <div className="compras-form-group">
                                        <label>Tipo * <span className="required">*</span></label>
                                        <select
                                            value={formData.tipo}
                                            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                            required
                                        >
                                            {TIPOS_PROVEEDOR.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Estado</label>
                                        <select
                                            value={formData.estado}
                                            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                        >
                                            {ESTADOS_PROVEEDOR.map(e => (
                                                <option key={e.value} value={e.value}>{e.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Datos bancarios */}
                                    <div className="compras-form-group">
                                        <label>Banco</label>
                                        <input
                                            type="text"
                                            value={formData.banco}
                                            onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                                        />
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Tipo de Cuenta</label>
                                        <select
                                            value={formData.tipoCuenta}
                                            onChange={(e) => setFormData({ ...formData, tipoCuenta: e.target.value })}
                                        >
                                            <option value="Ahorros">Ahorros</option>
                                            <option value="Corriente">Corriente</option>
                                        </select>
                                    </div>
                                    <div className="compras-form-group">
                                        <label>Número de Cuenta</label>
                                        <input
                                            type="text"
                                            value={formData.numeroCuenta}
                                            onChange={(e) => setFormData({ ...formData, numeroCuenta: e.target.value })}
                                        />
                                    </div>

                                    {/* Observaciones */}
                                    <div className="compras-form-group full-width">
                                        <label>Observaciones</label>
                                        <textarea
                                            rows="3"
                                            value={formData.observaciones}
                                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="compras-modal-footer">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-compras btn-compras-outline">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={cargando} className="btn-compras btn-compras-primary">
                                        {cargando ? 'Guardando...' : modalMode === 'crear' ? 'Crear Proveedor' : 'Actualizar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Barra de Operaciones Inferior */}
            <div className="db-actions-group">
                <button onClick={() => navigate('/admin')} className="btn-primary">⚙️ Inicio</button>
            </div>
        </div>
    </div>
);
}

export default Proveedores;