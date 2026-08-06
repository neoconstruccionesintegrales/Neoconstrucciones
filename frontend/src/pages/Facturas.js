import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import { generarPDFFactura } from '../utils/generarPDFFacturas';
import { toBase64 } from '../utils/toBase64';
import logo from '../imagenes/logo.png';
import '../style/facturacion.css';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;

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
    const [catalogoServicios, setCatalogoServicios] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [generandoPDF, setGenerandoPDF] = useState(false);
    const [filtroTexto, setFiltroTexto] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [itemBuscandoIndex, setItemBuscandoIndex] = useState(null);

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
        items: [],
        ivaPorcentaje: 19,
        retencionPorcentaje: 2
    });
    const [clienteSeleccionadoInd, setClienteSeleccionadoInd] = useState(null);
    const [sedesDisponiblesInd, setSedesDisponiblesInd] = useState([]);

    // Modal de detalle
    const [showDetalle, setShowDetalle] = useState(false);
    const [facturaDetalle, setFacturaDetalle] = useState(null);

    // Seguridad
    const [accesoPermitido, setAccesoPermitido] = useState(false);

    // Verificar roles autorizados para factura independiente
    const puedeCrearFacturaIndependiente = () => {
        const rol = localStorage.getItem('rol');
        const rolesPermitidos = ['admin', 'supervisor', 'contador'];
        return rolesPermitidos.includes(rol);
    };

    useEffect(() => {
        const rol = localStorage.getItem('rol');
        const isAuth = localStorage.getItem('auth');
        const permisos = ['admin', 'comercial', 'gerente', 'ingeniero', 'contable', 'supervisor'];

        if (!isAuth || !permisos.includes(rol)) {
            alert("Acceso denegado");
            navigate('/admin');
        } else {
            setAccesoPermitido(true);
            cargarDatos();
            cargarCatalogoServicios();
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
                axios.get(`${API_URL}/facturas`).catch(() => ({ data: { data: [] } })),
                axios.get(`${API_URL}/proyectos`).catch(() => ({ data: { data: [] } })),
                axios.get(`${API_URL}/clientes`).catch(() => ({ data: { data: [] } }))
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

    const cargarCatalogoServicios = async () => {
    try {
        const res = await axios.get(`${API_URL}/servicios`).catch(() => ({ data: { data: [] } }));
        setCatalogoServicios(res.data?.data || []);
        // ✅ (La línea de setServiciosFiltrados fue borrada aquí)
    } catch (error) {
        console.error("Error cargando catálogo:", error);
    }
};

    const obtenerInfoProyecto = (idProyecto) => {
        return proyectos.find(p => p.idProyecto === idProyecto) || null;
    };

    const obtenerInfoCliente = (idCliente) => {
        return clientes.find(c => c.idCliente === idCliente) || null;
    };

    const esFacturaIndependiente = (factura) => {
        return factura.esIndependiente === true || 
               factura.tipo === 'independiente' ||
               (factura.idProyecto && factura.idProyecto.startsWith('IND-'));
    };

    const getClaseEstado = (estado) => {
        switch (estado) {
            case 'Emitida': return 'estado-emitida';
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
            const logoBase64 = await toBase64(logo);
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
            await generarPDFFactura(datosCompletos, logoBase64);
        } catch (e) {
            alert('Error generando PDF: ' + e.message);
            console.error(e);
            await generarPDFFactura(factura);
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

            await axios.post(`${API_URL}/proyectos/${proyectoSeleccionado.idProyecto}/facturas`, payload);
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
        if (!puedeCrearFacturaIndependiente()) {
            alert("No tienes permisos para crear facturas independientes. Roles autorizados: Administrador, Supervisor, Contador");
            return;
        }
        setNuevaFacturaInd({
            idCliente: '',
            idSede: '',
            metodoPago: 'Transferencia Bancaria',
            notas: '',
            notasLegales: 'Terminos: Pago a 30 dias. IVA incluido.',
            items: [{
                id: Date.now(),
                 idServicio: '',
                nombreServicio: '',
                descripcion: '',
                cantidad: 1,
                precioUnitario: 0,
                unidad: 'und',
                subtotal: 0
            }],
            ivaPorcentaje: 19,
            retencionPorcentaje: 2
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
                id: Date.now() + Math.random(),
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
        const ivaPorcentaje = Number(nuevaFacturaInd.ivaPorcentaje) || 0;
        const retencionPorcentaje = Number(nuevaFacturaInd.retencionPorcentaje) || 0;
        const iva = subtotal * (ivaPorcentaje / 100);
        const retencion = subtotal * (retencionPorcentaje / 100);
        const totalConIva = subtotal + iva;
        const netoACobrar = totalConIva - retencion;
        return { subtotal, iva, retencion, totalConIva, netoACobrar, ivaPorcentaje, retencionPorcentaje };
    };

        const crearFacturaIndependiente = async (e) => {
        e.preventDefault();
        if (!nuevaFacturaInd.idCliente) {
            alert("Debes seleccionar un cliente");
            return;
        }

        // ✅ VALIDACIÓN CORREGIDA: Ya no usa .trim() sobre undefined
        if (nuevaFacturaInd.items.some(i => {
            // Si tiene idServicio (y no es manual), es del catálogo. Es válido.
            if (i.idServicio && i.idServicio !== 'manual') return false;
            // Si NO tiene idServicio, debe tener un nombreServicio escrito manualmente.
            return !i.nombreServicio || !i.nombreServicio.trim();
        })) {
            alert("Todos los items deben tener un nombre de servicio válido.");
            return;
        }

        setCargando(true);
        try {
            const totalesInd = calcularTotalesInd();
            const cliente = clienteSeleccionadoInd;
            const esPrincipal = String(nuevaFacturaInd.idSede).includes('PRINCIPAL');
            const sedeData = !esPrincipal && cliente.sedes
                ? cliente.sedes.find(s => s.id === nuevaFacturaInd.idSede)
                : null;

            // ✅ CORRECCIÓN AQUÍ: Mapeamos los items y aseguramos que tengan 'nombreServicio'
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
                
                // ✅ AQUÍ ESTÁ LA MAGIA: Renombramos 'nombre' a 'nombreServicio'
                items: nuevaFacturaInd.items.map(({ id, ...rest }) => ({
                    ...rest,
                    // Si viene del catálogo usa rest.nombre, si es manual usa rest.nombreServicio
                    nombreServicio: rest.idServicio ? rest.nombre : rest.nombreServicio
                })),

                subtotal: totalesInd.subtotal,
                iva: totalesInd.iva,
                ivaPorcentaje: totalesInd.ivaPorcentaje,
                retencion: totalesInd.retencion,
                retencionPorcentaje: totalesInd.retencionPorcentaje,
                totalConIva: totalesInd.totalConIva,
                netoACobrar: totalesInd.netoACobrar,
                notas: nuevaFacturaInd.notas,
                notasLegales: nuevaFacturaInd.notasLegales,
                fechaEmision: new Date().toISOString().split('T')[0],
                fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                esIndependiente: true,
                estado: 'Emitida'
            };

            await axios.post(`${API_URL}/facturas/independiente`, payload);
            alert("Factura independiente creada exitosamente");
            setShowModalIndependiente(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            alert("Error: " + (error.response?.data?.message || error.message));
        } finally {
            setCargando(false);
        }
    };

    const cambiarEstadoFactura = async (idFactura, nuevoEstado) => {
        // Verificar si es factura independiente para estados simplificados
        const factura = facturas.find(f => f.idFactura === idFactura);
        const esIndependiente = factura ? esFacturaIndependiente(factura) : false;

        let mensajeConfirmacion = '';
        if (esIndependiente) {
            mensajeConfirmacion = `¿Confirmar cambio de estado a "${nuevoEstado}"?`;
        } else {
            switch (nuevoEstado) {
                case 'Anticipo ya Pagado':
                    mensajeConfirmacion = '¿Está seguro que el cliente YA realizó el pago del anticipo?';
                    break;
                case 'Pagada':
                    mensajeConfirmacion = '¿Está seguro que el cliente YA realizó el pago TOTAL de la factura?';
                    break;
                case 'Anulada':
                    mensajeConfirmacion = '¿Está seguro de ANULAR esta factura? Esta acción no se puede deshacer.';
                    break;
                default:
                    mensajeConfirmacion = `Confirmar cambio de estado a "${nuevoEstado}"?`;
            }
        }

        let advertencia = '';
        if (nuevoEstado === 'Pagada') {
            advertencia = '\n\nADVERTENCIA: Una vez marcada como PAGADA, no se podrá revertir el estado.';
        } else if (nuevoEstado === 'Anulada') {
            advertencia = '\n\nADVERTENCIA: La factura quedará ANULADA permanentemente.';
        }

        if (!window.confirm(mensajeConfirmacion + advertencia)) {
            return;
        }

        try {
            await axios.put(`${API_URL}/facturas/${idFactura}/estado`, { estado: nuevoEstado });
            alert(`Factura actualizada a: ${nuevoEstado}`);
            cargarDatos();
            if (showDetalle) verDetalle(idFactura);
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || error.message));
        }
    };

    const verDetalle = async (idFactura) => {
        try {
            const res = await axios.get(`${API_URL}/facturas/${idFactura}`);
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
        if (!window.confirm("¿Eliminar esta factura?")) return;
        try {
            await axios.delete(`${API_URL}/facturas/${idFactura}`);
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

    const totalesInd = calcularTotalesInd();

    if (!accesoPermitido) return null;

    const userRol = localStorage.getItem('rol') || 'ADMIN';

    // Renderizar acciones según tipo de factura
    const renderAccionesFactura = (f) => {
        const esIndependiente = esFacturaIndependiente(f);
        
        if (esIndependiente) {
            // Estados simplificados para facturas independientes
            return (
                <div className="acciones-flex">
                    <button onClick={() => verDetalle(f.idFactura)} className="btn-info-outline btn-xs">
                        👁️ Ver
                    </button>
                    <button onClick={() => descargarPDFFactura(f)} disabled={generandoPDF} className="btn-danger-outline btn-xs">
                        {generandoPDF ? '...' : 'PDF'}
                    </button>
                    {f.estado === 'Emitida' && (
                        <button onClick={() => cambiarEstadoFactura(f.idFactura, 'Pagada')} className="btn-success-outline btn-xs">
                            Marcar Pagada
                        </button>
                    )}
                    {f.estado !== 'Pagada' && f.estado !== 'Anulada' && (
                        <>
                            <button onClick={() => cambiarEstadoFactura(f.idFactura, 'Anulada')} className="btn-secondary btn-xs">
                                Anular
                            </button>
                            <button onClick={() => eliminarFactura(f.idFactura)} className="btn-danger-outline btn-xs">
                                🗑️ Eliminar
                            </button>
                        </>
                    )}
                </div>
            );
        }

        // Estados para facturas de proyecto
        return (
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
        );
    };

    return (
        <div className="dba-container">
            <div className="dba-wrapper">
                {/* HEADER */}
                <div className="dba-header-text">
                    <h1 className="dba-title">📄 Gestión de Facturas</h1>
                    <p className="dba-subtitle">
                        Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                    </p>
                    <p>Total: <strong>{facturas.length}</strong> | Mostrando: <strong>{facturasFiltradas.length}</strong></p>
                </div>
                <div className="header-acciones">
                    {puedeCrearFacturaIndependiente() && (
                        <button onClick={abrirModalIndependiente} className="btn-crear">
                            + Factura Independiente
                        </button>
                    )}
                </div>

                {/* FILTROS */}
                <div className="filtro-container">
                    <input
                        type="text"
                        placeholder="🔍 Buscar por ID, empresa, proyecto o cotización..."
                        value={filtroTexto}
                        onChange={(e) => setFiltroTexto(e.target.value)}
                        className="filtro-input"
                    />
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                        <option value="Todos">Todos los estados</option>
                        <option value="Pendiente de Anticipo">Pendiente de Anticipo</option>
                        <option value="Anticipo ya Pagado">Anticipo ya Pagado</option>
                        <option value="Pendiente de Saldo">Pendiente de Saldo</option>
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
                                    <th>Tipo</th>
                                    <th className="text-right">Subtotal</th>
                                    <th className="text-right">IVA (%)</th>
                                    <th className="text-right">Ret. (%)</th>
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
                                {facturasFiltradas.map((f, idx) => {
                                    const esIndependiente = esFacturaIndependiente(f);
                                    return (
                                        <tr key={f._id || f.idFactura} className={idx % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                                            <td data-label="ID Factura">
                                                <strong className="font-size-13">{f.idFactura}</strong>
                                                <div className="font-size-11 text-gray">{new Date(f.fechaEmision).toLocaleDateString()}</div>
                                            </td>
                                            <td data-label="Empresa">
                                                <strong className="font-size-13">{f.nombreEmpresa}</strong>
                                                <div className="font-size-12 text-gray">{f.nombreProyecto || 'Sin proyecto'}</div>
                                                <div className="font-size-11 text-gray">{f.metodoPago}</div>
                                            </td>
                                            <td data-label="Tipo">
                                                <span className={`tipo-badge ${esIndependiente ? 'tipo-independiente' : 'tipo-proyecto'}`}>
                                                    {esIndependiente ? '📄 Independiente' : '📋 Proyecto'}
                                                </span>
                                            </td>
                                            <td data-label="Subtotal" className="text-right font-size-13 text-mono">
                                                ${(f.subtotal || 0).toLocaleString()}
                                            </td>
                                            <td data-label="IVA" className="text-right font-size-13 text-mono">
                                                ${(f.iva || 0).toLocaleString()} ({f.ivaPorcentaje || 19}%)
                                            </td>
                                            <td data-label="Retencion" className="text-right font-size-13 text-mono">
                                                ${(f.retencion || 0).toLocaleString()} ({f.retencionPorcentaje || 2}%)
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
                                                {renderAccionesFactura(f)}
                                            </td>
                                        </tr>
                                    );
                                })}
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
                                <p className="resumen-label">Resumen por tipo</p>
                                <p className="resumen-value font-size-12">
                                    {(() => {
                                        const tipos = { independiente: 0, proyecto: 0 };
                                        facturasFiltradas.forEach(f => {
                                            if (esFacturaIndependiente(f)) {
                                                tipos.independiente++;
                                            } else {
                                                tipos.proyecto++;
                                            }
                                        });
                                        return `Independientes: ${tipos.independiente} | Proyecto: ${tipos.proyecto}`;
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
                                            <h4 style={{ margin: '0 0 10px 0' }}>Resumen Financiero Automático</h4>
                                            <div className="resumen-grid">
                                                <div className="resumen-item"><p className="resumen-label">Subtotal</p><p className="resumen-value">${(proyectoSeleccionado.presupuestoTotal || 0).toLocaleString()}</p></div>
                                                <div className="resumen-item"><p className="resumen-label">IVA (19%)</p><p className="resumen-value">${((proyectoSeleccionado.presupuestoTotal || 0) * 0.19).toLocaleString()}</p></div>
                                                <div className="resumen-item"><p className="resumen-label">Retención (2%)</p><p className="resumen-value">${((proyectoSeleccionado.presupuestoTotal || 0) * 0.02).toLocaleString()}</p></div>
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
                                    <p className="modal-subtitle">Roles autorizados: Administrador, Supervisor, Contador</p>
                                </div>
                                <button onClick={() => setShowModalIndependiente(false)} className="btn-link">✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="alert-emisor">
                                    <strong>Emisor:</strong> Neoconstrucciones Integrales SAS | NIT: 901.421.096-1 |
                                    Dirección: Calle 11c No 80B - 70 | Cel: 3017223223 |
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
                                            <label>Método de Pago:</label>
                                            <select
                                                value={nuevaFacturaInd.metodoPago}
                                                onChange={(e) => setNuevaFacturaInd(prev => ({ ...prev, metodoPago: e.target.value }))}
                                            >
                                                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Campos IVA y Retención Configurables */}
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>IVA (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={nuevaFacturaInd.ivaPorcentaje}
                                                onChange={(e) => setNuevaFacturaInd(prev => ({ 
                                                    ...prev, 
                                                    ivaPorcentaje: Number(e.target.value) 
                                                }))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Retención (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={nuevaFacturaInd.retencionPorcentaje}
                                                onChange={(e) => setNuevaFacturaInd(prev => ({ 
                                                    ...prev, 
                                                    retencionPorcentaje: Number(e.target.value) 
                                                }))}
                                            />
                                        </div>
                                    </div>

                                    <h4 className="modal-section-title" style={{ marginTop: '20px' }}>Servicios</h4>
                                    <div className="modal-table-container">
                                        <table className="modal-table">
                                            <thead>
                                                <tr>
                                                    <th>Servicio</th>
                                                    <th>Descripción</th>
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
    {/* SELECT DE SERVICIOS */}
    <select
        value={item.idServicio || ""}
        onChange={(e) => {
            const idSeleccionado = e.target.value;
            
            if (idSeleccionado === "manual") {
                modificarItemInd(index, 'idServicio', '');
                modificarItemInd(index, 'nombreServicio', '');
                modificarItemInd(index, 'descripcion', '');
                modificarItemInd(index, 'precioUnitario', 0);
                modificarItemInd(index, 'unidad', 'und');
            } else {
                // Caso: Seleccionó un servicio del catálogo
                const servicioEncontrado = catalogoServicios.find(s => s.idServicio === idSeleccionado);
                
                if (servicioEncontrado) {
                    modificarItemInd(index, 'idServicio', servicioEncontrado.idServicio);
                    modificarItemInd(index, 'nombreServicio', servicioEncontrado.nombreServicio);
                    modificarItemInd(index, 'descripcion', servicioEncontrado.descripcion || ''); 
                    modificarItemInd(index, 'precioUnitario', servicioEncontrado.precioUnitario || 0);
                    modificarItemInd(index, 'unidad', servicioEncontrado.unidad || 'und');
                    
                    // Calculamos el subtotal automáticamente
                    const cantidadActual = Number(item.cantidad) || 1;
                    modificarItemInd(index, 'subtotal', (servicioEncontrado.precioUnitario || 0) * cantidadActual);
                }
            }
        }}
        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ced4da' }}
    >
        {/* Opción por defecto */}
        <option value="">-- Seleccione un servicio --</option>
        
        {/* Opción para escribir manualmente */}
        <option value="manual">✏️ Escribir servicio manual...</option>
        
        {/* ✅ AQUÍ ESTÁ LA MAGIA: El catálogo de servicios (SIN precios) */}
        {catalogoServicios.map(s => (
            <option key={s.idServicio} value={s.idServicio}>
                {s.nombre}
            </option>
        ))}
    </select>

    {/* INPUT MANUAL (Solo se muestra si idServicio está vacío) */}
    {!item.idServicio && (
        <input
            type="text"
            placeholder="Ingrese nombre del servicio..."
            value={item.nombreServicio || ""}
            onChange={(e) => modificarItemInd(index, 'nombreServicio', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ced4da', marginTop: '6px' }}
        />
    )}
</td>
                                                        <td>
                                                            <input
                                                                value={item.descripcion}
                                                                placeholder="Descripción"
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
                                                                step="0.01"
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
                                            <div className="resumen-item"><p className="resumen-label">Subtotal</p><p className="resumen-value">${totalesInd.subtotal.toLocaleString()}</p></div>
                                            <div className="resumen-item"><p className="resumen-label">IVA ({totalesInd.ivaPorcentaje}%)</p><p className="resumen-value">${totalesInd.iva.toLocaleString()}</p></div>
                                            <div className="resumen-item"><p className="resumen-label">Retención ({totalesInd.retencionPorcentaje}%)</p><p className="resumen-value">${totalesInd.retencion.toLocaleString()}</p></div>
                                            <div className="resumen-item"><p className="resumen-label">Total con IVA</p><p className="resumen-value">${totalesInd.totalConIva.toLocaleString()}</p></div>
                                            <div className="resumen-item resumen-neto">
                                                <p className="resumen-label">NETO A COBRAR</p>
                                                <p className="resumen-value">${totalesInd.netoACobrar.toLocaleString()}</p>
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
                                    {esFacturaIndependiente(facturaDetalle) && (
                                        <span className="tipo-badge tipo-independiente" style={{ fontSize: '0.75rem', marginLeft: '8px' }}>
                                            Independiente
                                        </span>
                                    )}
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
                                    Dirección: {facturaDetalle?.datosEmisor?.direccion || 'Calle 11c No. 80B-70'} |
                                    Cel: {facturaDetalle?.datosEmisor?.celular || '3017223223'} |
                                    Correo: {facturaDetalle?.datosEmisor?.correoElectronico || 'neoconstruccionesintegrales@gmail.com'}
                                </div>

                                <div className="resumen-card" style={{ background: '#f8f9fa', borderColor: '#dee2e6' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Datos del Cliente</h4>
                                    <div className="resumen-grid">
                                        <div className="resumen-item"><p className="resumen-label">Empresa</p><p className="resumen-value">{facturaDetalle?.nombreEmpresa || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Sede</p><p className="resumen-value">{facturaDetalle?.nombreSede || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Dirección</p><p className="resumen-value">{facturaDetalle?.direccionSede || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">NIT</p><p className="resumen-value">{facturaDetalle?.nitCliente || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Contacto</p><p className="resumen-value">{facturaDetalle?.contactoCliente || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Proyecto</p><p className="resumen-value">{facturaDetalle?.nombreProyecto || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Método de Pago</p><p className="resumen-value">{facturaDetalle?.metodoPago || 'No disponible'}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Correo</p><p className="resumen-value">{facturaDetalle?.correoCliente || 'No disponible'}</p></div>
                                    </div>
                                </div>

                                <h4 className="modal-section-title">Servicios Facturados</h4>
                                <div className="modal-table-container">
                                    <table className="modal-table">
                                        <thead>
                                            <tr>
                                                <th>Servicio</th>
                                                <th>Descripción</th>
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
                                        <div className="resumen-item"><p className="resumen-label">Retención ({facturaDetalle?.retencionPorcentaje || 2}%)</p><p className="resumen-value">${(facturaDetalle?.retencion || 0).toLocaleString()}</p></div>
                                        <div className="resumen-item"><p className="resumen-label">Total Factura</p><p className="resumen-value">${(facturaDetalle?.totalConIva || 0).toLocaleString()}</p></div>
                                        <div className="resumen-item resumen-neto">
                                            <p className="resumen-label">VALOR NETO A PAGAR</p>
                                            <p className="resumen-value">${(facturaDetalle?.netoACobrar || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                {esFacturaIndependiente(facturaDetalle) ? (
                                    // Estados simplificados para facturas independientes
                                    <>
                                        {facturaDetalle?.estado === 'Emitida' && (
                                            <button onClick={() => { cambiarEstadoFactura(facturaDetalle?.idFactura, 'Pagada'); }} className="btn-success">
                                                Marcar Pagada
                                            </button>
                                        )}
                                        {facturaDetalle?.estado !== 'Pagada' && facturaDetalle?.estado !== 'Anulada' && (
                                            <button onClick={() => { cambiarEstadoFactura(facturaDetalle?.idFactura, 'Anulada'); }} className="btn-secondary">
                                                Anular
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    // Estados para facturas de proyecto
                                    <>
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
                                        {facturaDetalle?.estado !== 'Pagada' && facturaDetalle?.estado !== 'Anulada' && (
                                            <button onClick={() => { cambiarEstadoFactura(facturaDetalle?.idFactura, 'Anulada'); }} className="btn-secondary">
                                                Anular
                                            </button>
                                        )}
                                    </>
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