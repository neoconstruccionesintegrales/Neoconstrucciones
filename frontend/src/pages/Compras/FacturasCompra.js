import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../../style/compras.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

const TIPOS_COMPRA = [
  { value: 'materiales', label: '🧱 Materiales' },
  { value: 'equipos', label: '🔧 Equipos' },
  { value: 'subcontrato', label: '👷 Subcontrato' },
  { value: 'servicios', label: '🔨 Servicios' },
  { value: 'administrativo', label: '🏢 Administrativo' },
  { value: 'transporte', label: '🚚 Transporte' },
  { value: 'varios', label: '📎 Varios' }
];

const ESTADOS_FACTURA_COMPRA = [
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Aprobada', label: 'Aprobada' },
  { value: 'Pagada', label: 'Pagada' },
  { value: 'Anulada', label: 'Anulada' },
  { value: 'Parcial', label: 'Parcial' }
];

const METODOS_PAGO_COMPRA = [
  'Transferencia Bancaria',
  'Efectivo',
  'Cheque',
  'Credito',
  'Contraentrega'
];

function FacturasCompra() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const proveedorFiltro = searchParams.get('proveedor') || '';

  const userRol = localStorage.getItem('rol') || 'ADMIN';
  const puedeEditar = ['admin', 'contabilidad'].includes(userRol);

  const [facturas, setFacturas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [resumen, setResumen] = useState(null);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState(proveedorFiltro);
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [filtroProyecto, setFiltroProyecto] = useState('');

  // Modal de Crear/Editar
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('crear');
  const [facturaEditando, setFacturaEditando] = useState(null);
  const [formData, setFormData] = useState({
    idProveedor: '',
    idProyecto: '',
    numeroFactura: '',
    fechaEmision: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    tipo: 'materiales',
    items: [{ descripcion: '', cantidad: 1, precioUnitario: 0, unidad: 'und', subtotal: 0 }],
    descuento: 0,
    ivaPorcentaje: 19,
    metodoPago: 'Transferencia Bancaria',
    estado: 'Pendiente',
    notas: ''
  });

  // Modal de Detalle
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

  useEffect(() => {
    cargarDatos();
    if (proveedorFiltro) {
      setFiltroProveedor(proveedorFiltro);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Cargar proveedores
      const resProv = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/proveedores`
      );
      const dataProv = await resProv.json();
      if (dataProv.success) {
        setProveedores(dataProv.data || []);
      }

      // Cargar facturas de compra
      const resFact = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/facturas-compra?anio=${filtroAnio}`
      );
      const dataFact = await resFact.json();
      if (dataFact.success) {
        setFacturas(dataFact.data || []);
      }

      // Cargar resumen
      const resRes = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/facturas-compra/resumen?anio=${filtroAnio}`
      );
      const dataRes = await resRes.json();
      if (dataRes.success) {
        setResumen(dataRes.data);
      }

      // Cargar proyectos
      const resProy = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/proyectos`
      );
      const dataProy = await resProy.json();
      if (dataProy.success) {
        setProyectos(dataProy.data || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setMensaje('❌ Error al cargar datos');
    }
    setCargando(false);
  };

  // ============================================================
  // FUNCIONES DE FILTRADO
  // ============================================================
  const facturasFiltradas = facturas.filter(f => {
    const text = filtroTexto.toLowerCase();
    const coincideTexto =
      (f.idFacturaCompra || '').toLowerCase().includes(text) ||
      (f.numeroFactura || '').toLowerCase().includes(text) ||
      (f.nombreProveedor || '').toLowerCase().includes(text);
    const coincideTipo = !filtroTipo || f.tipo === filtroTipo;
    const coincideEstado = !filtroEstado || f.estado === filtroEstado;
    const coincideProveedor = !filtroProveedor || f.idProveedor === filtroProveedor;
    
    let coincideProyecto = true;
    if (filtroProyecto === 'sin-proyecto') {
      coincideProyecto = !f.idProyecto;
    } else if (filtroProyecto === 'con-proyecto') {
      coincideProyecto = !!f.idProyecto;
    } else if (filtroProyecto) {
      coincideProyecto = f.idProyecto === filtroProyecto;
    }
    
    return coincideTexto && coincideTipo && coincideEstado && coincideProveedor && coincideProyecto;
  });

  // ============================================================
  // FUNCIONES DE UTILERIA
  // ============================================================
  const getTipoLabel = (tipo) => {
    const found = TIPOS_COMPRA.find(t => t.value === tipo);
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
      Pendiente: 'pendiente',
      Aprobada: 'aprobada',
      Pagada: 'pagada',
      Anulada: 'anulada',
      Parcial: 'parcial'
    };
    return classes[estado] || 'pendiente';
  };

  const getProyectoNombre = (id) => {
    if (!id) return '🏢 Gastos Generales';
    const p = proyectos.find(proy => proy.idProyecto === id);
    return p ? p.nombreProyecto : id;
  };

  // ============================================================
  // CRUD - Facturas de Compra
  // ============================================================
  const abrirModalCrear = () => {
    setModalMode('crear');
    setFacturaEditando(null);
    setFormData({
      idProveedor: '',
      idProyecto: '',
      numeroFactura: '',
      fechaEmision: new Date().toISOString().split('T')[0],
      fechaVencimiento: '',
      tipo: 'materiales',
      items: [{ descripcion: '', cantidad: 1, precioUnitario: 0, unidad: 'und', subtotal: 0 }],
      descuento: 0,
      ivaPorcentaje: 19,
      metodoPago: 'Transferencia Bancaria',
      estado: 'Pendiente',
      notas: ''
    });
    setShowModal(true);
  };

  const abrirModalEditar = (factura) => {
    setModalMode('editar');
    setFacturaEditando(factura);
    setFormData({
      idProveedor: factura.idProveedor || '',
      idProyecto: factura.idProyecto || '',
      numeroFactura: factura.numeroFactura || '',
      fechaEmision: factura.fechaEmision ? new Date(factura.fechaEmision).toISOString().split('T')[0] : '',
      fechaVencimiento: factura.fechaVencimiento ? new Date(factura.fechaVencimiento).toISOString().split('T')[0] : '',
      tipo: factura.tipo || 'materiales',
      items: factura.items || [{ descripcion: '', cantidad: 1, precioUnitario: 0, unidad: 'und', subtotal: 0 }],
      descuento: factura.descuento || 0,
      ivaPorcentaje: factura.ivaPorcentaje || 19,
      metodoPago: factura.metodoPago || 'Transferencia Bancaria',
      estado: factura.estado || 'Pendiente',
      notas: factura.notas || ''
    });
    setShowModal(true);
  };

  const verDetalle = (factura) => {
    setFacturaSeleccionada(factura);
    setShowDetailModal(true);
  };

  const modificarItem = (index, campo, valor) => {
    const nuevosItems = [...formData.items];
    nuevosItems[index][campo] = valor;
    if (campo === 'cantidad' || campo === 'precioUnitario') {
      nuevosItems[index].subtotal = Number(nuevosItems[index].cantidad) * Number(nuevosItems[index].precioUnitario);
    }
    setFormData({ ...formData, items: nuevosItems });
  };

  const agregarItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { descripcion: '', cantidad: 1, precioUnitario: 0, unidad: 'und', subtotal: 0 }]
    });
  };

  const eliminarItem = (index) => {
    if (formData.items.length === 1) {
      setMensaje('Debe tener al menos un item');
      return;
    }
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calcularTotales = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    const iva = subtotal * (Number(formData.ivaPorcentaje) / 100);
    const descuento = Number(formData.descuento) || 0;
    const total = subtotal + iva - descuento;
    return { subtotal, iva, total };
  };

  const guardarFactura = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    // Validar campos obligatorios
    if (!formData.idProveedor) {
      setMensaje('❌ Debes seleccionar un proveedor');
      setCargando(false);
      return;
    }
    if (!formData.numeroFactura) {
      setMensaje('❌ Debes ingresar el número de factura');
      setCargando(false);
      return;
    }

    try {
      const url = modalMode === 'crear'
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/facturas-compra`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/facturas-compra/${facturaEditando.idFacturaCompra}`;
      
      const method = modalMode === 'crear' ? 'POST' : 'PUT';
      
      const res = await fetchConAuth(url, {
        method,
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        setMensaje(modalMode === 'crear' ? '✅ Orden de compra creada' : '✅ Orden de compra actualizada');
        setShowModal(false);
        cargarDatos();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al guardar'));
      }
    } catch (error) {
      setMensaje('❌ Error de conexión');
    }
    setCargando(false);
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    if (!window.confirm(`¿Cambiar estado de la Orden de compra a "${nuevoEstado}"?`)) return;
    
    try {
      const res = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/facturas-compra/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ estado: nuevoEstado })
        }
      );
      const data = await res.json();
      if (data.success) {
        setMensaje(`✅ Estado actualizado a: ${nuevoEstado}`);
        cargarDatos();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al actualizar'));
      }
    } catch (error) {
      setMensaje('❌ Error de conexión');
    }
  };

  const eliminarFactura = async (id) => {
    if (!window.confirm('¿Eliminar esta Orden de compra? No se puede eliminar si está pagada.')) return;
    
    try {
      const res = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/facturas-compra/${id}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Orden de compra eliminada');
        cargarDatos();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al eliminar'));
      }
    } catch (error) {
      setMensaje('❌ Error de conexión');
    }
  };

  const asociarProyecto = async (idFactura, idProyecto) => {
    if (!window.confirm('¿Asociar esta orden de compra al proyecto seleccionado?')) return;
    
    try {
      const res = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/facturas-compra/${idFactura}`,
        {
          method: 'PUT',
          body: JSON.stringify({ idProyecto })
        }
      );
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Proyecto asociado correctamente');
        cargarDatos();
        setShowDetailModal(false);
      } else {
        setMensaje('❌ ' + (data.error || 'Error al asociar proyecto'));
      }
    } catch (error) {
      setMensaje('❌ Error de conexión');
    }
  };

  const imprimirFactura = (factura) => {
    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <html>
        <head>
          <title>Factura ${factura.idFacturaCompra}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #1a237e; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { color: #1a237e; margin: 0; }
            .header h2 { color: #546e7a; margin: 5px 0 0; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
            .info p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
            .totales { margin-top: 20px; text-align: right; }
            .totales p { margin: 4px 0; }
            .total-final { font-size: 20px; font-weight: bold; color: #1a237e; }
            .estado { display: inline-block; padding: 2px 12px; border-radius: 12px; font-weight: 600; }
            .estado.pagada { background: #e8f5e9; color: #1b5e20; }
            .estado.pendiente { background: #fff3e0; color: #e65100; }
            .estado.aprobada { background: #e3f2fd; color: #0d47a1; }
            .footer { margin-top: 40px; text-align: center; color: #78909c; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
            .proyecto-badge { display: inline-block; padding: 2px 12px; border-radius: 12px; background: #e8eaf6; color: #1a237e; }
            .sin-proyecto { color: #78909c; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Neoconstrucciones Integrales S.A.S</h1>
            <h2>Orden de Compra N° ${factura.idFacturaCompra}</h2>
          </div>
          
          <div class="info">
            <div>
              <p><strong>Proveedor:</strong> ${factura.nombreProveedor}</p>
              <p><strong>NIT:</strong> ${factura.nitProveedor || '-'}</p>
              <p><strong>N° Factura:</strong> ${factura.numeroFactura}</p>
            </div>
            <div>
              <p><strong>Fecha Emisión:</strong> ${factura.fechaEmision ? new Date(factura.fechaEmision).toLocaleDateString('es-CO') : '-'}</p>
              <p><strong>Fecha Vencimiento:</strong> ${factura.fechaVencimiento ? new Date(factura.fechaVencimiento).toLocaleDateString('es-CO') : '-'}</p>
              <p><strong>Estado:</strong> <span class="estado ${factura.estado.toLowerCase()}">${factura.estado}</span></p>
            </div>
          </div>
          
          <div style="margin-bottom: 10px;">
            <p><strong>Proyecto:</strong> ${factura.idProyecto ? `<span class="proyecto-badge">${getProyectoNombre(factura.idProyecto)}</span>` : '<span class="sin-proyecto">🏢 Gastos Generales</span>'}</p>
            <p><strong>Tipo:</strong> ${getTipoLabel(factura.tipo)}</p>
          </div>

          <h3>Items / Servicios</h3>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th style="text-align:center;">Cant.</th>
                <th style="text-align:center;">Unidad</th>
                <th style="text-align:right;">P. Unitario</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${factura.items.map(item => `
                <tr>
                  <td>${item.descripcion}</td>
                  <td style="text-align:center;">${item.cantidad}</td>
                  <td style="text-align:center;">${item.unidad || 'und'}</td>
                  <td style="text-align:right;">$${(item.precioUnitario || 0).toLocaleString()}</td>
                  <td style="text-align:right;">$${(item.subtotal || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totales">
            <p>Subtotal: $${(factura.subtotal || 0).toLocaleString()}</p>
            <p>IVA (${factura.ivaPorcentaje || 19}%): $${(factura.iva || 0).toLocaleString()}</p>
            ${(factura.descuento || 0) > 0 ? `<p>Descuento: -$${(factura.descuento || 0).toLocaleString()}</p>` : ''}
            <p class="total-final">TOTAL: $${(factura.total || 0).toLocaleString()}</p>
          </div>

          ${factura.notas ? `<div style="margin-top: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px;"><strong>Notas:</strong> ${factura.notas}</div>` : ''}

          <div class="footer">
            <p>Documento generado desde Neoconstrucciones S.A.S</p>
            <p>Fecha de impresión: ${new Date().toLocaleString('es-CO')}</p>
          </div>
          <script>
            window.print();
            window.close();
          </script>
        </body>
      </html>
    `);
  };

  const totales = calcularTotales();

  return (
    <div className="compras-container">
       <div className="compras-wrapper">
            {/* HEADER */}
            <div className="compras-header-text">
                <h1 className="compras-title">📄 Ordenes de Compra</h1>
                <p className="compras-subtitle">
                    Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                </p>
            </div>

            {/* Acciones */}
            <div className="header-acciones">
                {puedeEditar && (
                    <button onClick={abrirModalCrear} className="btn-crear">
                        + Nueva Orden de compra
                    </button>
                )}
                <button onClick={cargarDatos} className="btn-crear" style={{ background: 'var(--azul-claro)' }}>
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
      {resumen && (
        <div className="compras-stats-grid">
          <div className="compras-stat-card stat-facturas">
            <div className="stat-label">Total Ordenes de compras</div>
            <div className="stat-value">{resumen.cantidadFacturas || 0}</div>
          </div>
          <div className="compras-stat-card stat-pagado">
            <div className="stat-label">Total Pagado</div>
            <div className="stat-value">${(resumen.totalPagado || 0).toLocaleString()}</div>
          </div>
          <div className="compras-stat-card stat-pendiente">
            <div className="stat-label">Total Pendiente</div>
            <div className="stat-value">${(resumen.totalPendiente || 0).toLocaleString()}</div>
          </div>
          <div className="compras-stat-card stat-iva">
            <div className="stat-label">IVA</div>
            <div className="stat-value">${(resumen.totalIVA || 0).toLocaleString()}</div>
          </div>
          {resumen.totalProyectos !== undefined && (
            <>
              <div className="compras-stat-card stat-proyecto" style={{ borderLeftColor: '#1a237e' }}>
                <div className="stat-label">💰 Proyectos</div>
                <div className="stat-value" style={{ fontSize: '16px' }}>
                  ${(resumen.totalProyectos || 0).toLocaleString()}
                </div>
              </div>
              <div className="compras-stat-card" style={{ borderLeftColor: '#78909c' }}>
                <div className="stat-label">🏢 Gastos Generales</div>
                <div className="stat-value" style={{ fontSize: '16px' }}>
                  ${(resumen.totalGeneral || 0).toLocaleString()}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="compras-filtros">
        <div className="filtro-group">
          <label>🔍 Buscar</label>
          <input
            type="text"
            placeholder="ID, N° Orden de compra, Proveedor..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
        </div>
        <div className="filtro-group">
          <label>Proveedor</label>
          <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)}>
            <option value="">Todos</option>
            {proveedores.map(p => (
              <option key={p.idProveedor} value={p.idProveedor}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div className="filtro-group">
          <label>Proyecto</label>
          <select value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
            <option value="">Todos</option>
            <option value="sin-proyecto">🏢 Gastos Generales</option>
            <option value="con-proyecto">📋 Proyecto</option>
            {/* FIX: Corregido filtro de estados para mostrar proyectos activos */}
            {proyectos.filter(p => ['En Ejecucion','Iniciado','Activo','En Espera de Anticipo'].includes(p.estado)).map(p => (
              <option key={p.idProyecto} value={p.idProyecto}>
                {p.nombreProyecto}
              </option>
            ))}
          </select>
        </div>
        <div className="filtro-group">
          <label>Tipo</label>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_COMPRA.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="filtro-group">
          <label>Estado</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS_FACTURA_COMPRA.map(e => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
        <div className="filtro-group">
          <label>Año</label>
          <select value={filtroAnio} onChange={(e) => setFiltroAnio(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026, 2027].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setFiltroTexto(''); setFiltroTipo(''); setFiltroEstado(''); setFiltroProveedor(''); setFiltroProyecto(''); }}
          class="btn-limpiar" title="Limpiar filtros">
          🧹 Limpiar
        </button>
      </div>

      {/* Tabla */}
      {cargando && facturas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#78909c' }}>Cargando ordenes de compra...</div>
      ) : facturasFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#78909c' }}>
          <p>No hay ordenes de compra registradas</p>
        </div>
      ) : (
        <div className="facturas-compra-table-wrapper">
          <table className="facturas-compra-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Proveedor</th>
                <th>N° Factura</th>
                <th>Proyecto</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>IVA</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map(f => (
                <tr key={f._id || f.idFacturaCompra}>
                  <td>
                    <span className="factura-id" style={{ fontSize: '12px', color: '#78909c' }}>
                      {f.idFacturaCompra}
                    </span>
                  </td>
                  <td>
                    <div className="proveedor-nombre">{f.nombreProveedor}</div>
                    <div className="numero-factura" style={{ fontSize: '11px', color: '#78909c' }}>
                      {f.nitProveedor}
                    </div>
                  </td>
                  <td>
                    <strong>{f.numeroFactura}</strong>
                    <div style={{ fontSize: '11px', color: '#78909c' }}>
                      {f.fechaEmision ? new Date(f.fechaEmision).toLocaleDateString('es-CO') : ''}
                    </div>
                  </td>
                  <td>
                    {f.idProyecto ? (
                      <span style={{ color: '#1a237e', fontWeight: '500' }}>
                        📋 {getProyectoNombre(f.idProyecto)}
                      </span>
                    ) : (
                      <span style={{ color: '#78909c', fontStyle: 'italic' }}>
                        🏢 Gastos Generales
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`tipo-badge ${getTipoClass(f.tipo)}`}>
                      {getTipoLabel(f.tipo)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    ${(f.total || 0).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    ${(f.iva || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className={`estado-factura-compra ${getEstadoClass(f.estado)}`}>
                      {f.estado}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Botón Ver Detalle - Siempre visible */}
                      <button
                        onClick={() => verDetalle(f)}
                        className="btn-compras btn-compras-outline btn-compras-sm"
                        title="Ver detalle"
                      >
                        👁️ Ver
                      </button>
                      
                      {puedeEditar && f.estado !== 'Pagada' && f.estado !== 'Anulada' && (
                        <>
                          <button
                            onClick={() => abrirModalEditar(f)}
                            className="btn-compras btn-compras-primary btn-compras-sm"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          {f.estado === 'Pendiente' && (
                            <button
                              onClick={() => cambiarEstado(f.idFacturaCompra, 'Aprobada')}
                              className="btn-compras btn-compras-success btn-compras-sm"
                              title="Aprobar"
                            >
                              ✅ Aprobar
                            </button>
                          )}
                          {f.estado === 'Aprobada' && (
                            <button
                              onClick={() => cambiarEstado(f.idFacturaCompra, 'Pagada')}
                              className="btn-compras btn-compras-success btn-compras-sm"
                              title="Pagar"
                            >
                              💰 Pagar
                            </button>
                          )}
                          <button
                            onClick={() => eliminarFactura(f.idFacturaCompra)}
                            className="btn-compras btn-compras-danger btn-compras-sm"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      {f.estado === 'Pagada' && (
                        <span style={{ color: '#2e7d32', fontSize: '12px', fontWeight: 'bold' }}>✅ Pagada</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================
          MODAL - CREAR/EDITAR FACTURA DE COMPRA
          ============================================================ */}
      {showModal && (
        <div className="compras-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="compras-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="compras-modal-header">
              <h2>{modalMode === 'crear' ? '➕ Nueva Orden de Compra' : '✏️ Editar Factura'}</h2>
              <button className="compras-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="compras-modal-body">
              <form onSubmit={guardarFactura}>
                <div className="compras-form-grid">
                  <div className="compras-form-group">
                    <label>Proveedor <span className="required">*</span></label>
                    <select
                      value={formData.idProveedor}
                      onChange={(e) => setFormData({ ...formData, idProveedor: e.target.value })}
                      required
                    >
                      <option value="">-- Seleccione --</option>
                      {proveedores.filter(p => p.estado === 'Activo').map(p => (
                        <option key={p.idProveedor} value={p.idProveedor}>
                          {p.nombre} - {p.nit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="compras-form-group">
                    <label>N° Factura <span className="required">*</span></label>
                    <input
                      type="text"
                      value={formData.numeroFactura}
                      onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
                      required
                    />
                  </div>
                  <div className="compras-form-group">
                    <label>Fecha Emisión</label>
                    <input
                      type="date"
                      value={formData.fechaEmision}
                      onChange={(e) => setFormData({ ...formData, fechaEmision: e.target.value })}
                    />
                  </div>
                  <div className="compras-form-group">
                    <label>Fecha Vencimiento</label>
                    <input
                      type="date"
                      value={formData.fechaVencimiento}
                      onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                    />
                  </div>
                  <div className="compras-form-group">
                    <label>Proyecto/Obra</label>
                    <select
                      value={formData.idProyecto}
                      onChange={(e) => setFormData({ ...formData, idProyecto: e.target.value })}
                    >
                      <option value="">🏢 Gastos Generales (Sin proyecto)</option>
                      {/* FIX: Corregido filtro de estados para mostrar proyectos activos */}
                      {proyectos.filter(p => ['En Ejecucion','Iniciado','Activo','En Espera de Anticipo'].includes(p.estado)).map(p => (
                        <option key={p.idProyecto} value={p.idProyecto}>
                          📋 {p.nombreProyecto} - {p.idProyecto}
                        </option>
                      ))}
                    </select>
                    <small style={{ color: '#78909c', fontSize: '11px', marginTop: '2px' }}>
                      {!formData.idProyecto ? '📌 Este gasto se registrará como gasto general de la empresa' : '📌 Este gasto se cargará al proyecto seleccionado'}
                    </small>
                  </div>
                  <div className="compras-form-group">
                    <label>Tipo * <span className="required">*</span></label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      required
                    >
                      <optgroup label="📋 Materiales y Equipos">
                        <option value="materiales">🧱 Materiales</option>
                        <option value="equipos">🔧 Equipos</option>
                        <option value="subcontrato">👷 Subcontrato</option>
                      </optgroup>
                      <optgroup label="📋 Servicios">
                        <option value="servicios">🔨 Servicios</option>
                        <option value="transporte">🚚 Transporte</option>
                      </optgroup>
                      <optgroup label="📋 Gastos Generales">
                        <option value="administrativo">🏢 Administrativo</option>
                        <option value="varios">📎 Varios</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* Items */}
                <h4 style={{ marginTop: '16px', marginBottom: '8px', color: '#1a237e' }}>Items / Servicios</h4>
                <div className="compras-items-table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="compras-items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '35%' }}>Descripción</th>
                        <th style={{ width: '10%' }}>Cant.</th>
                        <th style={{ width: '10%' }}>Unidad</th>
                        <th style={{ width: '15%' }}>P. Unitario</th>
                        <th style={{ width: '15%' }}>Subtotal</th>
                        <th style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) => modificarItem(index, 'descripcion', e.target.value)}
                              placeholder="Descripción..."
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.cantidad}
                              onChange={(e) => modificarItem(index, 'cantidad', Number(e.target.value))}
                              style={{ textAlign: 'center' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.unidad}
                              onChange={(e) => modificarItem(index, 'unidad', e.target.value)}
                              style={{ textAlign: 'center' }}
                              placeholder="und"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={item.precioUnitario}
                              onChange={(e) => modificarItem(index, 'precioUnitario', Number(e.target.value))}
                              style={{ textAlign: 'right' }}
                            />
                          </td>
                          <td className="item-subtotal">
                            ${(item.subtotal || 0).toLocaleString()}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-remove-item"
                              onClick={() => eliminarItem(index)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={agregarItem} className="btn-compras btn-compras-outline btn-compras-sm" style={{ marginTop: '8px' }}>
                  + Agregar Item
                </button>

                {/* Totales y otros campos */}
                <div className="compras-form-grid" style={{ marginTop: '16px' }}>
                  <div className="compras-form-group">
                    <label>Descuento</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.descuento}
                      onChange={(e) => setFormData({ ...formData, descuento: Number(e.target.value) })}
                    />
                  </div>
                  <div className="compras-form-group">
                    <label>IVA (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.ivaPorcentaje}
                      onChange={(e) => setFormData({ ...formData, ivaPorcentaje: Number(e.target.value) })}
                    />
                  </div>
                  <div className="compras-form-group">
                    <label>Método de Pago</label>
                    <select
                      value={formData.metodoPago}
                      onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                    >
                      {METODOS_PAGO_COMPRA.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="compras-form-group">
                    <label>Estado</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    >
                      {ESTADOS_FACTURA_COMPRA.map(e => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="compras-form-group full-width">
                    <label>Notas</label>
                    <textarea
                      rows="2"
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      placeholder="Notas adicionales..."
                    />
                  </div>
                </div>

                {/* Resumen de Totales */}
                <div className="compras-totales">
                  <div className="total-row">
                    <span>Subtotal</span>
                    <span>${totales.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="total-row">
                    <span>IVA ({formData.ivaPorcentaje}%)</span>
                    <span>${totales.iva.toLocaleString()}</span>
                  </div>
                  {formData.descuento > 0 && (
                    <div className="total-row" style={{ color: '#c62828' }}>
                      <span>Descuento</span>
                      <span>-${formData.descuento.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="total-row total-final">
                    <span>TOTAL</span>
                    <span>${totales.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="compras-modal-footer">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-compras btn-compras-outline">
                    Cancelar
                  </button>
                  <button type="submit" disabled={cargando} className="btn-compras btn-compras-primary">
                    {cargando ? 'Guardando...' : modalMode === 'crear' ? 'Crear Orden de compra' : 'Actualizar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL - DETALLE DE FACTURA DE COMPRA
          ============================================================ */}
      {showDetailModal && facturaSeleccionada && (
        <div className="compras-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="compras-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
            <div className="compras-modal-header">
              <h2>📄 Orden de Compra: {facturaSeleccionada.idFacturaCompra}</h2>
              <button className="compras-modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="compras-modal-body">
              {/* Información de la factura */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <p><strong>Número factura:</strong> {facturaSeleccionada.numeroFactura}</p>
                  <p><strong>Proveedor:</strong> {facturaSeleccionada.nombreProveedor}</p>
                  <p><strong>NIT:</strong> {facturaSeleccionada.nitProveedor || '-'}</p>
                  <p><strong>Tipo:</strong> {getTipoLabel(facturaSeleccionada.tipo)}</p>
                  <p><strong>Estado:</strong> <span className={`estado-factura-compra ${getEstadoClass(facturaSeleccionada.estado)}`}>{facturaSeleccionada.estado}</span></p>
                </div>
                <div>
                  <p><strong>Fecha Emisión:</strong> {facturaSeleccionada.fechaEmision ? new Date(facturaSeleccionada.fechaEmision).toLocaleDateString('es-CO') : '-'}</p>
                  <p><strong>Fecha Vencimiento:</strong> {facturaSeleccionada.fechaVencimiento ? new Date(facturaSeleccionada.fechaVencimiento).toLocaleDateString('es-CO') : '-'}</p>
                  <p><strong>Fecha Pago:</strong> {facturaSeleccionada.fechaPago ? new Date(facturaSeleccionada.fechaPago).toLocaleDateString('es-CO') : 'Pendiente'}</p>
                  <p><strong>Método Pago:</strong> {facturaSeleccionada.metodoPago || '-'}</p>
                  
                  {/* Selector de Proyecto */}
                  <div style={{ marginTop: '10px' }}>
                    <label><strong>Proyecto:</strong></label>
                    <select 
                      value={facturaSeleccionada.idProyecto || ''}
                      onChange={(e) => {
                        asociarProyecto(facturaSeleccionada.idFacturaCompra, e.target.value || null);
                      }}
                      style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      <option value="">🏢 Gastos Generales</option>
                      {/* FIX: Corregido filtro de estados para mostrar proyectos activos */}
                      {proyectos.filter(p => ['En Ejecucion','Iniciado','Activo','En Espera de Anticipo'].includes(p.estado)).map(p => (
                        <option key={p.idProyecto} value={p.idProyecto}>
                          📋 {p.nombreProyecto} - {p.idProyecto}
                        </option>
                      ))}
                    </select>
                    <small style={{ display: 'block', color: '#78909c', fontSize: '11px', marginTop: '2px' }}>
                      {!facturaSeleccionada.idProyecto ? '📌 Gasto general de la empresa' : '📌 Gasto asociado al proyecto'}
                    </small>
                  </div>
                </div>
              </div>

              {/* Items de la factura */}
              <h4 style={{ marginTop: '16px', marginBottom: '8px', color: '#1a237e' }}>Items / Servicios</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="compras-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Descripción</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Cant.</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Unidad</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>P. Unitario</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturaSeleccionada.items && facturaSeleccionada.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.descripcion}</td>
                        <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                        <td style={{ textAlign: 'center' }}>{item.unidad || 'und'}</td>
                        <td style={{ textAlign: 'right' }}>${(item.precioUnitario || 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>${(item.subtotal || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="compras-totales" style={{ marginTop: '16px' }}>
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>${(facturaSeleccionada.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="total-row">
                  <span>IVA ({facturaSeleccionada.ivaPorcentaje || 19}%)</span>
                  <span>${(facturaSeleccionada.iva || 0).toLocaleString()}</span>
                </div>
                {(facturaSeleccionada.descuento || 0) > 0 && (
                  <div className="total-row" style={{ color: '#c62828' }}>
                    <span>Descuento</span>
                    <span>-${(facturaSeleccionada.descuento || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="total-row total-final">
                  <span>TOTAL</span>
                  <span>${(facturaSeleccionada.total || 0).toLocaleString()}</span>
                </div>
              </div>

              {facturaSeleccionada.notas && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <strong>Notas:</strong> {facturaSeleccionada.notas}
                </div>
              )}

              <div className="compras-modal-footer">
                <button 
                  onClick={() => imprimirFactura(facturaSeleccionada)} 
                  className="btn-compras btn-compras-outline"
                >
                  🖨️ Imprimir
                </button>
                <button onClick={() => setShowDetailModal(false)} className="btn-compras btn-compras-outline">
                  Cerrar
                </button>
                {puedeEditar && facturaSeleccionada.estado !== 'Pagada' && facturaSeleccionada.estado !== 'Anulada' && (
                  <button 
                    onClick={() => {
                      setShowDetailModal(false);
                      abrirModalEditar(facturaSeleccionada);
                    }} 
                    className="btn-compras btn-compras-primary"
                  >
                    ✏️ Editar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
       {/* ✅ Barra de Operaciones Inferior - Botón Inicio */}
                <div className="db-actions-group">
                    <button onClick={() => navigate('/admin')} className="btn-primary">
                        ⚙️ Inicio
                    </button>
        </div>
    </div>
  </div>
  );
}

export default FacturasCompra;