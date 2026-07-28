import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { generarPDFFactura } from '../utils/generarPDFFacturas';
import '../style/facturacion.css';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;

// Configurar AXIOS para enviar token
axios.interceptors.request.use(function (config) {
    var token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
});

const METODOS_PAGO = [
    'Transferencia Bancaria',
    'Efectivo',
    'Cheque Corporativo',
    'Pasarela de pago Online',
    'Tarjeta de credito/debito'
];

const Facturas = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Estados
    const [facturas, setFacturas] = useState([]);
    const [proyectos, setProyectos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [generandoPDF, setGenerandoPDF] = useState(false);
    const [filtroTexto, setFiltroTexto] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('Todos');

    // Modal de crear factura (desde proyecto)
    const [showModal, setShowModal] = useState(false);
    const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
    const [nuevaFactura, setNuevaFactura] = useState({
        idProyecto: '',
        metodoPago: 'Transferencia Bancaria',
        notas: ''
    });

    // Modal de crear factura INDEPENDIENTE (sin proyecto)
    const [showModalIndependiente, setShowModalIndependiente] = useState(false);
    const [nuevaFacturaInd, setNuevaFacturaInd] = useState({
        idCliente: '',
        idSede: '',
        metodoPago: 'Transferencia Bancaria',
        notas: '',
        notasLegales: '',
        items: []
    });
    const [clienteSeleccionadoInd, setClienteSeleccionadoInd] = useState(null);
    const [sedesDisponiblesInd, setSedesDisponiblesInd] = useState([]);

    // Modal de detalle
    const [showDetalle, setShowDetalle] = useState(false);
    const [facturaDetalle, setFacturaDetalle] = useState(null);

    // Seguridad
    const [accesoPermitido, setAccesoPermitido] = useState(false);

    useEffect(() => {
        const rol = localStorage.getItem('rol');
        const isAuth = localStorage.getItem('auth');
        const permisos = ['admin', 'comercial', 'gerente', 'ingeniero', 'contable'];

        if (!isAuth || !permisos.includes(rol)) {
            alert("Acceso denegado");
            navigate('/admin');
        } else {
            setAccesoPermitido(true);
            cargarDatos();
        }
    }, [navigate]);

    useEffect(() => {
        const cotizacionId = searchParams.get('cotizacion');
        if (cotizacionId) {
            setFiltroTexto(cotizacionId);
        }
        const facturaId = searchParams.get('facturaId');
        if (facturaId) {
            setTimeout(() => {
                verDetalle(facturaId);
            }, 500);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [resFacturas, resProyectos, resClientes] = await Promise.all([
                axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/facturas`).catch(() => ({ data: { data: [] } })),
                axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/proyectos`).catch(() => ({ data: { data: [] } })),
                axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/clientes`).catch(() => ({ data: { data: [] } }))
            ]);
            setFacturas(resFacturas.data?.data || []);
            setProyectos(resProyectos.data?.data || []);
            setClientes(resClientes.data?.data || []);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setCargando(false);
        }
    };

    const obtenerInfoProyecto = (idProyecto) => {
        return proyectos.find(p => p.idProyecto === idProyecto) || null;
    };

    const obtenerInfoCliente = (idCliente) => {
        return clientes.find(c => c.idCliente === idCliente) || null;
    };

    const colorEstado = (estado) => {
        switch (estado) {
            case 'Pendiente de Anticipo': return '#f39c12';
            case 'Anticipo ya Pagado': return '#17a2b8';
            case 'Pendiente de Saldo': return '#fd7e14';
            case 'Pendiente de 2da Etapa': return '#6f42c1';
            case 'Pagada': return '#27ae60';
            case 'Anulada': return '#e74c3c';
            case 'Vencido': return '#95a5a6';
            default: return '#95a5a6';
        }
    };

    const getClaseEstado = (estado) => {
        switch (estado) {
            case 'Pendiente de Anticipo': return 'estado-pendiente-anticipo';
            case 'Anticipo ya Pagado': return 'estado-anticipo-pagado';
            case 'Pendiente de Saldo': return 'estado-pendiente-saldo';
            case 'Pendiente de 2da Etapa': return 'estado-pendiente-2da';
            case 'Pagada': return 'estado-pagada';
            case 'Anulada': return 'estado-anulada';
            case 'Vencido': return 'estado-vencido';
            default: return 'estado-vencido';
        }
    };

    const descargarPDFFactura = async (factura) => {
        setGenerandoPDF(true);
        try {
            const datosCompletos = {
                ...factura,
                datosEmisor: factura.datosEmisor || {
                    razonSocial: 'Neoconstrucciones Integrales SAS',
                    nit: '901.421.096-1',
                    direccion: 'Calle 11c No. 80B-70',
                    celular: '3017223223',
                    correoElectronico: 'neoconstruccionesintegrales@gmail.com'
                }
            };
            await generarPDFFactura(datosCompletos);
        } catch (e) {
            alert('Error generando PDF: ' + e.message);
            console.error(e);
        } finally {
            setGenerandoPDF(false);
        }
    };

    const handleCambioProyecto = (idProyecto) => {
        const proyecto = proyectos.find(p => p.idProyecto === idProyecto);
        setProyectoSeleccionado(proyecto || null);
        setNuevaFactura(prev => ({ ...prev, idProyecto }));
    };

    const crearFactura = async (e) => {
        e.preventDefault();
        if (!nuevaFactura.idProyecto) {
            alert("Debes seleccionar un proyecto");
            return;
        }
        if (!proyectoSeleccionado) {
            alert("Proyecto no encontrado");
            return;
        }

        setCargando(true);
        try {
            const items = proyectoSeleccionado.items || [];
            const subtotal = proyectoSeleccionado.presupuestoTotal || 0;

            const payload = {
                metodoPago: nuevaFactura.metodoPago,
                items: items.map(item => ({
                    idServicio: item.idServicio || '',
                    nombreServicio: item.nombreServicio || '',
                    cantidad: item.cantidad || 1,
                    precioUnitario: item.precioUnitario || 0,
                    subtotal: item.subtotal || 0
                })),
                subtotal: subtotal,
                notas: nuevaFactura.notas
            };

        await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/proyectos/${proyectoSeleccionado.idProyecto}/facturas`, payload);
            alert("Factura creada exitosamente");
            setShowModal(false);
            cargarDatos();
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || error.message));
        } finally {
            setCargando(false);
        }
    };

    const abrirModalIndependiente = () => {
        setNuevaFacturaInd({
            idCliente: '',
            idSede: '',
            metodoPago: 'Transferencia Bancaria',
            notas: '',
            notasLegales: 'Terminos: Pago a 30 dias. IVA incluido.',
            items: [{
                id: Date.now(),
                nombreServicio: '',
                descripcion: '',
                cantidad: 1,
                precioUnitario: 0,
                unidad: 'und',
                subtotal: 0
            }]
        });
        setClienteSeleccionadoInd(null);
        setSedesDisponiblesInd([]);
        setShowModalIndependiente(true);
    };

    const handleCambioClienteInd = (idCliente) => {
        const cliente = clientes.find(c => c.idCliente === idCliente);
        if (!cliente) {
            setSedesDisponiblesInd([]);
            setClienteSeleccionadoInd(null);
            setNuevaFacturaInd(prev => ({ ...prev, idCliente: '', idSede: '' }));
            return;
        }
        const sedePrincipal = { id: `${idCliente}-PRINCIPAL`, nombreSede: "Sede Principal (Administrativa)" };
        setSedesDisponiblesInd([sedePrincipal, ...(cliente.sedes || [])]);
        setClienteSeleccionadoInd(cliente);
        setNuevaFacturaInd(prev => ({ ...prev, idCliente, idSede: sedePrincipal.id }));
    };

    const modificarItemInd = (index, campo, valor) => {
        const nuevosItems = [...nuevaFacturaInd.items];
        nuevosItems[index][campo] = valor;
        if (campo === 'precioUnitario' || campo === 'cantidad') {
            nuevosItems[index].subtotal = Number(nuevosItems[index].precioUnitario) * Number(nuevosItems[index].cantidad);
        }
        setNuevaFacturaInd(prev => ({ ...prev, items: nuevosItems }));
    };

    const agregarItemInd = () => {
        setNuevaFacturaInd(prev => ({
            ...prev,
            items: [...prev.items, {
                id: Date.now(),
                nombreServicio: '',
                descripcion: '',
                cantidad: 1,
                precioUnitario: 0,
                unidad: 'und',
                subtotal: 0
            }]
        }));
    };

    const eliminarItemInd = (index) => {
        if (nuevaFacturaInd.items.length === 1) {
            alert("Debe tener al menos un item");
            return;
        }
        setNuevaFacturaInd(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const calcularTotalesInd = () => {
        const subtotal = nuevaFacturaInd.items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
        const iva = subtotal * 0.19;
        const retencion = subtotal * 0.02;
        const totalConIva = subtotal + iva;
        const netoACobrar = totalConIva;
        return { subtotal, iva, retencion, totalConIva, netoACobrar };
    };

    const crearFacturaIndependiente = async (e) => {
        e.preventDefault();
        if (!nuevaFacturaInd.idCliente) {
            alert("Debes seleccionar un cliente");
            return;
        }
        if (nuevaFacturaInd.items.some(i => !i.nombreServicio.trim())) {
            alert("Todos los items deben tener un nombre de servicio");
            return;
        }

        setCargando(true);
        try {
            const totalesInd = calcularTotalesInd();
            const subtotalInd = totalesInd.subtotal;
            const cliente = clienteSeleccionadoInd;
            const esPrincipal = String(nuevaFacturaInd.idSede).includes('PRINCIPAL');
            const sedeData = !esPrincipal && cliente.sedes
                ? cliente.sedes.find(s => s.id === nuevaFacturaInd.idSede)
                : null;

            const payload = {
                idCliente: nuevaFacturaInd.idCliente,
                idSede: nuevaFacturaInd.idSede,
                nombreEmpresa: cliente.nombreEmp,
                nombreSede: esPrincipal ? 'Sede Principal (Administrativa)' : (sedeData?.nombreSede || 'Principal'),
                direccionSede: esPrincipal ? cliente.direccion : (sedeData?.direccion || cliente.direccion || ''),
                nitCliente: esPrincipal ? cliente.nit : (cliente.nit || ''),
                contactoCliente: esPrincipal ? (cliente.telefono || cliente.celular) : (sedeData?.celular || cliente.telefono || ''),
                correoCliente: esPrincipal ? cliente.correo : (sedeData?.correoEnc || cliente.correo || ''),
                metodoPago: nuevaFacturaInd.metodoPago,
                items: nuevaFacturaInd.items.map(({ id, ...rest }) => rest),
                subtotal: subtotalInd,
                notas: nuevaFacturaInd.notas,
                notasLegales: nuevaFacturaInd.notasLegales,
                fechaEmision: new Date().toISOString().split('T')[0],
                fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };

        await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/facturas/independiente`, payload);
            alert("Factura independiente creada exitosamente");
            setShowModalIndependiente(false);
            cargarDatos();
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || error.message));
        } finally {
            setCargando(false);
        }
    };

    const cambiarEstadoFactura = async (idFactura, nuevoEstado) => {
        let mensajeConfirmacion = '';
        switch (nuevoEstado) {
            case 'Anticipo ya Pagado':
                mensajeConfirmacion = 'Esta seguro que el cliente YA realizo el pago del anticipo?';
                break;
            case 'Pagada':
                mensajeConfirmacion = 'Esta seguro que el cliente YA realizo el pago TOTAL de la factura?';
                break;
            case 'Anulada':
                mensajeConfirmacion = 'Esta seguro de ANULAR esta factura? Esta accion no se puede deshacer.';
                break;
            default:
                mensajeConfirmacion = `Confirmar cambio de estado a "${nuevoEstado}"?`;
        }

        let advertencia = '';
        if (nuevoEstado === 'Pagada') {
            advertencia = '\n\nADVERTENCIA: Una vez marcada como PAGADA, no se podra revertir el estado.';
        } else if (nuevoEstado === 'Anulada') {
            advertencia = '\n\nADVERTENCIA: La factura quedara ANULADA permanentemente.';
        }

        if (!window.confirm(mensajeConfirmacion + advertencia)) {
            return;
        }

        try {
            await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/facturas/${idFactura}/estado`, { estado: nuevoEstado });
            alert(`Factura actualizada a: ${nuevoEstado}`);
            cargarDatos();
            if (showDetalle) verDetalle(idFactura);
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || error.message));
        }
    };

    const verDetalle = async (idFactura) => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/facturas/${idFactura}`);
            const data = res.data?.data || res.data;
            if (!data.datosEmisor) {
                data.datosEmisor = {
                    razonSocial: 'Neoconstrucciones Integrales SAS',
                    nit: '901.421.096-1',
                    direccion: 'Calle 11c No. 80B-70',
                    celular: '3017223223',
                    correoElectronico: 'neoconstruccionesintegrales@gmail.com'
                };
            }
            setFacturaDetalle(data);
            setShowDetalle(true);
        } catch (error) {
            console.error('Error cargando detalle:', error);
            const f = facturas.find(fac => fac.idFactura === idFactura || fac._id === idFactura);
            if (f) {
                if (!f.datosEmisor) {
                    f.datosEmisor = {
                        razonSocial: 'Neoconstrucciones Integrales SAS',
                        nit: '901.421.096-1',
                        direccion: 'Calle 11c No. 80B-70',
                        celular: '3017223223',
                        correoElectronico: 'neoconstruccionesintegrales@gmail.com'
                    };
                }
                setFacturaDetalle(f);
                setShowDetalle(true);
            }
        }
    };

    const eliminarFactura = async (idFactura) => {
        if (!window.confirm("Eliminar esta factura?")) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/facturas/${idFactura}`);
            alert("Factura eliminada");
            cargarDatos();
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || error.message));
        }
    };

    const facturasFiltradas = facturas.filter(f => {
        const proyecto = obtenerInfoProyecto(f.idProyecto);
        const texto = filtroTexto.toLowerCase();
        const coincideTexto =
            (f.idFactura || '').toLowerCase().includes(texto) ||
            (f.nombreEmpresa || '').toLowerCase().includes(texto) ||
            (f.nombreProyecto || '').toLowerCase().includes(texto) ||
            (f.idCotizacion || '').toLowerCase().includes(texto) ||
            (proyecto?.nombreProyecto || '').toLowerCase().includes(texto);
        const coincideEstado = filtroEstado === 'Todos' || f.estado === filtroEstado;
        return coincideTexto && coincideEstado;
    });

    const { subtotal: subtotalInd, iva: ivaInd, retencion: retencionInd, totalConIva: totalConIvaInd, netoACobrar: netoInd } = calcularTotalesInd();

    if (!accesoPermitido) return null;

    const userRol = localStorage.getItem('rol') || 'ADMIN';

    return (
        <div className="dba-container">
            <div className="dba-wrapper">
                {/* HEADER */}
                <div className="dba-header-text">
                    <h1 className="dba-title">📄 Gestión de Facturas</h1>
                    <p className="dba-subtitle">
                        Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                    </p>
                </div>
                <div className="header-acciones">
                    <button onClick={abrirModalIndependiente} className="btn-crear">
                        + Factura Independiente
                    </button>
                </div>
                {/* FILTROS */}
                <div className="filtro-container">
                    <input
                        type="text"
                        placeholder="🔍 Buscar por ID, empresa, proyecto o cotizacion..."
                        value={filtroTexto}
                        onChange={(e) => setFiltroTexto(e.target.value)}
                        className="filtro-input"
                    />
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                        <option value="Todos">Todos los estados</option>
                        <option value="Pendiente de Anticipo">Pendiente de Anticipo</option>
                        <option value="Anticipo ya Pagado">Anticipo ya Pagado</option>
                        <option value="Pendiente de Saldo">Pendiente de Saldo</option>
                        <option value="Pendiente de 2da Etapa">Pendiente de 2da Etapa</option>
                        <option value="Pagada">Pagada</option>
                        <option value="Anulada">Anulada</option>
                        <option value="Vencido">Vencido</option>
                    </select>
                    <button
                        onClick={() => { setFiltroTexto(''); setFiltroEstado('Todos'); }}
                        className="btn-secondary btn-sm"
                    >
                        🔄 Limpiar
                    </button>
                   
                </div>

                {/* TABLA */}
                {cargando && facturas.length === 0 ? (
                    <div className="no-results">Cargando facturas...</div>
                ) : (
                    <div className="table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID Factura</th>
                                    <th>Empresa / Proyecto</th>
                                    <th className="text-right">Subtotal</th>
                                    <th className="text-right">IVA (19%)</th>
                                    <th className="text-right">Ret. (2%)</th>
                                    <th className="text-right">Neto a Cobrar</th>
                                    <th className="text-center">Estado</th>
                                    <th>Nota</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facturasFiltradas.length === 0 && (
                                    <tr>
                                        <td colSpan="10" className="text-center">
                                            <div className="no-results">No se encontraron facturas</div>
                                        </td>
                                    </tr>
                                )}
                                {facturasFiltradas.map((f, idx) => (
                                    <tr key={f._id || f.idFactura} className={idx % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                                        <td data-label="ID Factura">
                                            <strong className="font-size-13">{f.idFactura}</strong>
                                            <div className="font-size-11 text-gray">{new Date(f.fechaEmision).toLocaleDateString()}</div>
                                        </td>
                                        <td data-label="Empresa">
                                            <strong className="font-size-13">{f.nombreEmpresa}</strong>
                                            <div className="font-size-12 text-gray">{f.nombreProyecto}</div>
                                            <div className="font-size-11 text-gray">{f.metodoPago}</div>
                                        </td>
                                        <td data-label="Subtotal" className="text-right font-size-13 text-mono">
                                            ${(f.subtotal || 0).toLocaleString()}
                                        </td>
                                        <td data-label="IVA" className="text-right font-size-13 text-mono">
                                            ${(f.iva || 0).toLocaleString()}
                                        </td>
                                        <td data-label="Retencion" className="text-right font-size-13 text-mono">
                                            ${(f.retencion || 0).toLocaleString()}
                                        </td>
                                        <td data-label="Neto" className="text-right font-size-13 font-bold text-mono">
                                            ${(f.netoACobrar || 0).toLocaleString()}
                                        </td>
                                        <td data-label="Estado" className="text-center">
                                            <span className={`estado-badge ${getClaseEstado(f.estado)}`}>
                                                {f.estado}
                                            </span>
                                        </td>
                                        <td data-label="Nota" className="font-size-12 text-gray">
                                            {f.notas || '-'}
                                        </td>
                                        <td data-label="Acciones" className="text-center">
                                            <div className="acciones-flex">
                                                <button onClick={() => verDetalle(f.idFactura)} className="btn-info-outline btn-xs">
                                                    👁️ Ver
                                                </button>
                                                <button onClick={() => descargarPDFFactura(f)} disabled={generandoPDF} className="btn-danger-outline btn-xs">
                                                    {generandoPDF ? '...' : 'PDF'}
                                                </button>
                                                {f.estado === 'Pendiente de Anticipo' && (
                                                    <button onClick={() => cambiarEstadoFactura(f.idFactura, 'Anticipo ya Pagado')} className="btn-success-outline btn-xs">
                                                        Marcar Anticipo
                                                    </button>
                                                )}
                                                {f.estado === 'Anticipo ya Pagado' && (
                                                    <button onClick={() => cambiarEstadoFactura(f.idFactura, 'Pagada')} className="btn-success-outline btn-xs">
                                                        Marcar Pagada
                                                    </button>
                                                )}
                                                {f.estado === 'Pendiente de Saldo' && (
                                                    <button onClick={() => cambiarEstadoFactura(f.idFactura, 'Pagada')} className="btn-success-outline btn-xs">
                                                        Marcar Pagada
                                                    </button>
                                                )}
                                                {f.estado === 'Pendiente de 2da Etapa' && (
                                                    <button onClick={() => cambiarEstadoFactura(f.idFactura, 'Pagada')} className="btn-success-outline btn-xs">
                                                        Marcar Pagada
                                                    </button>
                                                )}
                                                {f.estado !== 'Pagada' && f.estado !== 'Anulada' && (
                                                    <button onClick={() => cambiarEstadoFactura(f.idFactura, 'Anulada')} className="btn-secondary btn-xs">
                                                        Anular
                                                    </button>
                                                )}
                                                {f.estado !== 'Pagada' && (
                                                    <button onClick={() => eliminarFactura(f.idFactura)} className="btn-danger-outline btn-xs">
                                                        🗑️ Eliminar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* RESUMEN */}
                {!cargando && facturasFiltradas.length > 0 && (
                    <div className="resumen-card" style={{ marginTop: '20px' }}>
                        <div className="resumen-grid">
                            <div className="resumen-item">
                                <p className="resumen-label">Total Subtotal</p>
                                <p className="resumen-value">${facturasFiltradas.reduce((a, f) => a + (f.subtotal || 0), 0).toLocaleString()}</p>
                            </div>
                            <div className="resumen-item">
                                <p className="resumen-label">Total IVA</p>
                                <p className="resumen-value">${facturasFiltradas.reduce((a, f) => a + (f.iva || 0), 0).toLocaleString()}</p>
                            </div>
                            <div className="resumen-item">
                                <p className="resumen-label">Total Neto</p>
                                <p className="resumen-value">${facturasFiltradas.reduce((a, f) => a + (f.netoACobrar || 0), 0).toLocaleString()}</p>
                            </div>
                            <div className="resumen-item" style={{ gridColumn: '1 / -1' }}>
                                <p className="resumen-label">Tipos de pago</p>
                                <p className="resumen-value font-size-12">
                                    {(() => {
                                        const tipos = {};
                                        facturasFiltradas.forEach(f => {
                                            const proyecto = obtenerInfoProyecto(f.idProyecto);
                                            const tipo = proyecto?.tipoPago || 'No definido';
                                            tipos[tipo] = (tipos[tipo] || 0) + 1;
                                        });
                                        return Object.entries(tipos).map(([tipo, count]) => {
                                            const label = tipo === 'unico' ? 'Unico' : 
                                                          tipo === 'anticipo_final' ? 'Anticipo+Final' :
                                                          tipo === 'por_etapas' ? 'Por Etapas' : 
                                                          tipo === 'personalizado' ? 'Personalizado' : tipo;
                                            return `${label}(${count})`;
                                        }).join(' | ');
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================ */}
                {/* MODAL CREAR FACTURA DESDE PROYECTO */}
                {/* ============================================ */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div>
                                    <h2 className="modal-title">📄 Nueva Factura desde Proyecto</h2>
                                </div>
                                <button onClick={() => setShowModal(false)} className="btn-link">✕</button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={crearFactura}>
                                    <div className="form-group">
                                        <label>Proyecto: *</label>
                                        <select
                                            value={nuevaFactura.idProyecto}
                                            onChange={(e) => handleCambioProyecto(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Seleccione Proyecto --</option>
                                            {proyectos.map(p => {
                                                const cliente = obtenerInfoCliente(p.idCliente);
                                                return (
                                                    <option key={p.idProyecto} value={p.idProyecto}>
                                                        {p.idProyecto} - {p.nombreProyecto} ({cliente?.nombreEmp || p.idCliente})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    {proyectoSeleccionado && (
                                        <div className="resumen-card" style={{ marginBottom: '16px' }}>
                                            <h4 style={{ margin: '0 0 10px 0', color: '#16a085' }}>Datos del Proyecto</h4>
                                            <div className="resumen-grid">
                                                <div className="resumen-item"><p className="resumen-label">Cliente</p><p className="resumen-value">{proyectoSeleccionado.nombreEmp}</p></div>
                                                <div className="resumen-item"><p className="resumen-label">Sede</p><p className="resumen-value">{proyectoSeleccionado.nombreSede}</p></div>
                                                <div className="resumen-item"><p className="resumen-label">Presupuesto</p><p className="resumen-value">${(proyectoSeleccionado.presupuestoTotal || 0).toLocaleString()}</p></div>
                                                <div className="resumen-item"><p className="resumen-label">Items</p><p className="resumen-value">{(proyectoSeleccionado.items || []).length} servicios</p></div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>Metodo de Pago:</label>
                                        <select
                                            value={nuevaFactura.metodoPago}
                                            onChange={(e) => setNuevaFactura(prev => ({ ...prev, metodoPago: e.target.value }))}
                                        >
                                            {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Notas:</label>
                                        <textarea
                                            value={nuevaFactura.notas}
                                            onChange={(e) => setNuevaFactura(prev => ({ ...prev, notas: e.target.value }))}
                                            rows="3"
                                        />
                                    </div>
                                    {proyectoSeleccionado && (
                                        <div className="resumen-card" style={{ marginBottom: '16px' }}>
                                            <h4 style={{ margin: '0 0 10px 0' }}>Resumen Financiero Automatico</h4>
                                            <div className="resumen-grid">
                                                <div className="resumen-item"><p className="resumen-label">Subtotal</p><p className="resumen-value">${(proyectoSeleccionado.presupuestoTotal || 0).toLocaleString()}</p></div>
                                                <div className="resumen-item"><p className="resumen-label">IVA (19%)</p><p className="resumen-value">${((proyectoSeleccionado.presupuestoTotal || 0) * 0.19).toLocaleString()}</p></div>
                                                <div className="resumen-item"><p className="resumen-label">Retencion (2%)</p><p className="resumen-value">${((proyectoSeleccionado.presupuestoTotal || 0) * 0.02).toLocaleString()}</p></div>
                                                <div className="resumen-item"><p className="resumen-label">Anticipo (40%)</p><p className="resumen-value">${((proyectoSeleccionado.presupuestoTotal || 0) * 0.40).toLocaleString()}</p></div>
                                                <div className="resumen-item"><p className="resumen-label">Saldo (60%)</p><p className="resumen-value">${((proyectoSeleccionado.presupuestoTotal || 0) * 0.60).toLocaleString()}</p></div>
                                                <div className="resumen-item resumen-neto">
                                                    <p className="resumen-label">Neto a Cobrar</p>
                                                    <p className="resumen-value">${(((proyectoSeleccionado.presupuestoTotal || 0) * 1.19) - ((proyectoSeleccionado.presupuestoTotal || 0) * 0.02)).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="modal-footer" style={{ padding: '0', border: 'none', background: 'transparent' }}>
                                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                                            Cancelar
                                        </button>
                                        <button type="submit" disabled={cargando || !proyectoSeleccionado} className="btn-orange">
                                            {cargando ? 'Creando...' : 'Crear Factura'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================ */}
                {/* MODAL CREAR FACTURA INDEPENDIENTE */}
                {/* ============================================ */}
                {showModalIndependiente && (
                    <div className="modal-overlay" onClick={() => setShowModalIndependiente(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div>
                                    <h2 className="modal-title">📄 Nueva Factura Independiente</h2>
                                </div>
                                <button onClick={() => setShowModalIndependiente(false)} className="btn-link">✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="alert-emisor">
                                    <strong>Emisor:</strong> Neoconstrucciones Integrales SAS | NIT: 901.421.096-1 |
                                    Direccion: Calle 11c No 80B - 70 | Cel: 3017223223 |
                                    neoconstruccionesintegrales@gmail.com
                                </div>

                                <form onSubmit={crearFacturaIndependiente}>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Cliente: *</label>
                                            <select
                                                value={nuevaFacturaInd.idCliente}
                                                onChange={(e) => handleCambioClienteInd(e.target.value)}
                                                required
                                            >
                                                <option value="">-- Seleccione Cliente --</option>
                                                {clientes.map(c => (
                                                    <option key={c.idCliente} value={c.idCliente}>{c.nombreEmp}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {clienteSeleccionadoInd && (
                                            <div className="form-group">
                                                <label>Sede:</label>
                                                <select
                                                    value={nuevaFacturaInd.idSede}
                                                    onChange={(e) => setNuevaFacturaInd(prev => ({ ...prev, idSede: e.target.value }))}
                                                >
                                                    {sedesDisponiblesInd.map(s => (
                                                        <option key={s.id} value={s.id}>{s.nombreSede}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="form-group">
                                            <label>Metodo de Pago:</label>
                                            <select
                                                value={nuevaFacturaInd.metodoPago}
                                                onChange={(e) => setNuevaFacturaInd(prev => ({ ...prev, metodoPago: e.target.value }))}
                                            >
                                                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <h4 className="modal-section-title" style={{ marginTop: '20px' }}>Servicios</h4>
                                    <div className="modal-table-container">
                                        <table className="modal-table">
                                            <thead>
                                                <tr>
                                                    <th>Servicio</th>
                                                    <th>Descripcion</th>
                                                    <th className="text-center">Cant</th>
                                                    <th className="text-center">Und</th>
                                                    <th className="text-right">P. Unit</th>
                                                    <th className="text-right">Subtotal</th>
                                                    <th className="text-center">Acc</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {nuevaFacturaInd.items.map((item, index) => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <input
                                                                value={item.nombreServicio}
                                                                placeholder="Nombre servicio"
                                                                onChange={(e) => modificarItemInd(index, 'nombreServicio', e.target.value)}
                                                                required
                                                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                value={item.descripcion}
                                                                placeholder="Descripcion"
                                                                onChange={(e) => modificarItemInd(index, 'descripcion', e.target.value)}
                                                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ced4da' }}
                                                            />
                                                        </td>
                                                        <td className="text-center">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.cantidad}
                                                                onChange={(e) => modificarItemInd(index, 'cantidad', Number(e.target.value))}
                                                                style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'center' }}
                                                            />
                                                        </td>
                                                        <td className="text-center">
                                                            <input
                                                                value={item.unidad}
                                                                onChange={(e) => modificarItemInd(index, 'unidad', e.target.value)}
                                                                style={{ width: '50px', padding: '6px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'center' }}
                                                            />
                                                        </td>
                                                        <td className="text-right">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.precioUnitario}
                                                                onChange={(e) => modificarItemInd(index, 'precioUnitario', Number(e.target.value))}
                                                                style={{ width: '100px', padding: '6px', borderRadius: '4px', border: '1px solid #ced4da', textAlign: 'right' }}
                                                            />
                                                        </td>
                                                        <td className="text-right font-bold">
                                                            ${item.subtotal.toLocaleString()}
                                                        </td>
                                                        <td className="text-center">
                                                            <button type="button" onClick={() => eliminarItemInd(index)} className="btn-danger btn-xs">
                                                                X
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button type="button" onClick={agregarItemInd} className="btn-purple btn-sm" style={{ marginBottom: '20px' }}>
                                        + Agregar Servicio
                                    </button>

                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Notas:</label>
                                            <textarea
                                                rows="3"
                                                value={nuevaFacturaInd.notas}
                                                onChange={(e) => setNuevaFacturaInd(prev => ({ ...prev, notas: e.target.value }))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Notas Legales:</label>
                                            <textarea
                                                rows="3"
                                                value={nuevaFacturaInd.notasLegales}
                                                onChange={(e) => setNuevaFacturaInd(prev => ({ ...prev, notasLegales: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="resumen-card">
                                        <div className="resumen-grid">
                                            <div className="resumen-item"><p className="resumen-label">Subtotal</p><p className="resumen-value">${subtotalInd.toLocaleString()}</p></div>
                                            <div className="resumen-item"><p className="resumen-label">IVA (19%)</p><p className="resumen-value">${ivaInd.toLocaleString()}</p></div>
                                            <div className="resumen-item"><p className="resumen-label">Retencion (2%)</p><p className="resumen-value">${retencionInd.toLocaleString()}</p></div>
                                            <div className="resumen-item"><p className="resumen-label">Total con IVA</p><p className="resumen-value">${totalConIvaInd.toLocaleString()}</p></div>
                                            <div className="resumen-item resumen-neto">
                                                <p className="resumen-label">NETO A COBRAR</p>
                                                <p className="resumen-value">${netoInd.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="modal-footer" style={{ padding: '16px 0 0 0', border: 'none', background: 'transparent' }}>
                                        <button type="button" onClick={() => setShowModalIndependiente(false)} className="btn-secondary">
                                            Cancelar
                                        </button>
                                        <button type="submit" disabled={cargando || !nuevaFacturaInd.idCliente} className="btn-purple">
                                            {cargando ? 'Creando...' : 'Crear Factura Independiente'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================ */}
                {/* MODAL DETALLE DE FACTURA */}
                {/* ============================================ */}
                {showDetalle && facturaDetalle && (
                    <div className="modal-overlay" onClick={() => setShowDetalle(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div>
                                    <h2 className="modal-title">📄 Factura {facturaDetalle?.idFactura || 'N/A'}</h2>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => descargarPDFFactura(facturaDetalle)} disabled={generandoPDF} className="btn-danger btn-sm">
                                        {generandoPDF ? 'Generando...' : 'Descargar PDF'}
                                    </button>
                                    <button onClick={() => setShowDetalle(false)} className="btn-link">✕</button>
                                </div>
                            </div>
                            <div className="modal-body">
                                <div className="alert-emisor">
                                    <strong>Emisor:</strong> {facturaDetalle?.datosEmisor?.razonSocial || 'Neoconstrucciones Integrales SAS'} |
                                    NIT: {facturaDetalle?.datosEmisor?.nit || '901.421.096-1'} |
                                    Direccion: {facturaDetalle?.datosEmisor?.direccion || 'Calle 11c No. 80B-70'} |
                                    Cel: {facturaDetalle?.datosEmisor?.celular || '3017223223'} |
                                    Correo: {facturaDetalle?.datosEmisor?.correoElectronico || 'neoconstruccionesintegrales@gmail.com'}
                                </div>

                                <div className="resumen-card" style={{ background: '#f8f9fa', borderColor: '#dee2e6' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Datos del Cliente</h4>
                                    <div className="resumen-grid">
                                        <div className="resumen-item"><p className="resumen-label">Empresa</p><p className="resumen-value">{facturaDetalle?.nombreEmpresa || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Sede</p><p className="resumen-value">{facturaDetalle?.nombreSede || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Direccion</p><p className="resumen-value">{facturaDetalle?.direccionSede || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">NIT</p><p className="resumen-value">{facturaDetalle?.nitCliente || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Contacto</p><p className="resumen-value">{facturaDetalle?.contactoCliente || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Proyecto</p><p className="resumen-value">{facturaDetalle?.nombreProyecto || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Metodo de Pago</p><p className="resumen-value">{facturaDetalle?.metodoPago || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Correo</p><p className="resumen-value">{facturaDetalle?.correoCliente || 'No disponible'}</p></div>
                                    </div>
                                </div>

                                <h4 className="modal-section-title">Servicios Facturados</h4>
                                <div className="modal-table-container">
                                    <table className="modal-table">
                                        <thead>
                                            <tr>
                                                <th>Servicio</th>
                                                <th>Descripcion</th>
                                                <th className="text-center">Cant.</th>
                                                <th className="text-center">Und.</th>
                                                <th className="text-right">P. Unit.</th>
                                                <th className="text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(facturaDetalle?.items || []).map((item, i) => (
                                                <tr key={i}>
                                                    <td>{item?.nombreServicio || 'Servicio sin nombre'}</td>
                                                    <td>{item?.descripcion || ''}</td>
                                                    <td className="text-center">{item?.cantidad || 0}</td>
                                                    <td className="text-center">{item?.unidad || 'und'}</td>
                                                    <td className="text-right">${(item?.precioUnitario || 0).toLocaleString()}</td>
                                                    <td className="text-right">${(item?.subtotal || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {(facturaDetalle?.items || []).length === 0 && (
                                                <tr>
                                                    <td colSpan="6" className="text-center">
                                                        <p className="text-gray font-size-13" style={{ fontStyle: 'italic' }}>No hay servicios facturados</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="resumen-card">
                                    <h4 style={{ margin: '0 0 15px 0' }}>Resumen Financiero</h4>
                                    <div className="resumen-grid">
                                        <div className="resumen-item"><p className="resumen-label">Subtotal</p><p className="resumen-value">${(facturaDetalle?.subtotal || 0).toLocaleString()}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">IVA ({facturaDetalle?.ivaPorcentaje || 19}%)</p><p className="resumen-value">${(facturaDetalle?.iva || 0).toLocaleString()}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Total Factura</p><p className="resumen-value">${(facturaDetalle?.totalConIva || 0).toLocaleString()}</p></div>
                                        <div className="resumen-item" style={{ gridColumn: '1 / -1' }}>
                                            <div className="alert-banner alert-warning" style={{ margin: '8px 0 0 0' }}>
                                                <strong>NOTA:</strong> Esta factura esta sujeta a retencion en la fuente del {facturaDetalle?.retencionPorcentaje || 2}% 
                                                equivalente a <strong>${(facturaDetalle?.retencion || 0).toLocaleString()}</strong>. La retencion es de caracter informativo; el valor neto a pagar es el Total con IVA.
                                            </div>
                                        </div>
                                        <div className="resumen-item resumen-neto">
                                            <p className="resumen-label">VALOR NETO A PAGAR</p>
                                            <p className="resumen-value">${(facturaDetalle?.netoACobrar || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                {facturaDetalle?.estado === 'Pendiente de Anticipo' && (
                                    <button onClick={() => { cambiarEstadoFactura(facturaDetalle?.idFactura, 'Anticipo ya Pagado'); }} className="btn-success">
                                        Marcar Anticipo Pagado
                                    </button>
                                )}
                                {facturaDetalle?.estado === 'Anticipo ya Pagado' && (
                                    <button onClick={() => { cambiarEstadoFactura(facturaDetalle?.idFactura, 'Pagada'); }} className="btn-success">
                                        Marcar Pagada
                                    </button>
                                )}
                                {facturaDetalle?.estado === 'Pendiente de Saldo' && (
                                    <button onClick={() => { cambiarEstadoFactura(facturaDetalle?.idFactura, 'Pagada'); }} className="btn-success">
                                        Marcar Pagada
                                    </button>
                                )}
                                {facturaDetalle?.estado === 'Pendiente de 2da Etapa' && (
                                    <button onClick={() => { cambiarEstadoFactura(facturaDetalle?.idFactura, 'Pagada'); }} className="btn-success">
                                        Marcar Pagada
                                    </button>
                                )}
                                <button onClick={() => setShowDetalle(false)} className="btn-secondary">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Barra de Operaciones Inferior */}
                <div style={{ marginTop: '20px' }}>
                    <button onClick={() => navigate('/admin')} className="btn-primary">⚙️ Inicio</button>
                </div>
            </div>
        </div>
    );
};

export default Facturas;