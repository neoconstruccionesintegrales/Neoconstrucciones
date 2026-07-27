import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/servicios.css';

const fetchConAuth = (url, opciones = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...opciones.headers
    };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return fetch(url, { ...opciones, headers });
};

function Servicios() {
    const navigate = useNavigate();
    const [servicios, setServicios] = useState([]);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [categoria, setCategoria] = useState('EST');
    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
    const [errores, setErrores] = useState({});

    const [nuevoServicio, setNuevoServicio] = useState({
        idServicio: '',
        nombre: '',
        unidad: 'm2',
        precioUnitario: 0,
        costoManoObraEspecializada: 0,
        descripcion: '',
        materiales: [{ nombreMaterial: '', costoEstimado: 0 }]
    });

    // 1. CARGA DESDE ATLAS
    const obtenerServicios = useCallback(async () => {
        try {
            const res = await fetchConAuth('${API_URL}/api/servicios');
            if (res.status === 401) {
                alert('Sesion expirada. Inicie sesion nuevamente.');
                window.location.href = '/login';
                return;
            }
            const resultado = await res.json();
            const data = resultado.data || (Array.isArray(resultado) ? resultado : []);
            setServicios(data);
        } catch (error) {
            console.error('Error al conectar con Atlas:', error);
        }
    }, []);

    useEffect(() => {
        obtenerServicios();
    }, [obtenerServicios]);

    // 2. LOGICA DE ID
    const obtenerSiguienteID = useCallback(() => {
        const prefijo = categoria + '-';
        const filtrados = servicios.filter(s => s.idServicio && s.idServicio.startsWith(prefijo));
        if (filtrados.length === 0) return prefijo + '001';
        const numeros = filtrados.map(s => parseInt(s.idServicio.split('-')[1]) || 0);
        const max = Math.max(...numeros, 0);
        return prefijo + String(max + 1).padStart(3, '0');
    }, [categoria, servicios]);

    // 3. CALCULO EN TIEMPO REAL
    const calcularValorUnitarioReal = useCallback(() => {
        const manoObra = parseFloat(nuevoServicio.costoManoObraEspecializada) || 0;
        const materialesSuma = nuevoServicio.materiales.reduce((acc, m) => {
            return acc + (parseFloat(m.costoEstimado) || 0);
        }, 0);
        return Math.round(manoObra + materialesSuma);
    }, [nuevoServicio.costoManoObraEspecializada, nuevoServicio.materiales]);

    useEffect(() => {
        const nuevoTotal = calcularValorUnitarioReal();
        setNuevoServicio(prev => ({ ...prev, precioUnitario: nuevoTotal }));
    }, [nuevoServicio.costoManoObraEspecializada, nuevoServicio.materiales, calcularValorUnitarioReal]);

    // 4. VALIDACION
    const validarFormulario = () => {
        const errs = {};
        if (!nuevoServicio.nombre.trim()) errs.nombre = 'Obligatorio';
        if (!nuevoServicio.costoManoObraEspecializada || Number(nuevoServicio.costoManoObraEspecializada) < 0) {
            errs.costoManoObraEspecializada = 'Debe ser >= 0';
        }
        const matsInvalidos = nuevoServicio.materiales.some(m => !m.nombreMaterial.trim() || Number(m.costoEstimado) < 0);
        if (matsInvalidos) errs.materiales = 'Complete todos los materiales con valores válidos';
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    // 5. ELIMINAR
    const eliminarServicio = async (idServicio) => {
        const confirmar = window.confirm('¿Está seguro de eliminar el servicio ' + idServicio + '? Esta acción no se puede deshacer.');
        if (!confirmar) return;
        try {
            const res = await fetchConAuth('${API_URL}/api/servicios/' + idServicio, { method: 'DELETE' });
            if (res.status === 401) {
                alert('No autorizado. Inicie sesion nuevamente.');
                window.location.href = '/login';
                return;
            }
            const resultado = await res.json();
            if (resultado.success) {
                alert('Registro eliminado correctamente.');
                obtenerServicios();
                limpiarFormulario();
            } else {
                alert('No se pudo eliminar: ' + (resultado.error || 'Error desconocido'));
            }
        } catch (error) {
            alert('Error de conexion con el servidor.');
        }
    };

    // 6. MANEJO DE CAMBIOS
    const manejarCambioAdmin = (e) => {
        const { name, value, type } = e.target;
        const val = type === 'number' ? (parseFloat(value) < 0 ? 0 : value) : value;
        setNuevoServicio(prev => ({ ...prev, [name]: val }));
        if (errores[name]) setErrores(prev => { const n = { ...prev }; delete n[name]; return n; });
    };

    const manejarCambioMaterial = (index, e) => {
        const { name, value } = e.target;
        const val = name === 'costoEstimado' ? (parseFloat(value) < 0 ? 0 : value) : value;
        setNuevoServicio(prev => ({
            ...prev,
            materiales: prev.materiales.map((m, i) => i === index ? { ...m, [name]: val } : m)
        }));
    };

    const agregarMaterial = () => {
        setNuevoServicio(prev => ({
            ...prev,
            materiales: [...prev.materiales, { nombreMaterial: '', costoEstimado: 0 }]
        }));
    };

    const eliminarMaterial = (index) => {
        setNuevoServicio(prev => ({
            ...prev,
            materiales: prev.materiales.filter((_, i) => i !== index)
        }));
    };

    const limpiarFormulario = useCallback(() => {
        setModoEdicion(false);
        setErrores({});
        setNuevoServicio({
            idServicio: obtenerSiguienteID(),
            nombre: '',
            unidad: 'm2',
            precioUnitario: 0,
            costoManoObraEspecializada: 0,
            descripcion: '',
            materiales: [{ nombreMaterial: '', costoEstimado: 0 }]
        });
    }, [obtenerSiguienteID]);

    useEffect(() => {
        if (!modoEdicion) {
            setNuevoServicio(prev => ({ ...prev, idServicio: obtenerSiguienteID() }));
        }
    }, [obtenerSiguienteID, modoEdicion]);

    const enviarServicio = async (e) => {
        e.preventDefault();
        if (!validarFormulario()) return;
        const method = modoEdicion ? 'PUT' : 'POST';
        const url = modoEdicion
            ? '${API_URL}/api/servicios/' + nuevoServicio.idServicio
            : '${API_URL}/api/servicios';
        try {
            const res = await fetchConAuth(url, { method, body: JSON.stringify(nuevoServicio) });
            if (res.status === 401) {
                alert('No autorizado. Inicie sesion nuevamente.');
                window.location.href = '/login';
                return;
            }
            if (res.ok) {
                alert(modoEdicion ? 'Actualizado correctamente!' : 'Guardado en base de datos!');
                obtenerServicios();
                limpiarFormulario();
                setMostrarFormulario(false);
            }
        } catch (err) {
            alert('Error de conexion al servidor');
        }
    };

    // 7. FILTRADO
    const serviciosFiltrados = servicios.filter(srv => {
        const term = busqueda.toLowerCase();
        const cumpleBusqueda =
            (srv.nombre || '').toLowerCase().includes(term) ||
            (srv.idServicio || '').toLowerCase().includes(term);
        const cumpleCategoria = filtroCategoria === 'TODOS' || (srv.idServicio && srv.idServicio.startsWith(filtroCategoria));
        return cumpleBusqueda && cumpleCategoria;
    });

    // 8. PROTECCION
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
    }, [navigate]);

    const userRol = localStorage.getItem('rol') || 'ADMIN';

    return (
        <div className="dba-container">
            <div className="dba-wrapper">
                {/* HEADER */}
                <div className="dba-header-text">
                    <h1 className="dba-title">🛠️ Gestión de Servicios</h1>
                    <p className="dba-subtitle">
                        Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                    </p>
                </div>

                {/* ============================================
                    BOTÓN CREAR SERVICIO
                    ============================================ */}
                {!mostrarFormulario && !modoEdicion && (
                    <div className="header-acciones">
                        <button
                            onClick={() => {
                                setMostrarFormulario(true);
                                setModoEdicion(false);
                                limpiarFormulario();
                            }}
                            className="btn-crear"
                        >
                            + Crear Servicio
                        </button>
                    </div>
                )}

                {/* ============================================
                    FORMULARIO — GRID DE 4 COLUMNAS
                    ============================================ */}
                {(mostrarFormulario || modoEdicion) && (
                    <div className="dba-card srv-form-card">
                        <div className="srv-form-header">
                            <h2 className="srv-section-title">
                                {modoEdicion ? '✏️ Editar' : '➕ Crear'} Servicio
                            </h2>
                            <button
                                type="button"
                                className="srv-btn-close"
                                onClick={() => {
                                    setMostrarFormulario(false);
                                    setModoEdicion(false);
                                    limpiarFormulario();
                                }}
                                title="Cerrar formulario"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={enviarServicio} noValidate>
                            {/* ═══════════════════════════════════════
                               GRID DE 4 COLUMNAS
                               ═══════════════════════════════════════ */}
                            <div className="srv-form-grid-4">
                                {/* Fila 1 */}
                                <div className="srv-form-group">
                                    <label className="srv-label">Categoría *</label>
                                    <select
                                        value={categoria}
                                        onChange={e => setCategoria(e.target.value)}
                                        className="srv-select"
                                        disabled={modoEdicion}
                                    >
                                        <option value="EST">Estructuras Metálicas</option>
                                        <option value="ACA">Acabados</option>
                                        <option value="CIV">Obra Civil</option>
                                    </select>
                                </div>
                                <div className="srv-form-group">
                                    <label className="srv-label">ID Actual</label>
                                    <input
                                        type="text"
                                        value={nuevoServicio.idServicio}
                                        disabled
                                        className="srv-input srv-input-id"
                                    />
                                </div>
                                <div className="srv-form-group">
                                    <label className="srv-label">Unidad *</label>
                                    <select
                                        name="unidad"
                                        value={nuevoServicio.unidad}
                                        onChange={manejarCambioAdmin}
                                        className="srv-select"
                                    >
                                        <option value="m2">m²</option>
                                        <option value="m3">m³</option>
                                        <option value="ml">ml</option>
                                        <option value="und">und</option>
                                        <option value="kg">kg</option>
                                    </select>
                                </div>
                                <div className="srv-form-group">
                                    <label className="srv-label">Estado</label>
                                    <input
                                        type="text"
                                        value="Activo"
                                        disabled
                                        className="srv-input"
                                    />
                                </div>

                                {/* Fila 2 */}
                                <div className="srv-form-group">
                                    <label className="srv-label">Nombre del Servicio *</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={nuevoServicio.nombre}
                                        onChange={manejarCambioAdmin}
                                        className={errores.nombre ? 'srv-input srv-input-error' : 'srv-input'}
                                        placeholder="Ej: Pintura de Estructuras"
                                        required
                                    />
                                    {errores.nombre && <span className="srv-error">{errores.nombre}</span>}
                                </div>
                                <div className="srv-form-group">
                                    <label className="srv-label">Costo Mano Obra ($) *</label>
                                    <input
                                        type="number"
                                        name="costoManoObraEspecializada"
                                        value={nuevoServicio.costoManoObraEspecializada}
                                        onChange={manejarCambioAdmin}
                                        className={errores.costoManoObraEspecializada ? 'srv-input srv-input-error' : 'srv-input'}
                                        min="0"
                                        required
                                    />
                                    {errores.costoManoObraEspecializada && (
                                        <span className="srv-error">{errores.costoManoObraEspecializada}</span>
                                    )}
                                </div>
                                <div className="srv-form-group">
                                    <label className="srv-label">Valor Unitario Total ($)</label>
                                    <input
                                        type="text"
                                        value={`$ ${Number(nuevoServicio.precioUnitario).toLocaleString()} COP`}
                                        disabled
                                        className="srv-input srv-input-total"
                                    />
                                </div>
                                <div className="srv-form-group">
                                    <label className="srv-label">Descripción</label>
                                    <input
                                        type="text"
                                        name="descripcion"
                                        value={nuevoServicio.descripcion}
                                        onChange={manejarCambioAdmin}
                                        className="srv-input"
                                        placeholder="Descripción opcional"
                                    />
                                </div>
                            </div>

                            {/* ═══════════════════════════════════════
                               MATERIALES / INSUMOS
                               ═══════════════════════════════════════ */}
                            <div className="srv-materiales-section">
                                <h4 className="srv-section-title">📦 Desglose de Materiales</h4>
                                {errores.materiales && (
                                    <span className="srv-error srv-error-block">{errores.materiales}</span>
                                )}
                                {nuevoServicio.materiales.map((m, i) => (
                                    <div key={i} className="srv-insumo-row">
                                        <div className="srv-insumo-col srv-insumo-col-nombre">
                                            <label className="srv-label-sr-only">Material {i + 1}</label>
                                            <input
                                                type="text"
                                                name="nombreMaterial"
                                                placeholder="Nombre del material"
                                                value={m.nombreMaterial}
                                                onChange={e => manejarCambioMaterial(i, e)}
                                                className="srv-input"
                                                required
                                            />
                                        </div>
                                        <div className="srv-insumo-col srv-insumo-col-costo">
                                            <label className="srv-label-sr-only">Costo {i + 1}</label>
                                            <input
                                                type="number"
                                                name="costoEstimado"
                                                placeholder="Costo estimado"
                                                value={m.costoEstimado}
                                                onChange={e => manejarCambioMaterial(i, e)}
                                                className="srv-input"
                                                min="0"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => eliminarMaterial(i)}
                                            className="srv-btn-del-insumo"
                                            title="Eliminar material"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={agregarMaterial} className="srv-btn-add-insumo">
                                    + Agregar Insumo
                                </button>
                            </div>

                            {/* ═══════════════════════════════════════
                               BOTONES DE ACCIÓN
                               ═══════════════════════════════════════ */}
                            <div className="srv-form-actions">
                                <button type="submit" className="srv-btn-primary">
                                    {modoEdicion ? '💾 Actualizar' : '💾 Guardar'}
                                </button>
                                {modoEdicion && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModoEdicion(false);
                                            setMostrarFormulario(false);
                                            limpiarFormulario();
                                        }}
                                        className="srv-btn-secondary"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {/* ============================================
                    FILTROS
                    ============================================ */}
                <div className="filtro-container">
                    <div className="srv-form-group" style={{ flex: 2, minWidth: '200px', margin: 0 }}>
                        <label className="srv-label">Buscar Servicio</label>
                        <input
                            type="text"
                            placeholder="🔍 Ej: Pintura o EST-001..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            className="srv-input"
                        />
                    </div>
                    <div className="srv-form-group" style={{ flex: 1, minWidth: '180px', margin: 0 }}>
                        <label className="srv-label">Filtrar por Categoría</label>
                        <select
                            value={filtroCategoria}
                            onChange={e => setFiltroCategoria(e.target.value)}
                            className="srv-select"
                        >
                            <option value="TODOS">📁 Mostrar Todas</option>
                            <option value="EST">Estructuras Metálicas</option>
                            <option value="ACA">Acabados</option>
                            <option value="CIV">Obra Civil</option>
                        </select>
                    </div>
                </div>

                {/* ============================================
                    TABLA DE SERVICIOS — ESTILO ALINEADO CON USUARIOS
                    ============================================ */}
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Servicio</th>
                                <th className="text-right">Mano Obra</th>
                                <th className="text-right">Valor Unitario</th>
                                <th className="text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {serviciosFiltrados.length > 0 ? (
                                serviciosFiltrados.map((s, idx) => (
                                    <tr key={s.idServicio} className={idx % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                                        <td data-label="ID">
                                            <span className="srv-id-badge">{s.idServicio}</span>
                                        </td>
                                        <td data-label="Servicio">
                                            <strong className="font-size-13 text-dark">{s.nombre}</strong>
                                        </td>
                                        <td data-label="Mano Obra" className="text-right text-mono">
                                            $ {Number(s.costoManoObraEspecializada || 0).toLocaleString()}
                                        </td>
                                        <td data-label="Valor Unitario" className="text-right text-mono text-success">
                                            $ {Number(s.precioUnitario || 0).toLocaleString()}
                                        </td>
                                        <td data-label="Acciones" className="text-center">
                                            <div className="srv-actions-cell">
                                                <button
                                                    onClick={() => {
                                                        setModoEdicion(true);
                                                        setMostrarFormulario(true);
                                                        setNuevoServicio(s);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    className="srv-btn-edit"
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    onClick={() => eliminarServicio(s.idServicio)}
                                                    className="srv-btn-delete"
                                                >
                                                    🗑️ Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="no-results">
                                        🔍 No se encontraron servicios con los filtros aplicados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Barra de Operaciones Inferior */}
                <div className="db-actions-group">
                    <button onClick={() => navigate('/admin')} className="btn-primary">⚙️ Inicio</button>
                </div>
            </div>
        </div>
    );
}

export default Servicios;
