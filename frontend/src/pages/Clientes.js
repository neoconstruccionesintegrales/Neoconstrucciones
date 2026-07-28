import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../style/clientes.css';

axios.interceptors.request.use(function (config) {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
});

function Clientes() {
    const navigate = useNavigate(); // ← AQUÍ se define navigate
    const [clientes, setClientes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [nuevoCliente, setNuevoCliente] = useState({
        nombreEmp: '', nombreRep: '', nit: '', ciudad: '', direccion: '',
        telefono: '', celular: '', correo: '', sedes: []
    });
    const [sedeTemporal, setSedeTemporal] = useState({
        nombreSede: '', nombreEncargado: '', nitEncargado: '',
        ciudad: '', direccion: '', celular: '', correoEnc: ''
    });
    const [editandoID, setEditandoID] = useState(null);
    const [clienteSedeActivo, setClienteSedeActivo] = useState(null);
    const [editandoSedeID, setEditandoSedeID] = useState(null);

    const generarIDCliente = () => 'CLI-' + String(clientes.length + 1).padStart(3, '0');

    useEffect(() => {
        const fetchClientes = async () => {
           try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/clientes`);
                setClientes(res.data.data);
            } catch (err) {
                console.error("Error al traer clientes:", err);
                if (err.response?.status === 401) {
                    alert("Sesion expirada. Inicie sesion nuevamente.");
                    window.location.href = '/login';
                }
            }
        };
        fetchClientes();
    }, []);

    const guardarCliente = async (e) => {
        e.preventDefault();
        try {
            if (editandoID) {
                await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/clientes/${editandoID}`, nuevoCliente);
                setClientes(clientes.map(c => c.idCliente === editandoID ? { ...nuevoCliente, idCliente: editandoID } : c));
                setEditandoID(null);
            } else {
                const cliente = { ...nuevoCliente, idCliente: generarIDCliente() };
                await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/clientes`, cliente);
                setClientes([...clientes, cliente]);
            }
            setNuevoCliente({
                nombreEmp: '', nombreRep: '', nit: '', ciudad: '', direccion: '',
                telefono: '', celular: '', correo: '', sedes: []
            });
        } catch (err) {
            console.error("Error al guardar:", err);
            if (err.response?.status === 401) {
                alert("No autorizado. Inicie sesion nuevamente.");
                window.location.href = '/login';
            }
        }
    };

    const prepararEdicion = (c) => {
        setEditandoID(c.idCliente);
        setNuevoCliente(c);
    };

    const eliminarCliente = async (id) => {
        try {
            const resProyectos = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/proyectos`);
            const proyectos = resProyectos.data.data;
            const tieneProyectos = proyectos.some(p => p.idCliente === id);
            if (tieneProyectos) {
                alert("Accion bloqueada! Este cliente tiene proyectos activos. Primero eliminelos.");
                return;
            }
            if (window.confirm("¿Esta seguro de eliminar este cliente y todas sus sedes?")) {
                await axios.delete(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/clientes/${id}`);
                setClientes(clientes.filter(c => c.idCliente !== id));
            }
        } catch (error) {
            console.error("Error al validar o eliminar:", error);
            if (error.response?.status === 401) {
                alert("No autorizado.");
                window.location.href = '/login';
            } else {
                alert("Hubo un problema al intentar eliminar el cliente.");
            }
        }
    };

    const agregarSede = async (cID) => {
        try {
            const cliente = clientes.find(c => c.idCliente === cID);
            const idSede = cID + '-S' + String(cliente.sedes.length + 1).padStart(2, '0');
            const clienteActualizado = {
                ...cliente,
                sedes: [...cliente.sedes, { ...sedeTemporal, id: idSede }]
           };
            await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/clientes/${cID}`, clienteActualizado);
            setClientes(clientes.map(c => c.idCliente === cID ? clienteActualizado : c));
            setSedeTemporal({
                nombreSede: '', nombreEncargado: '', nitEncargado: '',
                ciudad: '', direccion: '', celular: '', correoEnc: ''
            });
        } catch (err) {
            console.error("Error al agregar sede:", err);
            if (err.response?.status === 401) window.location.href = '/login';
        }
    };

    const guardarEdicionSede = async (clienteID) => {
        try {
            const cliente = clientes.find(c => c.idCliente === clienteID);
            const sedesActualizadas = cliente.sedes.map(s =>
                s.id === editandoSedeID ? { ...sedeTemporal, id: s.id } : s
            );
            const clienteActualizado = { ...cliente, sedes: sedesActualizadas };
            await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/clientes/${clienteID}`, clienteActualizado);
            setClientes(clientes.map(c => c.idCliente === clienteID ? clienteActualizado : c));
            setEditandoSedeID(null);
            setSedeTemporal({
                nombreSede: '', nombreEncargado: '', nitEncargado: '',
                ciudad: '', direccion: '', celular: '', correoEnc: ''
            });
        } catch (err) {
            console.error("Error al editar sede:", err);
            if (err.response?.status === 401) window.location.href = '/login';
        }
    };

    const prepararEdicionSede = (sede) => {
        setEditandoSedeID(sede.id);
        setSedeTemporal(sede);
    };

    const eliminarSede = async (cID, sID) => {
        if (!window.confirm("¿Eliminar esta sede?")) return;
        try {
            const cliente = clientes.find(c => c.idCliente === cID);
            const clienteActualizado = {
                ...cliente,
                sedes: cliente.sedes.filter(s => s.id !== sID)
            };
            await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/clientes/${cID}`, clienteActualizado);
            setClientes(clientes.map(c => c.idCliente === cID ? clienteActualizado : c));
        } catch (err) {
            console.error("Error al eliminar sede:", err);
            if (err.response?.status === 401) window.location.href = '/login';
        }
    };

    // Iconos SVG
    const IconMap = () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cli-icon">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );

    const IconUser = () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cli-icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );

    const IconPhone = () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cli-icon">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.81 12.81 0 0 0 .62 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.62A2 2 0 0 1 22 16.92z" />
        </svg>
    );

    const IconMail = () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cli-icon">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    );

    // Detectar rol del usuario desde localStorage o default
    const userRol = localStorage.getItem('rol') || 'ADMIN';

    return (
        <div className="dba-container">
            <div className="dba-wrapper">
                {/* HEADER */}
                <div className="dba-header-text">
                    <h1 className="dba-title">📋 Gestión de Clientes</h1>
                    <p className="dba-subtitle">
                        Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                    </p>
                </div>

                {/* BÚSQUEDA */}
                <div className="filtro-container">
                    <input
                        className="cli-input"
                        placeholder="🔍 Buscar por nombre representante o NIT..."
                        onChange={e => setBusqueda(e.target.value)}
                    />
                </div>

                {/* GRID DE DOS COLUMNAS: Formulario + Directorio */}
                <div className="cli-forms-grid">
                    {/* FORMULARIO CLIENTE */}
                    <div className="dba-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 className="cli-section-title">{editandoID ? "✏️ Editar Cliente" : "👤 Nuevo Cliente"}</h3>
                        <form onSubmit={guardarCliente} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                            <label className="cli-label">ID Generado:</label>
                            <input className="cli-input cli-input-disabled" value={editandoID || generarIDCliente()} disabled />

                            <label className="cli-label">Nombre Empresa / Razón Social:</label>
                            <input className="cli-input" placeholder="Nombre Empresa" maxLength="50" required
                                value={nuevoCliente.nombreEmp}
                                onChange={e => setNuevoCliente({ ...nuevoCliente, nombreEmp: e.target.value.toUpperCase() })} />

                            <label className="cli-label">Representante Legal:</label>
                            <input className="cli-input" placeholder="Nombre Representante" maxLength="50" required
                                value={nuevoCliente.nombreRep}
                                onChange={e => setNuevoCliente({ ...nuevoCliente, nombreRep: e.target.value.toUpperCase() })} />

                            <label className="cli-label">NIT / Cédula:</label>
                            <input className="cli-input" placeholder="NIT / Cédula" maxLength="12" required
                                value={nuevoCliente.nit}
                                onChange={e => setNuevoCliente({ ...nuevoCliente, nit: e.target.value })} />

                            <label className="cli-label">Ciudad:</label>
                            <input className="cli-input" placeholder="Ciudad" maxLength="20" required
                                value={nuevoCliente.ciudad}
                                onChange={e => setNuevoCliente({ ...nuevoCliente, ciudad: e.target.value.toUpperCase() })} />

                            <label className="cli-label">Dirección:</label>
                            <input className="cli-input" placeholder="Dirección" maxLength="20" required
                                value={nuevoCliente.direccion}
                                onChange={e => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value.toUpperCase() })} />

                            <label className="cli-label">Teléfono / Celular</label>
                            <div className="cli-phone-group">
                                <input className="cli-input" placeholder="Teléfono" maxLength="10"
                                    value={nuevoCliente.telefono || ""}
                                    onChange={e => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} />
                                <input className="cli-input" placeholder="Celular" maxLength="10" required
                                    value={nuevoCliente.celular}
                                    onChange={e => setNuevoCliente({ ...nuevoCliente, celular: e.target.value })} />
                            </div>

                            <label className="cli-label">Correo Electrónico:</label>
                            <input className="cli-input" type="email" maxLength="30" placeholder="Correo" required
                                value={nuevoCliente.correo}
                                onChange={e => setNuevoCliente({ ...nuevoCliente, correo: e.target.value.toLowerCase() })} />

                            <div className="cli-btn-group-form">
                                <button type="submit" className={editandoID ? "cli-btn cli-btn-edit" : "cli-btn cli-btn-save"}>
                                    {editandoID ? "Guardar Cambios" : "+ Guardar Cliente"}
                                </button>
                                {editandoID && (
                                    <button type="button" className="cli-btn cli-btn-cancel"
                                        onClick={() => {
                                            setEditandoID(null);
                                            setNuevoCliente({ nombreEmp: '', nombreRep: '', nit: '', ciudad: '', direccion: '', telefono: '', celular: '', correo: '', sedes: [] });
                                        }}>
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* DIRECTORIO */}
                    <div className="dba-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)', borderBottom: '1px solid var(--gris-200)', flexShrink: 0 }}>
                            <h3 className="cli-section-title" style={{ marginBottom: 0 }}>📋 Directorio de Clientes</h3>
                        </div>
                        <div className="cli-lista-scroll" style={{ padding: 'clamp(6px, 1.2vw, 10px) clamp(10px, 2vw, 14px)', flex: 1, overflowY: 'auto' }}>
                            {clientes
                                .filter(c => (c.nombreEmp || "").toLowerCase().includes(busqueda.toLowerCase()))
                                .map(c => (
                                    <div key={c.idCliente} className="cli-cliente-item">
                                        <div className="cli-cliente-header">
                                            <h4>{c.idCliente} | {c.nombreEmp || "Sin nombre"}</h4>
                                            <div className="cli-acciones-principales">
                                                <button onClick={() => prepararEdicion(c)} className="cli-btn-icon" title="Editar">✏️ Editar</button>
                                                <button onClick={() => eliminarCliente(c.idCliente)} className="cli-btn-icon cli-btn-del" title="Eliminar">🗑️ Eliminar</button>
                                            </div>
                                        </div>

                                        <div className="cli-cliente-info">
                                            <p><strong>Representante Legal:</strong> {c.nombreRep}</p>
                                            <p><strong>NIT:</strong> {c.nit} | <strong>Teléfono:</strong> {c.telefono}| <strong>Celular:</strong> {c.celular}</p>
                                            <p><strong>Ubicación:</strong> {c.ciudad}, {c.direccion}</p>
                                            <p><strong>Correo Electrónico:</strong> {c.correo}</p>
                                        </div>

                                        <div className="cli-sedes-section">
                                            <h5 className="cli-sedes-title">Sedes Registradas:</h5>

                                            {c.sedes.map(s => (
                                                <div key={s.id} className="cli-sede-card">
                                                    {editandoSedeID === s.id ? (
                                                        <div className="cli-sede-form-mini">
                                                            <div className="cli-mini-grid">
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Nombre Sede</label>
                                                                    <input className="cli-input-mini" maxLength="20"
                                                                        value={sedeTemporal.nombreSede}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, nombreSede: e.target.value.toUpperCase() })} />
                                                                </div>
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Dirección</label>
                                                                    <input className="cli-input-mini" maxLength="20"
                                                                        value={sedeTemporal.direccion}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, direccion: e.target.value.toUpperCase() })} />
                                                                </div>
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Ciudad</label>
                                                                    <input className="cli-input-mini" maxLength="20"
                                                                        value={sedeTemporal.ciudad}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, ciudad: e.target.value.toUpperCase() })} />
                                                                </div>
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Encargado</label>
                                                                    <input className="cli-input-mini" maxLength="30"
                                                                        value={sedeTemporal.nombreEncargado}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, nombreEncargado: e.target.value.toUpperCase() })} />
                                                                </div>
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Identificación</label>
                                                                    <input className="cli-input-mini" maxLength="30"
                                                                        value={sedeTemporal.nitEncargado}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, nitEncargado: e.target.value.toUpperCase() })} />
                                                                </div>
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Celular</label>
                                                                    <input className="cli-input-mini" maxLength="100"
                                                                        value={sedeTemporal.celular}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, celular: e.target.value })} />
                                                                </div>
                                                                <div className="cli-mini-field cli-mini-field-full">
                                                                    <label className="cli-mini-label">Correo Electrónico</label>
                                                                    <input className="cli-input-mini" maxLength="30"
                                                                        value={sedeTemporal.correoEnc}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, correoEnc: e.target.value.toLowerCase() })} />
                                                                </div>
                                                            </div>
                                                            <div className="cli-btn-group-sedes">
                                                                <button onClick={() => guardarEdicionSede(c.idCliente)} className="cli-btn-sede">Actualizar</button>
                                                                <button onClick={() => setEditandoSedeID(null)} className="cli-btn-sede cli-btn-sede-cancel">Cancelar</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="cli-sede-info-display">
                                                            <div className="cli-sede-main-row">
                                                                <span className="cli-sede-id">{s.id}</span>
                                                                <strong className="cli-sede-nombre">Sede {s.nombreSede}</strong>
                                                            </div>
                                                            <div className="cli-sede-detalles">
                                                                <p><IconMap /> Ubicación: {s.ciudad} {s.direccion}</p>
                                                                <p><IconUser /> Representante: {s.nombreEncargado}</p>
                                                                <p><IconPhone /> Celular: {s.celular}</p>
                                                                <p><IconMail /> Correo Electrónico: {s.correoEnc}</p>
                                                            </div>
                                                            <div className="cli-sede-acciones">
                                                                <button onClick={() => prepararEdicionSede(s)} className="cli-btn-icon-mini">✏️ Editar</button>
                                                                <button onClick={() => eliminarSede(c.idCliente, s.id)} className="cli-btn-icon-mini cli-btn-del">🗑️ Eliminar</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {!editandoSedeID && (
                                                <div className="cli-sede-form-mini">
                                                    {clienteSedeActivo === c.idCliente ? (
                                                        <>
                                                            <div className="cli-mini-grid">
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Nombre Sede</label>
                                                                    <input className="cli-input-mini" maxLength="20"
                                                                        value={sedeTemporal.nombreSede}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, nombreSede: e.target.value.toUpperCase() })} />
                                                                </div>
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Ciudad</label>
                                                                    <input className="cli-input-mini" maxLength="20"
                                                                        value={sedeTemporal.ciudad}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, ciudad: e.target.value.toUpperCase() })} />
                                                                </div>
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Dirección</label>
                                                                    <input className="cli-input-mini" maxLength="20"
                                                                        value={sedeTemporal.direccion}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, direccion: e.target.value.toUpperCase() })} />
                                                                </div>
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Encargado</label>
                                                                    <input className="cli-input-mini" maxLength="30"
                                                                        value={sedeTemporal.nombreEncargado}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, nombreEncargado: e.target.value.toUpperCase() })} />
                                                                </div>
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Identificación</label>
                                                                    <input className="cli-input-mini" maxLength="12"
                                                                        value={sedeTemporal.nitEncargado}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, nitEncargado: e.target.value.toUpperCase() })} />
                                                                </div>
                                                                <div className="cli-mini-field">
                                                                    <label className="cli-mini-label">Celular</label>
                                                                    <input className="cli-input-mini" maxLength="10"
                                                                        value={sedeTemporal.celular}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, celular: e.target.value })} />
                                                                </div>
                                                                <div className="cli-mini-field cli-mini-field-full">
                                                                    <label className="cli-mini-label">Correo Electrónico</label>
                                                                    <input className="cli-input-mini" maxLength="30"
                                                                        value={sedeTemporal.correoEnc}
                                                                        onChange={e => setSedeTemporal({ ...sedeTemporal, correoEnc: e.target.value.toLowerCase() })} />
                                                                </div>
                                                            </div>
                                                            <div className="cli-btn-group-sedes">
                                                                <button onClick={() => { agregarSede(c.idCliente); setClienteSedeActivo(null); }} className="cli-btn-sede">Guardar Sede</button>
                                                                <button onClick={() => setClienteSedeActivo(null)} className="cli-btn-sede cli-btn-sede-cancel">Cancelar</button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <button onClick={() => {
                                                            setClienteSedeActivo(c.idCliente);
                                                            setSedeTemporal({ nombreSede: '', nombreEncargado: '', nitEncargado: '', ciudad: '', direccion: '', celular: '', correoEnc: '' });
                                                        }} className="cli-btn-sede-abrir">
                                                            + Agregar Nueva Sede
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
                {/* Barra de Operaciones Inferior */}
                <div className="db-actions-group">
                    <button onClick={() => navigate('/admin')} className="btn-primary">⚙️ Inicio </button>
                </div>
            </div>
        </div>
    );
}

export default Clientes;