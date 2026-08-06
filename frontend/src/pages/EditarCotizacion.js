import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generarPDFCotizacion } from '../utils/generarPDFCotizacion'; 
import { toBase64 } from '../utils/toBase64';
import logo from '../imagenes/logo.png';
import axios from '../utils/axiosConfig';
import '../style/cotizacion.css';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;

const EditarCotizacion = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Estados
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [cotizacion, setCotizacion] = useState(null);
    const [cotizacionOriginal, setCotizacionOriginal] = useState(null);
    const [cliente, setCliente] = useState(null);
    const [sedeInfo, setSedeInfo] = useState(null);
    const [servicios, setServicios] = useState([]);
    const [items, setItems] = useState([]);
    const [itemsOriginal, setItemsOriginal] = useState([]);
    const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
    const [notasLegales, setNotasLegales] = useState('');
    const [notasLegalesOriginal, setNotasLegalesOriginal] = useState('');
    const [hayCambios, setHayCambios] = useState(false);
    const [mostrarDialogoEstado, setMostrarDialogoEstado] = useState(false);
    const [mensajeDialogo, setMensajeDialogo] = useState('');
    const [estadoPendiente, setEstadoPendiente] = useState('');
    const [generandoPDF, setGenerandoPDF] = useState(false);

    // Detectar cambios
    useEffect(function () {
        if (!cotizacionOriginal) return;
        var cambioItems = JSON.stringify(items) !== JSON.stringify(itemsOriginal);
        var cambioNotas = notasLegales !== notasLegalesOriginal;
        var cambioEstado = estadoSeleccionado !== cotizacionOriginal.estado_general;
        setHayCambios(cambioItems || cambioNotas || cambioEstado);
    }, [items, notasLegales, estadoSeleccionado, itemsOriginal, notasLegalesOriginal, cotizacionOriginal]);

    var cargarDatos = useCallback(async function () {
        setCargando(true);
        try {
            var resCot = await axios.get(API_URL + '/cotizaciones/' + id);
            var dataCot = resCot.data;
            var cotData = dataCot.data || dataCot;

            setCotizacion(cotData);
            setCotizacionOriginal(JSON.parse(JSON.stringify(cotData)));
            setItems(cotData.items || []);
            setItemsOriginal(JSON.parse(JSON.stringify(cotData.items || [])));
            setNotasLegales(cotData.notasLegales || '');
            setNotasLegalesOriginal(cotData.notasLegales || '');
            setEstadoSeleccionado(cotData.estado_general || 'Pendiente');

            if (cotData.clienteDetalle) {
                setCliente(cotData.clienteDetalle);
            }
            if (cotData.sedeDetalle) {
                setSedeInfo(cotData.sedeDetalle);
            }

            var resServ = await axios.get(API_URL + '/servicios');
            setServicios(resServ.data.data || []);

        } catch (error) {
            console.error('Error cargando cotizacion:', error);
            if (error.response && error.response.status === 401) {
                window.location.href = '/login';
                return;
            }
            alert('Error al cargar la cotizacion: ' + (error.response?.data?.error || error.message));
        } finally {
            setCargando(false);
        }
    }, [id]);

    useEffect(function () {
        cargarDatos();
    }, [id, cargarDatos]);

    
// Detectar rol del usuario desde localStorage o default
    const userRol = localStorage.getItem('rol') || 'ADMIN';
    // ============================================
    // LOGICA DE ESTADO
    // ============================================
    var handleCambioEstado = function (nuevoEstado) {
        if (nuevoEstado === cotizacionOriginal.estado_general) {
            setEstadoSeleccionado(nuevoEstado);
            return;
        }

        if (nuevoEstado === 'Aprobada') {
            var tipos = ['1. Anticipo 40% + Final 60%', '2. Pago Único (100%)', '3. Por Etapas (40%+30%+30%)', '4. Por Etapas (40%+20%+20%+20%)'];
            var tipoSeleccionado = window.prompt(
                'Seleccione tipo de facturación:\n' + tipos.join('\n') + '\n\nIngrese el número:'
            );

            if (tipoSeleccionado === null) {
                setEstadoSeleccionado(cotizacionOriginal.estado_general);
                return;
            }

            var tipoPago;
            switch(tipoSeleccionado) {
                case '2': tipoPago = 'unico'; break;
                case '3': tipoPago = 'por_etapas'; break;
                case '4': tipoPago = 'personalizado'; break;
                default: tipoPago = 'anticipo_final';
            }

            var metodos = ['1. Transferencia Bancaria', '2. Efectivo', '3. Cheque Corporativo', '4. Pasarela de pago Online', '5. Tarjeta de credito/debito'];
            var metodoSeleccionado = window.prompt(
                'Seleccione método de pago:\n' + metodos.join('\n') + '\n\nIngrese el número:'
            );

            if (metodoSeleccionado === null) {
                setEstadoSeleccionado(cotizacionOriginal.estado_general);
                return;
            }

            var metodoPago;
            switch(metodoSeleccionado) {
                case '2': metodoPago = 'Efectivo'; break;
                case '3': metodoPago = 'Cheque Corporativo'; break;
                case '4': metodoPago = 'Pasarela de pago Online'; break;
                case '5': metodoPago = 'Tarjeta de credito/debito'; break;
                default: metodoPago = 'Transferencia Bancaria';
            }

            if (!window.confirm('¿Está seguro de aprobar esta cotización? Se creará un proyecto automáticamente.')) {
                setEstadoSeleccionado(cotizacionOriginal.estado_general);
                return;
            }

            setCotizacion(function (prev) {
                return Object.assign({}, prev, {
                    tipoPago: tipoPago,
                    metodoPago: metodoPago
                });
            });

            setEstadoSeleccionado('Aprobada');
            setEstadoPendiente('Aprobada');
            setMensajeDialogo('Su cotizacion ha quedado en estado Aprobada. ¿Desea generar mas cambios en su cotizacion?');
            setMostrarDialogoEstado(true);

        } else if (nuevoEstado === 'Rechazada') {
            if (!window.confirm('¿Esta seguro de rechazar esta cotizacion? Recuerde que esta se archivara.')) {
                setEstadoSeleccionado(cotizacionOriginal.estado_general);
                return;
            }
            setEstadoSeleccionado('Rechazada');
            setEstadoPendiente('Rechazada');
            setMensajeDialogo('Su cotizacion ha quedado en estado Rechazada. ¿Desea generar mas cambios en su cotizacion?');
            setMostrarDialogoEstado(true);
        } else {
            setEstadoSeleccionado(nuevoEstado);
        }
    };

    var handleDialogoSi = function () {
        setMostrarDialogoEstado(false);
    };

    var handleDialogoNo = function () {
        setMostrarDialogoEstado(false);
        guardarSoloEstado(estadoPendiente);
    };

    var guardarSoloEstado = async function (estado) {
        setGuardando(true);
        try {
            var endpoint = estado === 'Aprobada' ? '/aprobar' : estado === 'Rechazada' ? '/rechazar' : '/estado';

            var payload = { estado_general: estado };

            if (estado === 'Aprobada' && cotizacion.tipoPago && cotizacion.metodoPago) {
                payload.metodoPago = cotizacion.metodoPago;
                payload.tipoPago = cotizacion.tipoPago;
            }

            var res = await axios.put(API_URL + '/cotizaciones/' + id + endpoint, payload);

            if (res.data.success) {
                var mensaje = estado === 'Aprobada' && res.data.proyecto
                    ? 'Cotizacion aprobada. Proyecto: ' + res.data.proyecto.idProyecto
                    : 'Estado actualizado a ' + estado;
                alert(mensaje);
                navigate('/gestion-cotizaciones');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setGuardando(false);
        }
    };

    // ============================================
    // LOGICA DE SERVICIOS
    // ============================================
    var agregarDesdeCatalogo = function (servicio) {
        var nuevoItem = {
            id: Date.now(),
            idServicio: servicio.idServicio || '',
            nombreServicio: servicio.nombre || servicio.nombreServicio || '',
            precioUnitario: Number(servicio.precioUnitario) || 0,
            cantidad: 1,
            subtotal: Number(servicio.precioUnitario) || 0
        };
        setItems(function (prev) { return [...prev, nuevoItem]; });
    };

    var agregarFilaManual = function () {
        setItems(function (prev) {
            return [...prev, {
                id: Date.now(),
                nombreServicio: '',
                precioUnitario: 0,
                cantidad: 1,
                subtotal: 0
            }];
        });
    };

    var modificarItem = function (index, campo, valor) {
        setItems(function (prev) {
            var nuevos = [...prev];
            nuevos[index][campo] = valor;
            if (campo === 'precioUnitario' || campo === 'cantidad') {
                nuevos[index].subtotal = Number(nuevos[index].precioUnitario) * Number(nuevos[index].cantidad);
            }
            return nuevos;
        });
    };

    var eliminarItem = function (index) {
        setItems(function (prev) { return prev.filter(function (_, i) { return i !== index; }); });
    };

    // ============================================
    // CALCULOS
    // ============================================
    var subtotalGeneral = items.reduce(function (acc, item) { return acc + (Number(item.subtotal) || 0); }, 0);
    var iva = subtotalGeneral * 0.19;
    var totalGeneral = subtotalGeneral + iva;
    var anticipo = totalGeneral * 0.40;

    // ============================================
    // GUARDAR
    // ============================================
    var handleGuardar = async function () {
        if (!hayCambios) {
            alert('No hay cambios para guardar.');
            return;
        }

        var cambioEnServicios = JSON.stringify(items) !== JSON.stringify(itemsOriginal);
        var cambioEnNotas = notasLegales !== notasLegalesOriginal;
        var cambioEnEstado = estadoSeleccionado !== cotizacionOriginal.estado_general;

        if (cambioEnEstado && (cambioEnServicios || cambioEnNotas)) {
            if (!window.confirm('Ha modificado el estado y los servicios. Se creara una nueva version de la cotizacion con el nuevo estado. ¿Desea continuar?')) {
                return;
            }
        }

        setGuardando(true);
        try {
            if (cambioEnServicios) {
                var payloadVersion = {
                    items: items,
                    subtotal: subtotalGeneral,
                    iva: iva,
                    total: totalGeneral,
                    anticipo: anticipo,
                    notasLegales: notasLegales,
                    estado_general: estadoSeleccionado,
                    idCotizacionBase: cotizacionOriginal.idCotizacion,
                    idAnterior: cotizacionOriginal.idCotizacion,
                    idCliente: cotizacionOriginal.idCliente,
                    idSede: cotizacionOriginal.idSede,
                    nombreEmp: cotizacionOriginal.nombreEmp,
                    version_id: (cotizacionOriginal.version_id || 1),
                    fechaVencimiento: cotizacionOriginal.fechaVencimiento
                };

                var res = await axios.post(API_URL + '/cotizaciones', payloadVersion);
                if (res.data.success || res.data.data) {
                    var nuevaVersion = res.data.data.idCotizacion;
                    alert('Nueva version creada: ' + nuevaVersion + '\nLa version anterior ha quedado como Superada.');
                    navigate('/gestion-cotizaciones');
                }
            } else if (cambioEnEstado || cambioEnNotas) {
                var resEstado = await axios.put(API_URL + '/cotizaciones/' + id + '/estado', {
                    estado_general: estadoSeleccionado,
                    notasLegales: notasLegales
                });

                if (resEstado.data.success) {
                    if (estadoSeleccionado === 'Aprobada' && resEstado.data.proyecto) {
                        alert('Cotizacion aprobada. Proyecto creado: ' + resEstado.data.proyecto.idProyecto);
                    } else {
                        alert('Cotizacion actualizada correctamente.');
                    }
                    navigate('/gestion-cotizaciones');
                }
            }
        } catch (error) {
            console.error('Error al guardar:', error);
            var mensajeError = error.response?.data?.error || error.response?.data?.details || error.message;
            alert('Error al guardar: ' + (typeof mensajeError === 'object' ? JSON.stringify(mensajeError) : mensajeError));
        } finally {
            setGuardando(false);
        }
    };

    // ============================================
    // DESHACER CAMBIOS
    // ============================================
    var handleDeshacer = function () {
        if (!window.confirm('¿Esta seguro de deshacer todos los cambios? Se perderan las modificaciones realizadas.')) {
            return;
        }
        setItems(JSON.parse(JSON.stringify(itemsOriginal)));
        setNotasLegales(notasLegalesOriginal);
        setEstadoSeleccionado(cotizacionOriginal.estado_general);
    };

    // ============================================================
    // DESCARGAR PDF (jsPDF)
    // ============================================================
     const descargarPDFCotizacion = async () => {
        if (!cotizacion) return;
        
        setGenerandoPDF(true);

        // Declaramos las variables afuera para que estén disponibles en el catch
        let datosCotizacion = {};
        let datosCliente = {};

        try {
            // 1. Obtener el logo en Base64
            const logoBase64 = await toBase64(logo);

            // 2. Construir el objeto de datos para la cotización
            datosCliente = {
                nombreEmp: cliente?.nombreEmp || 'N/A',
                nit: cliente?.nit || 'N/A',
                nombreSede: sedeInfo?.sede || sedeInfo?.nombreSede || 'Principal',
                direccion: sedeInfo?.direccion || cliente?.direccion || 'N/A',
                contacto: sedeInfo?.contacto || cliente?.telefono || cliente?.celular || 'N/A',
                correo: sedeInfo?.correo || cliente?.correo || 'N/A'
            };

            // 3. Construir el objeto de cotizacion
            datosCotizacion = {
                idCotizacion: cotizacion.idCotizacion,
                estado_general: estadoSeleccionado || cotizacion.estado_general,
                fechaEmision: cotizacion.fecha || cotizacion.createdAt,
                fechaVencimiento: cotizacion.fechaVencimiento,
                metodoPago: cotizacion.metodoPago,
                notasLegales: notasLegales
            };

            // 4. Generar el PDF pasándole todo
            await generarPDFCotizacion(datosCotizacion, datosCliente, items, logoBase64);

        } catch (e) {
            alert('Error generando PDF: ' + e.message);
            console.error(e);
            // Fallback: Si falla el logo o algo más, intenta generar sin el logo
            try {
                await generarPDFCotizacion(datosCotizacion, datosCliente, items, null);
            } catch (fallbackError) {
                console.error("Error incluso en el fallback:", fallbackError);
            }
        } finally {
            setGenerandoPDF(false);
        }
    };
    // ============================================
    // RENDER
    // ============================================
    if (cargando) {
        return (
            <div className="dba-container">
                <div className="loading-container">
                    <h3>Cargando cotizacion...</h3>
                </div>
            </div>
        );
    }

    if (!cotizacion) {
        return (
            <div className="dba-container">
                <div className="dba-wrapper">
                    <div className="text-center p-60">
                        <h3>No se encontro la cotizacion</h3>
                        <button className="btn-volver mt-3" onClick={function () { navigate('/gestion-cotizaciones'); }}>
                            Volver a Gestion
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    var datosClienteDisplay = {};
    if (cliente) {
        datosClienteDisplay = {
            empresa: cliente.nombreEmp || 'N/A',
            nit: cliente.nit || 'N/A',
            direccion: cliente.direccion || 'N/A',
            contacto: cliente.telefono || cliente.celular || 'N/A',
            correo: cliente.correo || 'N/A'
        };
    }
    if (sedeInfo) {
        datosClienteDisplay = {
            empresa: sedeInfo.empresa || datosClienteDisplay.empresa || 'N/A',
            sede: sedeInfo.sede || sedeInfo.nombreSede || 'Principal',
            nit: sedeInfo.nit || datosClienteDisplay.nit || 'N/A',
            direccion: sedeInfo.direccion || datosClienteDisplay.direccion || 'N/A',
            contacto: sedeInfo.contacto || datosClienteDisplay.contacto || 'N/A',
            correo: sedeInfo.correo || datosClienteDisplay.correo || 'N/A'
        };
    }

      // Esto es lo ÚNICO que cambias:
    var esSoloLectura = cotizacionOriginal.estado_general === 'Superada' || 
                         cotizacionOriginal.estado_general === 'Caducada' || 
                         cotizacionOriginal.estado_general === 'Rechazada';

    // Esto lo dejas exactamente igual que antes:
    var estadoClass = estadoSeleccionado === 'Pendiente' ? 'estado-pendiente' :
                      estadoSeleccionado === 'Aprobada' ? 'estado-aprobada' :
                      estadoSeleccionado === 'Rechazada' ? 'estado-rechazada' :
                      estadoSeleccionado === 'Superada' ? 'estado-superada' :
                      estadoSeleccionado === 'Caducada' ? 'estado-caducada' : '';

    return (
        <div className="dba-container">
            <div className="dba-wrapper">
                {/* Header */}
                <div className="editor-header">
                    <h2>
                        {esSoloLectura ? 'Ver Cotizacion' : 'Editar Cotizacion'}
                        <p className="dba-subtitle">
                        Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                        </p>
                        <span className="version-tag">
                            {cotizacion.idCotizacion} (v{cotizacion.version_id || 1})
                        </span>
                    </h2>
                    <div className="editor-header-actions">
                        <button className="btn-volver" onClick={function () { navigate('/gestion-cotizaciones'); }}>
                            ← Volver
                        </button>
                    </div>
                </div>

                {/* ESTADO */}
                <div className="estado-section">
                    <h3>Estado de la Cotizacion</h3>
                    <div className="estado-row">
                        <span className="estado-label">Estado Actual:</span>
                        {esSoloLectura ? (
                            <span className={`estado-badge ${estadoClass}`}>
                                {cotizacionOriginal.estado_general} (Solo lectura)
                            </span>
                        ) : (
                            <div className="form-group mb-0">
                                <select
                                    value={estadoSeleccionado}
                                    onChange={function (e) { handleCambioEstado(e.target.value); }}
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Aprobada">Aprobada</option>
                                    <option value="Rechazada">Rechazada</option>
                                </select>
                            </div>
                        )}
                        <span className="estado-vencimiento">
                            Vencimiento: {cotizacion.fechaVencimiento ? new Date(cotizacion.fechaVencimiento).toLocaleDateString() : 'N/A'}
                        </span>
                     <button 
    className="btn-pdf" 
    onClick={descargarPDFCotizacion} 
    disabled={generandoPDF} // Desactiva el botón mientras se genera
>
    {generandoPDF ? '⏳ Generando...' : '📄 Descargar PDF'}
</button>
                    </div>
                </div>

                {/* DATOS DEL CLIENTE */}
                <div className="datos-cliente-readonly">
                    <h3>Datos del Cliente</h3>
                    <div className="grid-datos">
                        <div><strong>Empresa:</strong> {datosClienteDisplay.empresa}</div>
                        <div><strong>Sede:</strong> {datosClienteDisplay.sede || 'Principal'}</div>
                        <div><strong>NIT:</strong> {datosClienteDisplay.nit}</div>
                        <div><strong>Direccion:</strong> {datosClienteDisplay.direccion}</div>
                        <div><strong>Contacto:</strong> {datosClienteDisplay.contacto}</div>
                        <div><strong>Correo electrónico:</strong> {datosClienteDisplay.correo}</div>
                    </div>
                </div>

                {/* SERVICIOS */}
                <div className="seccion-servicios">
                    <h3 className="seccion-titulo">Servicios Cotizados</h3>

                    {!esSoloLectura && (
                        <div className="catalogo-servicios mb-2">
                            {servicios.map(function (s) {
                                return (
                                    <button
                                        key={s.idServicio}
                                        className="btn-servicio"
                                        onClick={function () { agregarDesdeCatalogo(s); }}
                                    >
                                        + {s.nombre}
                                    </button>
                                );
                            })}
                            <button className="btn-manual" onClick={agregarFilaManual}>
                                + Servicio Manual
                            </button>
                        </div>
                    )}

                    <div className="table-container">
                        <table className="tabla-cotizacion">
                            <thead>
                                <tr>
                                    <th>Servicio</th>
                                    <th className="text-right">Precio Unit.</th>
                                    <th className="text-center">Cant.</th>
                                    <th className="text-right">Subtotal</th>
                                    {!esSoloLectura && <th className="text-center">Acc.</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(function (item, index) {
                                    return (
                                        <tr key={item.id || index}>
                                            <td data-label="Servicio">
                                                <input
                                                    value={item.nombreServicio || ''}
                                                    onChange={function (e) { modificarItem(index, 'nombreServicio', e.target.value); }}
                                                    disabled={esSoloLectura}
                                                />
                                            </td>
                                            <td data-label="Precio Unit." className="text-right">
                                                <input
                                                    type="number"
                                                    className="input-number"
                                                    value={item.precioUnitario || 0}
                                                    onChange={function (e) { modificarItem(index, 'precioUnitario', Number(e.target.value)); }}
                                                    disabled={esSoloLectura}
                                                />
                                            </td>
                                            <td data-label="Cant." className="text-center">
                                                <input
                                                    type="number"
                                                    className="input-number"
                                                    value={item.cantidad || 1}
                                                    onChange={function (e) { modificarItem(index, 'cantidad', Number(e.target.value)); }}
                                                    disabled={esSoloLectura}
                                                />
                                            </td>
                                            <td data-label="Subtotal" className="text-right text-mono">
                                                ${(Number(item.subtotal) || 0).toLocaleString()}
                                            </td>
                                            {!esSoloLectura && (
                                                <td data-label="Acc." className="text-center">
                                                    <button className="btn-del" onClick={function () { eliminarItem(index); }}>
                                                        🗑️ Eliminar
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={esSoloLectura ? 4 : 5} className="text-center text-gray no-results">
                                            No hay servicios agregados
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totales */}
                    <div className="resumen-final text-right">
                        <p><strong>Subtotal:</strong> <span className="text-mono">${subtotalGeneral.toLocaleString()}</span></p>
                        <p><strong>IVA (19%):</strong> <span className="text-mono">${iva.toLocaleString()}</span></p>
                        <p><strong>Anticipo Requerido (40%):</strong> <span className="text-mono">${anticipo.toLocaleString()}</span></p>
                        <h3>Total: <span className="text-mono">${totalGeneral.toLocaleString()}</span></h3>
                    </div>
                </div>

                {/* NOTAS LEGALES */}
                <div className="seccion-nota-legal">
                    <h3 className="seccion-titulo">Notas Legales</h3>
                    <textarea
                        className="textarea-nota"
                        value={notasLegales}
                        onChange={function (e) { setNotasLegales(e.target.value); }}
                        disabled={esSoloLectura}
                        rows="4"
                    />
                </div>

                {/* BOTONES DE ACCION */}
                {!esSoloLectura && (
                    <div className="acciones-footer">
                        <button
                            className="btn-guardar"
                            onClick={handleGuardar}
                            disabled={!hayCambios || guardando}
                        >
                            {guardando ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        <button
                            className="btn-deshacer"
                            onClick={handleDeshacer}
                            disabled={!hayCambios}
                        >
                            Deshacer Cambios
                        </button>
                        <button
                            className="btn-cancelar"
                            onClick={function () { navigate('/gestion-cotizaciones'); }}
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                {esSoloLectura && (
                    <div className="banner-bloqueo">
                        Esta cotizacion esta en estado <strong>{cotizacionOriginal.estado_general}</strong> y no puede editarse.
                    </div>
                )}

                {/* DIALOGO DE CONFIRMACION DE ESTADO */}
                {mostrarDialogoEstado && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Confirmar Cambio de Estado</h3>
                            <p>{mensajeDialogo}</p>
                            <div className="modal-actions">
                                <button className="btn-guardar" onClick={handleDialogoSi}>
                                    Si, deseo hacer mas cambios
                                </button>
                                <button className="btn-volver" onClick={handleDialogoNo}>
                                    No, guardar y salir
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditarCotizacion;
