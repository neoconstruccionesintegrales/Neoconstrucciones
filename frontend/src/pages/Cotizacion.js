import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../style/cotizacion.css';

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
// COMPONENTE PRINCIPAL — Cotizaciones
// ============================================================
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

    const userRol = localStorage.getItem('rol') || 'ADMIN';

    // ============================================================
    // CARGAR DATOS MAESTROS
    // ============================================================
    useEffect(function () {
        const fetchData = async function () {
            try {
                const fechaVencimiento = new Date();
                fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
                const fechaFormateada = fechaVencimiento.toISOString().split('T')[0];

                const resClientes = await axios.get('${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/clientes');
                const resServicios = await axios.get('${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/servicios');

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

    // ============================================================
    // AUTO-SELECCION DE SEDE PRINCIPAL
    // ============================================================
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

    // ============================================================
    // MANEJADORES
    // ============================================================
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

    // ============================================================
    // LÓGICA DE SERVICIOS
    // ============================================================
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

    // ============================================================
    // CÁLCULOS FINANCIEROS
    // ============================================================
    const subtotalGeneral = items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
    const iva = subtotalGeneral * 0.19;
    const totalGeneral = subtotalGeneral + iva;
    const anticipo = totalGeneral * 0.40;

    // ============================================================
    // GUARDAR COTIZACIÓN
    // ============================================================
    const guardarCotizacion = useCallback(async () => {
        let sedeParaGuardar = cotizacion.idSede;

        if (!sedeParaGuardar && cotizacion.idCliente) {
            const clienteEncontrado = clientes.find(c => c.idCliente === cotizacion.idCliente);
            if (clienteEncontrado?.sedes?.length > 0) {
                sedeParaGuardar = clienteEncontrado.sedes[0].id;
            }
        }

        if (!sedeParaGuardar) {
            alert("Error: Por favor selecciona o verifica la sede del cliente.");
            return;
        }

        const { idCotizacion, ...datosLimpios } = cotizacion;

        const payload = {
            ...datosLimpios,
            idCliente: cotizacion.idCliente,
            idSede: sedeParaGuardar,
            estado_general: cotizacion.estado_general || 'Pendiente',
            items: items,
            subtotal: subtotalGeneral,
            iva: iva,
            total: totalGeneral,
            anticipo: anticipo,
            fechaVencimiento: cotizacion.fechaVencimiento,
            notasLegales: cotizacion.notasLegales || '',
            fechaCreacion: new Date(),
            version_id: 1,
            creadoPor: cotizacion.creadoPor || null
        };

        console.log("Enviando payload al servidor:", payload);

        try {
            const res = await axios.post('${`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/}/api/cotizaciones', payload);
            const idGenerado = res.data.data.idCotizacion;
            alert(`¡Cotización guardada exitosamente!\nID generado: ${idGenerado}`);
            window.location.reload();
        } catch (e) {
            console.error("Error completo recibido:", e);
            const mensajeError = e.response?.data?.details || e.response?.data?.error || e.message;
            const textoLegible = typeof mensajeError === 'object' ? JSON.stringify(mensajeError, null, 2) : mensajeError;
            alert(`Error al guardar:\n${textoLegible}`);
        }
    }, [cotizacion, clientes, items, subtotalGeneral, iva, totalGeneral, anticipo]);

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="dba-container">
            <div className="dba-wrapper">
                {/* HEADER */}
                <div className="dba-header-text">
                    <h1 className="dba-title">📝 Crear Nueva Cotización</h1>
                    <p className="dba-subtitle">
                        Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                    </p>
                </div>

                <div className="header-acciones">
                {/* BOTÓN VOLVER */}
                    <button onClick={() => window.location.href = '/gestion-cotizaciones'} className="btn-volver">
                        ← Volver 
                    </button>
                </div>
                {/* 1. FORMULARIO: Cliente, Sede, Estado, Fecha (todo en un grid) */}
                <div className="form-grid">
                    <div className="form-group">
                        <label>Cliente *</label>
                        <select
                            value={cotizacion.idCliente}
                            onChange={(e) => manejarCambioCliente(e.target.value)}
                        >
                            <option value="">-- Seleccionar Cliente --</option>
                            {clientes.map(c => (
                                <option key={c.idCliente} value={c.idCliente}>{c.nombreEmp}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Sede *</label>
                        <select
                            value={cotizacion.idSede}
                            onChange={(e) => setCotizacion({ ...cotizacion, idSede: e.target.value })}
                        >
                            <option value="">-- Seleccione Sede --</option>
                            {sedesDisponibles.map(s => (
                                <option key={s.id} value={s.id}>{s.nombreSede}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Estado de Cotización</label>
                        <select
                            value={cotizacion.estado_general}
                            onChange={(e) => setCotizacion({ ...cotizacion, estado_general: e.target.value })}
                        >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Aprobada">Aprobada</option>
                            <option value="Superada">Superada</option>
                            <option value="Rechazada">Rechazada</option>
                            <option value="Caducada">Caducada</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Fecha de Validez</label>
                        <input
                            type="date"
                            value={cotizacion.fechaVencimiento}
                            onChange={(e) => setCotizacion({ ...cotizacion, fechaVencimiento: e.target.value })}
                        />
                    </div>
                </div>

                {/* INFO RESUMEN */}
                <div className="info-resumen">
                    <p><strong>ID Cotización:</strong> {cotizacion.idCotizacion || "Generado al guardar"}</p>
                    <p><strong>Cliente:</strong> {cotizacion.idCliente} | <strong>Sede:</strong> {cotizacion.idSede}</p>
                </div>

                {/* TARJETA DE INFORMACIÓN DEL CLIENTE/SEDE */}
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

                {/* 2. CATALOGO DE SERVICIOS */}
                <div className="seccion-servicios">
                    <h3 className="seccion-titulo">Servicios:</h3>
                    <div className="catalogo-servicios">
                        {servicios.map(s => (
                            <button key={s.idServicio} className="btn-servicio" onClick={() => agregarDesdeCatalogo(s)}>
                                + {s.nombre}
                            </button>
                        ))}
                        <button className="btn-manual" onClick={agregarFilaManual}>+ Servicio Manual</button>
                    </div>
                </div>

                {/* 3. TABLA DE ITEMS */}
                <div className="table-container">
                    <table className="tabla-cotizacion">
                        <thead>
                            <tr>
                                <th>Servicio</th>
                                <th>Precio Unit.</th>
                                <th>Cant</th>
                                <th>Subtotal</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id}>
                                    <td data-label="Servicio">
                                        <input
                                            value={item.nombreServicio}
                                            placeholder="Nombre servicio"
                                            onChange={(e) => modificarItem(index, 'nombreServicio', e.target.value)}
                                        />
                                    </td>
                                    <td data-label="Precio Unit.">
                                        <input
                                            type="number"
                                            className="input-number"
                                            value={item.precioUnitario}
                                            onChange={(e) => modificarItem(index, 'precioUnitario', Number(e.target.value))}
                                        />
                                    </td>
                                    <td data-label="Cant">
                                        <input
                                            type="number"
                                            className="input-number"
                                            value={item.cantidad}
                                            onChange={(e) => modificarItem(index, 'cantidad', Number(e.target.value))}
                                        />
                                    </td>
                                    <td data-label="Subtotal" className="text-right font-bold text-blue text-mono">
                                        ${item.subtotal.toLocaleString()}
                                    </td>
                                    <td data-label="Acciones" className="text-center">
                                        <button className="btn-del" onClick={() => eliminarItem(index)}>
                                            🗑️ Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 && (
                        <div className="text-center text-gray no-results">
                            No hay servicios agregados. Selecciona del catálogo o agrega manualmente.
                        </div>
                    )}
                </div>

                {/* 4. TOTALES + ACCIONES (DOS COLUMNAS) */}
                <div className="row-dos-columnas">
                    {/* COLUMNA IZQUIERDA: Totales */}
                    <div className="resumen-final">
                        <p><strong>Subtotal:</strong> <span className="text-mono">${subtotalGeneral.toLocaleString()}</span></p>
                        <p><strong>IVA (19%):</strong> <span className="text-mono">${iva.toLocaleString()}</span></p>
                        <h3>Total: <span className="text-mono">${totalGeneral.toLocaleString()}</span></h3>
                        <button className="btn-guardar" onClick={guardarCotizacion}>
                            💾 Guardar Cotización
                        </button>
                    </div>

                    {/* COLUMNA DERECHA: Anticipo y Notas */}
                    <div>
                        <div className="anticipo-box">
                            <p>
                                <strong>Anticipo Requerido (40%):</strong><br />
                                <span className="text-mono font-bold text-green" style={{ fontSize: '1.2em' }}>
                                    ${anticipo.toLocaleString('es-CO')}
                                </span>
                            </p>
                        </div>
                        <div className="form-group">
                            <label>Notas Legales</label>
                            <textarea
                                rows="4"
                                value={cotizacion.notasLegales}
                                onChange={(e) => setCotizacion({ ...cotizacion, notasLegales: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Cotizaciones;