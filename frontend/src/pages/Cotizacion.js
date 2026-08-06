import React, { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axiosConfig';
import '../style/cotizacion.css';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;

// ============================================================
// HELPER: Sanitiza objetos eliminando referencias circulares
// ============================================================
const cleanPayload = (obj) => {
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                console.warn('⚠️ Referencia circular detectada y eliminada en:', key);
                return undefined;
            }
            seen.add(value);
        }
        return value;
    }));
};

function Cotizaciones() {
    const [clientes, setClientes] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [items, setItems] = useState([]);
    const [sedesDisponibles, setSedesDisponibles] = useState([]);
    const [cotizacion, setCotizacion] = useState({
        idCliente: '',
        idSede: '',
        estado_general: 'Pendiente',
        fechaVencimiento: '',
        notasLegales: 'Terminos: Pago a 15 días. No incluye IVA.',
        anticipo: '0',
        version_id: 1,
        creadoPor: 'Emp-003'
    });

    const [showModalAprobacion, setShowModalAprobacion] = useState(false);
    const [tipoFacturacion, setTipoFacturacion] = useState('anticipo_final');
    const [metodoPago, setMetodoPago] = useState('Transferencia Bancaria');
    const userRol = localStorage.getItem('rol') || 'ADMIN';
    const [guardando, setGuardando] = useState(false);

    useEffect(function () {
        const fetchData = async function () {
            try {
                const fechaVencimiento = new Date();
                fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
                const fechaFormateada = fechaVencimiento.toISOString().split('T')[0];

                const resClientes = await axios.get(`${API_URL}/clientes`);
                const resServicios = await axios.get(`${API_URL}/servicios`);

                const clientesUnicos = Array.from(new Map(resClientes.data.data.map(function (c) {
                    return [c.idCliente, c];
                })).values());

                setClientes(clientesUnicos);
                setServicios(resServicios.data.data || []);
                setCotizacion(function (prev) {
                    return Object.assign({}, prev, { fechaVencimiento: fechaFormateada });
                });
            } catch (error) {
                console.error('Error al cargar datos:', error);
                if (error.response && error.response.status === 401) {
                    window.location.href = '/login';
                }
            }
        };
        fetchData();
    }, []);

    useEffect(function () {
        if (cotizacion.idCliente) {
            const clienteEncontrado = clientes.find(function (c) {
                return c.idCliente === cotizacion.idCliente;
            });

            if (clienteEncontrado && clienteEncontrado.sedes && clienteEncontrado.sedes.length > 0) {
                const primeraSedeId = clienteEncontrado.sedes[0].id;
                setCotizacion(function (prev) {
                    return Object.assign({}, prev, { idSede: primeraSedeId });
                });
            }
        } else {
            setCotizacion(function (prev) {
                return Object.assign({}, prev, { idSede: '' });
            });
        }
    }, [cotizacion.idCliente, clientes]);

    const manejarCambioCliente = useCallback(function (idCliente) {
        const clienteEncontrado = clientes.find(function (c) {
            return c.idCliente === idCliente;
        });

        if (!clienteEncontrado) {
            setSedesDisponibles([]);
            setCotizacion(function (prev) {
                return Object.assign({}, prev, { idCliente: '', idSede: '' });
            });
            return;
        }

        const sedePrincipal = {
            id: clienteEncontrado.idCliente + '-PRINCIPAL',
            nombreSede: 'Sede Principal (Administrativa)'
        };

        const listaCompleta = [sedePrincipal].concat(clienteEncontrado.sedes || []);
        setSedesDisponibles(listaCompleta);

        setCotizacion(function (prev) {
            return Object.assign({}, prev, {
                idCliente: idCliente,
                idSede: sedePrincipal.id
            });
        });
    }, [clientes]);

    const obtenerInfoSede = useCallback(function () {
        const cliente = clientes.find(function (c) {
            return c.idCliente === cotizacion.idCliente;
        });
        if (!cliente) return null;

        if (cotizacion.idSede.endsWith('-PRINCIPAL')) {
            return {
                empresa: cliente.nombreEmp,
                sede: 'Principal (Administrativa)',
                nit: cliente.nit,
                direccion: cliente.direccion,
                contacto: cliente.telefono || cliente.celular,
                correo: cliente.correo
            };
        }

        const sedeReal = cliente.sedes ? cliente.sedes.find(function (s) {
            return s.id === cotizacion.idSede;
        }) : null;

        if (!sedeReal) return null;

        return {
            empresa: cliente.nombreEmp,
            sede: sedeReal.nombreSede,
            nit: cliente.nit,
            direccion: sedeReal.direccion,
            contacto: sedeReal.celular,
            correo: sedeReal.correoEnc
        };
    }, [clientes, cotizacion.idCliente, cotizacion.idSede]);

    const agregarDesdeCatalogo = useCallback((servicio) => {
        const nuevoItem = {
            id: Date.now(),
            nombreServicio: servicio.nombre,
            precioUnitario: Number(servicio.precioUnitario) || 0,
            cantidad: 1,
            subtotal: Number(servicio.precioUnitario) || 0
        };
        setItems(prev => [...prev, nuevoItem]);
    }, []);

    const agregarFilaManual = useCallback(() => {
        setItems(prev => [...prev, {
            id: Date.now(),
            nombreServicio: '',
            precioUnitario: 0,
            cantidad: 1,
            subtotal: 0
        }]);
    }, []);

    const modificarItem = useCallback((index, campo, valor) => {
        setItems(prev => {
            const nuevosItems = [...prev];
            nuevosItems[index][campo] = valor;
            if (campo === 'precioUnitario' || campo === 'cantidad') {
                nuevosItems[index].subtotal = Number(nuevosItems[index].precioUnitario) * Number(nuevosItems[index].cantidad);
            }
            return nuevosItems;
        });
    }, []);

    const eliminarItem = useCallback((index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const subtotalGeneral = items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
    const iva = subtotalGeneral * 0.19;
    const totalGeneral = subtotalGeneral + iva;
    const anticipo = totalGeneral * 0.40;

    // ============================================================
    // GUARDAR COTIZACIÓN
    // ============================================================
    const guardarCotizacion = useCallback(async (tipoPagoModal = null, metodoPagoModal = null) => {
        // ✅ FIX: Si React pasó el evento del clic como objeto, ignorarlo
        if (tipoPagoModal && typeof tipoPagoModal !== 'string') tipoPagoModal = null;
        if (metodoPagoModal && typeof metodoPagoModal !== 'string') metodoPagoModal = null;

        if (guardando) return;
        setGuardando(true);

        let sedeParaGuardar = cotizacion.idSede;

        if (!sedeParaGuardar && cotizacion.idCliente) {
            const clienteEncontrado = clientes.find(c => c.idCliente === cotizacion.idCliente);
            if (clienteEncontrado?.sedes?.length > 0) {
                sedeParaGuardar = clienteEncontrado.sedes[0].id;
            }
        }
        if (!sedeParaGuardar) {
            alert("Error: Por favor selecciona o verifica la sede del cliente.");
            setGuardando(false);
            return;
        }

        let estadoFinal = cotizacion.estado_general || 'Pendiente';
        if (tipoPagoModal) {
            estadoFinal = 'Aprobada';
        }

        if (estadoFinal === 'Aprobada' && items.length === 0) {
            alert('⚠️ No se puede aprobar una cotización sin servicios.');
            setGuardando(false);
            return;
        }

        const itemsPlanos = items.map(item => ({
            nombreServicio: String(item.nombreServicio || ''),
            precioUnitario: Number(item.precioUnitario) || 0,
            cantidad: Number(item.cantidad) || 0,
            subtotal: Number(item.subtotal) || 0
        }));

        const payloadBase = {
            idCliente: String(cotizacion.idCliente),
            idSede: String(sedeParaGuardar),
            estado_general: String(estadoFinal),
            fechaVencimiento: String(cotizacion.fechaVencimiento),
            notasLegales: String(cotizacion.notasLegales || ''),
            version_id: Number(cotizacion.version_id) || 1,
            creadoPor: String(cotizacion.creadoPor || 'Sistema'),
            items: itemsPlanos,
            subtotal: Number(subtotalGeneral),
            iva: Number(iva),
            total: Number(totalGeneral),
            anticipo: Number(anticipo)
        };

        if (estadoFinal === 'Aprobada') {
            const payloadCreacion = {
                idCliente: payloadBase.idCliente,
                idSede: payloadBase.idSede,
                estado_general: 'Pendiente',
                fechaVencimiento: payloadBase.fechaVencimiento,
                notasLegales: payloadBase.notasLegales,
                version_id: payloadBase.version_id,
                creadoPor: payloadBase.creadoPor,
                items: payloadBase.items,
                subtotal: payloadBase.subtotal,
                iva: payloadBase.iva,
                total: payloadBase.total,
                anticipo: payloadBase.anticipo,
                fechaCreacion: new Date().toISOString()
            };

            try {
                const resCreacion = await axios.post(
                    `${API_URL}/cotizaciones`,
                    cleanPayload(payloadCreacion)
                );
                const idNuevaCotizacion = resCreacion.data.data.idCotizacion;

                const metodoPagoFinal = metodoPagoModal || metodoPago || 'Transferencia Bancaria';
                const tipoPagoFinal = tipoPagoModal || tipoFacturacion || 'anticipo_final';

                const payloadAprobacion = {
                    estado_general: 'Aprobada',
                    metodoPago: metodoPagoFinal,
                    tipoPago: tipoPagoFinal
                };

                const resAprobacion = await axios.put(
                    `${API_URL}/cotizaciones/${idNuevaCotizacion}/aprobar`,
                    cleanPayload(payloadAprobacion)
                );

                let mensaje = `✅ Cotización aprobada exitosamente!\nID: ${idNuevaCotizacion}`;
                if (resAprobacion.data.proyecto) {
                    mensaje += `\n📋 Proyecto creado: ${resAprobacion.data.proyecto.idProyecto}`;
                }
                if (resAprobacion.data.factura) {
                    mensaje += `\n📄 Factura creada: ${resAprobacion.data.factura.idFactura}`;
                }
                alert(mensaje);
                setGuardando(false);
                window.location.reload();

            } catch (e) {
                console.error("Error al aprobar cotización:", e);
                let mensajeError = "Error de conexión con el servidor";
                if (e.response?.data) {
                    if (typeof e.response.data === 'string') {
                        mensajeError = e.response.data.substring(0, 200);
                    } else if (e.response.data.error) {
                        mensajeError = String(e.response.data.error).substring(0, 200);
                    } else if (e.response.data.message) {
                        mensajeError = String(e.response.data.message).substring(0, 200);
                    }
                } else if (e.message) {
                    mensajeError = e.message;
                }
                alert(`Error al aprobar:\n${mensajeError}`);
                setGuardando(false);
            }

        } else {
            const payload = {
                idCliente: payloadBase.idCliente,
                idSede: payloadBase.idSede,
                estado_general: payloadBase.estado_general,
                fechaVencimiento: payloadBase.fechaVencimiento,
                notasLegales: payloadBase.notasLegales,
                version_id: payloadBase.version_id,
                creadoPor: payloadBase.creadoPor,
                items: payloadBase.items,
                subtotal: payloadBase.subtotal,
                iva: payloadBase.iva,
                total: payloadBase.total,
                anticipo: payloadBase.anticipo,
                fechaCreacion: new Date().toISOString()
            };

            try {
                const res = await axios.post(
                    `${API_URL}/cotizaciones`,
                    cleanPayload(payload)
                );
                const idGenerado = res.data.data.idCotizacion;
                alert(`¡Cotización guardada exitosamente!\nID generado: ${idGenerado}`);
                setGuardando(false);
                window.location.reload();
            } catch (e) {
                console.error("Error completo:", e);
                let mensajeError = "Error de conexión con el servidor";
                if (e.response?.data) {
                    if (typeof e.response.data === 'string') {
                        mensajeError = e.response.data.substring(0, 200);
                    } else if (e.response.data.error) {
                        mensajeError = String(e.response.data.error).substring(0, 200);
                    } else if (e.response.data.message) {
                        mensajeError = String(e.response.data.message).substring(0, 200);
                    }
                } else if (e.message) {
                    mensajeError = e.message;
                }
                alert(`Error al guardar:\n${mensajeError}`);
                setGuardando(false);
            }
        }
    }, [cotizacion, clientes, items, subtotalGeneral, iva, totalGeneral, anticipo, tipoFacturacion, metodoPago, guardando]);

    const handleGuardarDesdeModal = useCallback(() => {
        setShowModalAprobacion(false);
        guardarCotizacion(tipoFacturacion, metodoPago);
    }, [guardarCotizacion, tipoFacturacion, metodoPago]);

    return (
        <div className="dba-container">
            <div className="dba-wrapper">
                <div className="dba-header-text">
                    <h1 className="dba-title">📝 Crear Nueva Cotización</h1>
                    <p className="dba-subtitle">
                        Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                    </p>
                </div>

                <div className="header-acciones">
                    <button onClick={() => window.location.href = '/gestion-cotizaciones'} className="btn-volver">
                        ← Volver
                    </button>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Cliente *</label>
                        <select value={cotizacion.idCliente} onChange={(e) => manejarCambioCliente(e.target.value)}>
                            <option value="">-- Seleccionar Cliente --</option>
                            {clientes.map(c => (<option key={c.idCliente} value={c.idCliente}>{c.nombreEmp}</option>))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Sede *</label>
                        <select value={cotizacion.idSede} onChange={(e) => setCotizacion({ ...cotizacion, idSede: e.target.value })}>
                            <option value="">-- Seleccione Sede --</option>
                            {sedesDisponibles.map(s => (<option key={s.id} value={s.id}>{s.nombreSede}</option>))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Estado de Cotización</label>
                        <select value={cotizacion.estado_general} onChange={(e) => {
                            const nuevoEstado = e.target.value;
                            if (nuevoEstado === 'Aprobada') {
                                if (!cotizacion.idCliente) {
                                    alert('⚠️ Debes seleccionar un cliente antes de aprobar la cotización.');
                                    return;
                                }
                                if (items.length === 0) {
                                    alert('⚠️ Debes agregar al menos un servicio antes de aprobar la cotización.');
                                    return;
                                }
                                setShowModalAprobacion(true);
                            } else {
                                setCotizacion({ ...cotizacion, estado_general: nuevoEstado });
                            }
                        }}>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Aprobada">Aprobada</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Fecha de Validez</label>
                        <input type="date" value={cotizacion.fechaVencimiento} onChange={(e) => setCotizacion({ ...cotizacion, fechaVencimiento: e.target.value })} />
                    </div>
                </div>

                <div className="info-resumen">
                    <p><strong>ID Cotización:</strong> {cotizacion.idCotizacion || "Generado al guardar"}</p>
                    <p><strong>Cliente:</strong> {cotizacion.idCliente} | <strong>Sede:</strong> {cotizacion.idSede}</p>
                </div>

                {cotizacion.idSede && obtenerInfoSede() && (
                    <div className="info-card">
                        <h4>📋 Datos del Cliente / Sede</h4>
                        <p><strong>Empresa:</strong> {obtenerInfoSede().empresa}</p>
                        <p><strong>Sede:</strong> {obtenerInfoSede().sede}</p>
                        <p><strong>NIT:</strong> {obtenerInfoSede().nit}</p>
                        <p><strong>Dirección:</strong> {obtenerInfoSede().direccion}</p>
                        <p><strong>Contacto:</strong> {obtenerInfoSede().contacto}</p>
                        <p><strong>Correo electrónico:</strong> {obtenerInfoSede().correo}</p>
                    </div>
                )}

                <div className="seccion-servicios">
                    <h3 className="seccion-titulo">Servicios:</h3>
                    <div className="catalogo-servicios">
                        {servicios.map(s => (<button key={s.idServicio} className="btn-servicio" onClick={() => agregarDesdeCatalogo(s)}>+ {s.nombre}</button>))}
                        <button className="btn-manual" onClick={agregarFilaManual}>+ Servicio Manual</button>
                    </div>
                </div>

                <div className="table-container">
                    <table className="tabla-cotizacion">
                        <thead>
                            <tr><th>Servicio</th><th>Precio Unit.</th><th>Cant</th><th>Subtotal</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id}>
                                    <td data-label="Servicio"><input value={item.nombreServicio} placeholder="Nombre servicio" onChange={(e) => modificarItem(index, 'nombreServicio', e.target.value)} /></td>
                                    <td data-label="Precio Unit."><input type="number" className="input-number" value={item.precioUnitario} onChange={(e) => modificarItem(index, 'precioUnitario', Number(e.target.value))} /></td>
                                    <td data-label="Cant"><input type="number" className="input-number" value={item.cantidad} onChange={(e) => modificarItem(index, 'cantidad', Number(e.target.value))} /></td>
                                    <td data-label="Subtotal" className="text-right font-bold text-blue text-mono">${item.subtotal.toLocaleString()}</td>
                                    <td data-label="Acciones" className="text-center"><button className="btn-del" onClick={() => eliminarItem(index)}>🗑️ Eliminar</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 && (<div className="text-center text-gray no-results">No hay servicios agregados. Selecciona del catálogo o agrega manualmente.</div>)}
                </div>

                <div className="row-dos-columnas">
                    <div className="resumen-final">
                        <p><strong>Subtotal:</strong> <span className="text-mono">${subtotalGeneral.toLocaleString()}</span></p>
                        <p><strong>IVA (19%):</strong> <span className="text-mono">${iva.toLocaleString()}</span></p>
                        <h3>Total: <span className="text-mono">${totalGeneral.toLocaleString()}</span></h3>
                        {/* ✅ FIX: onClick ahora usa arrow function para no pasar el evento */}
                        <button
                            className="btn-guardar"
                            onClick={() => guardarCotizacion()}
                            disabled={guardando}
                        >
                            {guardando ? '⏳ Guardando...' : '💾 Guardar Cotización'}
                        </button>
                    </div>
                    <div>
                        <div className="anticipo-box">
                            <p><strong>Anticipo Requerido (40%):</strong><br /><span className="text-mono font-bold text-green" style={{ fontSize: '1.2em' }}>${anticipo.toLocaleString('es-CO')}</span></p>
                        </div>
                        <div className="form-group">
                            <label>Notas Legales</label>
                            <textarea rows="4" value={cotizacion.notasLegales} onChange={(e) => setCotizacion({ ...cotizacion, notasLegales: e.target.value })} />
                        </div>
                    </div>
                </div>
            </div>

            {showModalAprobacion && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: '#fff', padding: '30px', borderRadius: '12px', maxWidth: '550px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif' }}>
                        <h3 style={{ marginTop: 0, color: '#dc3545', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>⚠️ Confirmar Aprobación de Cotización</h3>
                        <p><strong>Al aprobar esta cotización se creará un Proyecto y una Factura automáticamente.</strong></p>
                        <div style={{ margin: '20px 0' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Seleccione tipo de facturación:</label>
                            <select value={tipoFacturacion} onChange={(e) => setTipoFacturacion(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '14px' }}>
                                <option value="anticipo_final">1. Anticipo 40% + Final 60%</option>
                                <option value="unica">2. Pago Único (100%)</option>
                                <option value="etapas_3">3. Por Etapas (40%+30%+30%)</option>
                                <option value="etapas_4">4. Por Etapas (40%+20%+20%+20%)</option>
                            </select>
                        </div>
                        <div style={{ margin: '20px 0' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Seleccione método de pago:</label>
                            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '14px' }}>
                                <option value="Transferencia Bancaria">1. Transferencia Bancaria</option>
                                <option value="Efectivo">2. Efectivo</option>
                                <option value="Cheque Corporativo">3. Cheque Corporativo</option>
                                <option value="Pasarela Online">4. Pasarela de pago Online</option>
                                <option value="Tarjeta Credito/Debito">5. Tarjeta de crédito/débito</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <button onClick={() => setShowModalAprobacion(false)} style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' }}>Cancelar</button>
                            <button onClick={() => handleGuardarDesdeModal()} style={{ padding: '10px 20px', background: '#0dcaf0', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>✅ Aceptar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Cotizaciones;