import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../style/GestionCotizaciones.css';

// ============================================================
// CONFIGURAR AXIOS PARA ENVIAR TOKEN
// ============================================================
axios.interceptors.request.use(function (config) {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
});

// ============================================================
// COMPONENTE PRINCIPAL — GestionCotizaciones
// ============================================================
const GestionCotizaciones = () => {
    const navigate = useNavigate();
    const [cotizaciones, setCotizaciones] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [filtroEstado, setFiltroEstado] = useState('Todas');
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(false);

    const userRol = localStorage.getItem('rol') || 'ADMIN';

    // ============================================================
    // CARGAR DATOS
    // ============================================================
    useEffect(function () {
        cargarDatos();
    }, []);

    const cargarDatos = useCallback(async function () {
    setCargando(true);
    try {
        const resCotizaciones = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cotizaciones`);
        const resClientes = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/clientes`);
        let cotizacionesData = Array.isArray(resCotizaciones.data)
            ? resCotizaciones.data
            : (resCotizaciones.data.data || []);

        cotizacionesData = cotizacionesData.filter(function (c) {
            return c.esCotizacionAdicional !== true && c.esAdicional !== true;
        });

        console.log('Cotizaciones cargadas:', cotizacionesData.length, 'Estados:', cotizacionesData.map(c => c.estado_general));
        setCotizaciones(cotizacionesData);
        setClientes(Array.isArray(resClientes.data) ? resClientes.data : (resClientes.data.data || []));
    } catch (error) {
        console.error('Error cargando datos:', error);
        if (error.response && error.response.status === 401) {
            window.location.href = '/login';
        }
    } finally {
        setCargando(false);
    }
}, []);

    // ============================================================
    // OBTENER INFO CLIENTE
    // ============================================================
    const obtenerInfoCliente = useCallback(function (c) {
        const cliente = clientes.find(function (client) {
            return client.idCliente === c.idCliente;
        });
        if (!cliente) return 'Cliente no encontrado';
        const nombreEmp = cliente.nombreEmp || 'Empresa';
        const idSedeBusqueda = String(c.idSede || '').toUpperCase();
        if (idSedeBusqueda.includes('PRINCIPAL')) return nombreEmp + ' - Principal';
        const sedeEncontrada = cliente.sedes ? cliente.sedes.find(function (s) {
            return s.id === c.idSede;
        }) : null;
        return sedeEncontrada ? nombreEmp + ' - ' + sedeEncontrada.nombreSede : nombreEmp + ' - Sede no encontrada';
    }, [clientes]);

    const obtenerDatosClienteCompleto = useCallback(function (c) {
        const cliente = clientes.find(function (client) {
            return client.idCliente === c.idCliente;
        });
        if (!cliente) return null;
        const idSedeBusqueda = String(c.idSede || '').toUpperCase();
        const esPrincipal = idSedeBusqueda.includes('PRINCIPAL');
        let sedeData = null;
        if (!esPrincipal && cliente.sedes) {
            sedeData = cliente.sedes.find(function (s) { return s.id === c.idSede; });
        }
        return {
            nombreEmp: cliente.nombreEmp || '',
            nit: esPrincipal ? cliente.nit : (sedeData ? sedeData.nitEncargado : cliente.nit),
            direccion: esPrincipal ? cliente.direccion : (sedeData ? sedeData.direccion : cliente.direccion),
            contacto: esPrincipal ? (cliente.telefono || cliente.celular) : (sedeData ? sedeData.celular : (cliente.telefono || cliente.celular)),
            correo: esPrincipal ? cliente.correo : (sedeData ? sedeData.correoEnc : cliente.correo),
            nombreSede: esPrincipal ? 'Principal (Administrativa)' : (sedeData ? sedeData.nombreSede : 'Sede no encontrada')
        };
    }, [clientes]);

    // ============================================================
    // APROBAR COTIZACIÓN
    // ============================================================
    const aprobarCotizacion = useCallback(async function (cotizacion) {
        if (cotizacion.esCotizacionAdicional === true || cotizacion.esAdicional === true) {
            alert('Las cotizaciones adicionales deben aprobarse desde el modulo de Proyectos.');
            return;
        }

        const tipos = ['1. Anticipo 40% + Final 60%', '2. Pago Único (100%)', '3. Por Etapas (40%+30%+30%)', '4. Por Etapas (40%+20%+20%+20%)'];
        const tipoSeleccionado = window.prompt(
            'Seleccione tipo de facturacion:' + tipos.join('') + 'Ingrese el numero:');
        let tipoPago;
        switch (tipoSeleccionado) {
            case '2': tipoPago = 'unico'; break;
            case '3': tipoPago = 'por_etapas'; break;
            case '4': tipoPago = 'personalizado'; break;
            default: tipoPago = 'anticipo_final';
        }

        const metodos = ['1. Transferencia Bancaria', '2. Efectivo', '3. Cheque Corporativo', '4. Pasarela de pago Online', '5. Tarjeta de credito/debito'];
        const metodoSeleccionado = window.prompt('Seleccione metodo de pago:' + metodos.join('') + 'Ingrese el numero:');
        let metodoPago;
        switch (metodoSeleccionado) {
            case '2': metodoPago = 'Efectivo'; break;
            case '3': metodoPago = 'Cheque Corporativo'; break;
            case '4': metodoPago = 'Pasarela de pago Online'; break;
            case '5': metodoPago = 'Tarjeta de credito/debito'; break;
            default: metodoPago = 'Transferencia Bancaria';
        }

        if (!window.confirm('¿Esta seguro de aprobar esta cotizacion? Se creara un proyecto automaticamente.')) {
            return;
        }

        try {
            const res = await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cotizaciones/${cotizacion.idCotizacion}/aprobar`, {
            estado_general: 'Aprobada',
            metodoPago: metodoPago,
            tipoPago: tipoPago
        });

            if (res.data.success) {
                let mensaje = 'Cotizacion aprobada exitosamente.';
                if (res.data.proyecto) {
                    mensaje += 'Proyecto: ' + res.data.proyecto.idProyecto;
                }
                if (res.data.factura) {
                    mensaje += 'Factura: ' + res.data.factura.idFactura;
                }
                if (res.data.esCotizacionAdicional) {
                    mensaje += '(Nota: Cotizacion adicional - No se creo proyecto)';
                }
                alert(mensaje);
                cargarDatos();
            } else {
                alert('Error: ' + (res.data.error || 'No se pudo aprobar'));
            }
        } catch (error) {
            console.error('Error al aprobar:', error);
            if (error.response) {
                if (error.response.status === 401) {
                    window.location.href = '/login';
                } else {
                    const mensajeError = error.response.data.error || error.response.data.message || 'Error desconocido';
                    alert('Error al aprobar: ' + mensajeError);
                }
            } else {
                alert('Error de conexion al aprobar cotizacion');
            }
        }
    }, [cargarDatos]);

    // ============================================================
    // RECHAZAR COTIZACIÓN
    // ============================================================
    const rechazarCotizacion = useCallback(async function (idCotizacion) {
        if (!window.confirm('Esta seguro de rechazar esta cotizacion? Recuerde que esta se archivara.')) {
            return;
        }
        try {
            const res = await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cotizaciones/${idCotizacion}/rechazar`);
            if (res.data.success) {
                alert('Cotizacion rechazada y archivada correctamente.');
                cargarDatos();
            } else {
                alert('Error: ' + (res.data.error || 'No se pudo rechazar'));
            }
        } catch (error) {
            console.error('Error al rechazar:', error);
            if (error.response) {
                if (error.response.status === 401) {
                    window.location.href = '/login';
                } else {
                    const mensajeError = error.response.data.error || error.response.data.message || 'Error desconocido';
                    alert('Error al rechazar: ' + mensajeError);
                }
            } else {
                alert('Error de conexion al rechazar cotizacion');
            }
        }
    }, [cargarDatos]);

    // ============================================================
    // FILTROS
    // ============================================================
    const cotizacionesFiltradas = cotizaciones.filter(function (c) {
        const infoCliente = obtenerInfoCliente(c).toLowerCase();
        const coincideEstado = filtroEstado === 'Todas' || c.estado_general === filtroEstado;
        const coincideBusqueda = infoCliente.includes(busqueda.toLowerCase()) ||
            (c.idCotizacion || '').toLowerCase().includes(busqueda.toLowerCase());
        return coincideEstado && coincideBusqueda;
    });

    const colorEstado = useCallback(function (estado) {
        switch (estado) {
            case 'Pendiente': return '#fde68a';
            case 'Aprobada': return '#73CC80';
            case 'Rechazada': return '#F24F4F';
            case 'Caducada': return '#95a5a6';
            case 'Superada': return '#bfdbfe';
            default: return '#95a5a6';
        }
    }, []);

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="dba-container">
            <div className="dba-wrapper">
                {/* HEADER */}
                <div className="dba-header-text">
                    <h1 className="dba-title">📋 Gestión de Cotizaciones</h1>
                    <p className="dba-subtitle">
                        Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                    </p>
                </div>

                {/* HEADER ACCIONES */}
                <div className="header-acciones">
                    <button onClick={function () { navigate('/Cotizacion'); }} className="btn-crear">
                        + Crear Cotización
                    </button>
                </div>

                {/* FILTROS */}
                <div style={{ height: '20px' }}></div>
                <div className="filtro-container">
                    <input
                        type="text"
                        className="filtro-input"
                        placeholder="🔍 Buscar por empresa, sede o ID de cotización..."
                        value={busqueda}
                        onChange={function (e) { setBusqueda(e.target.value); }}
                    />
                    <select value={filtroEstado} onChange={function (e) { setFiltroEstado(e.target.value); }}>
                        <option value="Todas">Todas</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Aprobada">Aprobada</option>
                        <option value="Rechazada">Rechazada</option>
                        <option value="Caducada">Caducada</option>
                        <option value="Superada">Superada</option>
                    </select>
                    <button
                        onClick={function () { setBusqueda(''); setFiltroEstado('Todas'); }}
                        className="btn-limpiar"
                        title="Limpiar filtros"
                    >
                        🧹 Limpiar
                    </button>
                </div>

                {/* CARGANDO */}
                {cargando ? (
                    <div className="cargando">
                        Cargando cotizaciones...
                    </div>
                ) : (
                    <>
                        {/* TÍTULO LISTADO */}
                        <h2 className="dba-title" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)', textAlign: 'center', marginBottom: '20px', marginTop: '8px' }}>
                            Listado de Cotizaciones
                        </h2>

                        {/* TABLA */}
                        <div className="table-container">
                            <table className="tabla-cotizaciones">
                                <thead>
                                    <tr>
                                        <th>ID Cotización</th>
                                        <th>Empresa / Sede</th>
                                        <th className="text-right">Total</th>
                                        <th className="text-center">Estado</th>
                                        <th className="text-center">Fecha de Vencimiento</th>
                                        <th className="text-center">Versión</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cotizacionesFiltradas.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="sin-resultados">
                                                No se encontraron cotizaciones con los filtros aplicados.
                                            </td>
                                        </tr>
                                    )}
                                    {cotizacionesFiltradas.map(function (c, idx) {
                                        const datosCliente = obtenerDatosClienteCompleto(c);
                                        return (
                                            <tr key={c._id} className={idx % 2 === 0 ? "table-row-even" : "table-row-odd"}>
                                                {/* ID Cotización */}
                                                <td data-label="ID Cotización">
                                                    <strong className="font-size-13 text-dark">{c.idCotizacion}</strong>
                                                </td>

                                                {/* Empresa / Sede */}
                                                <td data-label="Empresa / Sede">
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {obtenerInfoCliente(c)}
                                                    </div>
                                                    {datosCliente && (
                                                        <div className="info-cliente">
                                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>NIT: {datosCliente.nit || 'N/A'}</div>
                                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Dirección: {datosCliente.direccion || 'N/A'}</div>
                                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Celular: {datosCliente.contacto || 'N/A'}</div>
                                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Correo electrónico: {datosCliente.correo || 'N/A'}</div>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Total */}
                                                <td data-label="Total" className="text-right text-mono font-bold">
                                                    ${c.total?.toLocaleString()}
                                                </td>

                                                {/* Estado */}
                                                <td data-label="Estado" className="text-center">
                                                    <span
                                                        className="estado-badge"
                                                        style={{ backgroundColor: colorEstado(c.estado_general) }}
                                                    >
                                                        {c.estado_general}
                                                    </span>
                                                </td>

                                                {/* Fecha Vencimiento */}
                                                <td data-label="Fecha de Vencimiento" className="text-center">
                                                    {c.fechaVencimiento ? new Date(c.fechaVencimiento).toLocaleDateString() : 'N/A'}
                                                </td>

                                                {/* Versión */}
                                                <td data-label="Versión" className="text-center">
                                                    {c.version_id || 1}
                                                </td>

                                                {/* Acciones */}
                                                <td data-label="Acciones" className="text-center">
                                                    <div className="acciones-flex">
                                                        {/* Editar */}
                                                        {c.estado_general !== 'Superada' && c.estado_general !== 'Aprobada' && (
                                                            <button
                                                                onClick={function () { navigate('/editar-cotizacion/' + c.idCotizacion); }}
                                                                className="btn-editar"
                                                                title="Editar cotización"
                                                            >
                                                                ✏️ Editar
                                                            </button>
                                                        )}

                                                        {/* Ver */}
                                                        {c.estado_general === 'Superada' && (
                                                            <button
                                                                onClick={function () { navigate('/editar-cotizacion/' + c.idCotizacion); }}
                                                                className="btn-ver"
                                                                title="Ver cotización (solo lectura)"
                                                            >
                                                                👁️ Ver
                                                            </button>
                                                        )}

                                                        {/* Aprobar */}
                                                        {c.estado_general === 'Pendiente' && c.esCotizacionAdicional !== true && (
                                                            <button
                                                                className="btn-aprobar"
                                                                onClick={function () { aprobarCotizacion(c); }}
                                                                title="Aprobar cotización y crear proyecto"
                                                            >
                                                                ✅ Aprobar
                                                            </button>
                                                        )}

                                                        {/* Rechazar */}
                                                        {c.estado_general === 'Pendiente' && (
                                                            <button
                                                                className="btn-rechazar"
                                                                onClick={function () { rechazarCotizacion(c.idCotizacion); }}
                                                                title="Rechazar y archivar cotización"
                                                            >
                                                                ❌ Rechazar
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Post-aprobación */}
                                                    {c.idProyecto && (
                                                        <div className="acciones-columna mt-2">
                                                            {/* Ver Factura */}
                                                            {c.estado_general !== 'Superada' && (
                                                                <button
                                                                    onClick={function () { navigate('/facturas?cotizacion=' + c.idCotizacion); }}
                                                                    className="btn-factura"
                                                                    title="Ver factura de anticipo"
                                                                >
                                                                    📄 Ver Factura
                                                                </button>
                                                            )}

                                                            {/* Ver Proyecto */}
                                                            {c.proyectoActivo === true && (
                                                                <button
                                                                    onClick={function () { navigate('/proyectos?proyecto=' + c.idProyecto); }}
                                                                    className="btn-proyecto"
                                                                    title="Ver proyecto activo"
                                                                >
                                                                    🏗️ Ver Proyecto
                                                                </button>
                                                            )}

                                                            {/* Pendiente */}
                                                            {c.proyectoActivo !== true && (
                                                                <span className="alerta-pendiente">
                                                                    ⏳ Proyecto pendiente de Pago Anticipado
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* RESUMEN */}
                        {!cargando && cotizacionesFiltradas.length > 0 && (
                            <div className="resumen">
                                <strong>Resumen:</strong> {cotizacionesFiltradas.length} cotización(es) |
                                Total acumulado: <span className="text-mono font-bold">${cotizacionesFiltradas.reduce(function (acc, c) { return acc + (c.total || 0); }, 0).toLocaleString()}</span>
                            </div>
                        )}
                    </>
                )}

                {/* Barra de Operaciones Inferior */}
                <div className="db-actions-group">
                    <button onClick={() => navigate('/admin')} className="btn-primary">⚙️ Inicio</button>
                </div>
            </div>
        </div>
    );
};

export default GestionCotizaciones;
