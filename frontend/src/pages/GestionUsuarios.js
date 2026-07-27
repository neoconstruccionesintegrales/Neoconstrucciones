import React, { useEffect, useState, useCallback, memo, useRef, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/usuario.css';
import { esAdmin } from '../utils/utils.js';
import { getNivelARLByRol, calcularValorHora, debeRecibirAuxilio, calcularAuxilioTransporte } from '../utils/nominaHelpers.js';

const SMLV = 1750905;
const AUXILIO_TRANSPORTE = 249095;
const TOPE_AUXILIO = SMLV * 2;

const fetchConAuth = (url, opciones = {}) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...opciones.headers };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(url, { ...opciones, headers });
};

const OpcionesRol = () => (
    <>
        <option value="">-- Seleccione --</option>
        <option value="admin">Admin</option>
        <option value="gerente">Gerente</option>
        <option value="residente">Residente</option>
        <option value="comercial">Comercial</option>
        <option value="contabilidad">Contabilidad</option>
        <option value="secretaria">Secretaria</option>
        <option value="supervisor">Supervisor</option>
        <option value="oficial">Oficial</option>
        <option value="ayudante">Ayudante</option>
        <option value="cliente">Cliente</option>
    </>
);

const OpcionesTipoDocumento = () => (
    <>
        <option value="">-- Seleccione --</option>
        <option value="CC">Cedula de Ciudadania</option>
        <option value="CE">Cedula de Extranjeria</option>
        <option value="PA">Pasaporte</option>
    </>
);

const OpcionesTipoContrato = () => (
    <>
        <option value="">-- Seleccione --</option>
        <option value="obra_labor">Obra / Labor</option>
        <option value="indefinido">Termino Indefinido</option>
        <option value="fijo">Termino Fijo</option>
        <option value="aprendizaje">Aprendizaje</option>
        <option value="prestacion_servicios">Prestacion de Servicios</option>
    </>
);

const OpcionesTipoEmpleado = () => (
    <>
        <option value="">-- Seleccione --</option>
        <option value="obra">Obra</option>
        <option value="planta">Planta</option>
        <option value="residente">Residente</option>
    </>
);

const OpcionesFondoPension = () => (
    <>
        <option value="">-- Seleccione --</option>
        <option value="Porvenir">Porvenir</option>
        <option value="Proteccion">Proteccion</option>
        <option value="Colfondos">Colfondos</option>
        <option value="Skandia">Skandia</option>
        <option value="Colpensiones">Colpensiones</option>
    </>
);

const OpcionesFondoCesantias = () => (
    <>
        <option value="">-- Seleccione --</option>
        <option value="PORVENIR">Porvenir</option>
        <option value="PROTECCION">Proteccion</option>
        <option value="COLFONDOS">Colfondos</option>
        <option value="SKANDIA">Skandia</option>
        <option value="COLPENSIONES">Colpensiones</option>
        <option value="FNA">FNA Fondo Nacional del Ahorro</option>
    </>
);

const OpcionesCajaCompensacion = () => (
    <>
        <option value="">-- Seleccione --</option>
        <option value="Colsubsidio">Colsubsidio</option>
        <option value="Cafam">Cafam</option>
        <option value="Comfamiliar">Comfamiliar</option>
        <option value="Compensar">Compensar</option>
    </>
);

const OpcionesBanco = () => (
    <>
        <option value="">-- Seleccione --</option>
        <option value="Bancolombia">Bancolombia</option>
        <option value="Davivienda">Banco Davivienda</option>
        <option value="BBVA">Banco BBVA Colombia</option>
        <option value="Bogota">Banco de Bogota</option>
        <option value="Caja Social">Banco Caja Social</option>
        <option value="Popular">Banco Popular</option>
        <option value="GNB Sudameris">Banco GNB Sudameris</option>
        <option value="Agrario">Banco Agrario de Colombia</option>
        <option value="Occidente">Banco de Occidente</option>
        <option value="AV Villas">Banco Comercial AV Villas</option>
        <option value="Colpatria">Scotiabank Colpatria</option>
        <option value="Itau">Itau Colombia</option>
        <option value="Nequi">Nequi</option>
        <option value="Daviplata">Daviplata</option>
    </>
);

const OpcionesTipoSalario = () => (
    <>
        <option value="fijo_mensual">Fijo Mensual</option>
        <option value="fijo_quincenal">Fijo Quincenal</option>
        <option value="por_hora">Por Hora (Obra/Labor)</option>
    </>
);

const OpcionesTurno = () => (
    <>
        <option value="">Sin turno fijo (Obra)</option>
        <option value="06-15">6:00 AM - 3:00 PM</option>
        <option value="07-16">7:00 AM - 4:00 PM</option>
        <option value="08-17">8:00 AM - 5:00 PM</option>
    </>
);

const abrevContrato = (c) => ({
    obra_labor: 'Obra/Lab', indefinido: 'Indef',
    fijo: 'Fijo', aprendizaje: 'Aprendiz', prestacion_servicios: 'Prest.Serv'
}[c] || c);

const abrevTurno = (t) => ({
    '06-15': '6AM-3PM', '07-16': '7AM-4PM', '08-17': '8AM-5PM'
}[t] || 'Sin turno');

const labelRol = (r) => ({
    admin: 'Admin', gerente: 'Gerente', residente: 'Residente',
    comercial: 'Comercial', contabilidad: 'Contabilidad', secretaria: 'Secretaria',
    supervisor: 'Supervisor', oficial: 'Oficial', ayudante: 'Ayudante', cliente: 'Cliente'
}[r] || r);

const Seccion = ({ titulo, icono, children, abierta = true }) => {
    const [expandida, setExpandida] = useState(abierta);
    return (
        <div className="seccion-card">
            <div onClick={() => setExpandida(!expandida)} className="seccion-header">
                <span>{expandida ? '▼' : '▶'}</span>
                <span>{icono}</span>
                <span>{titulo}</span>
            </div>
            {expandida && (
                <div className="seccion-content">{children}</div>
            )}
        </div>
    );
};

const RolBadge = ({ rol }) => (
    <span className={`rol-badge rol-${rol || 'admin'}`}>
        {labelRol(rol)}
    </span>
);

const EstadoBadge = ({ estado }) => {
    const map = {
        activo: 'estado-activo-bg',
        vacaciones: 'estado-vacaciones-bg',
        incapacitado: 'estado-incapacitado-bg',
        suspendido: 'estado-suspendido-bg',
        retirado: 'estado-retirado-bg'
    };
    const mapLabel = {
        activo: 'ACTIVO', vacaciones: 'VACACIONES',
        incapacitado: 'INCAPACITADO', suspendido: 'SUSPENDIDO', retirado: 'RETIRADO'
    };
    return (
        <span className={`estado-badge ${map[estado] || map.activo}`}>
            {mapLabel[estado] || 'ACTIVO'}
        </span>
    );
};

const ArlBadge = ({ nivel }) => {
    let colorClass = 'arl-verde';
    if (nivel >= 4) colorClass = 'arl-rojo';
    else if (nivel >= 2) colorClass = 'arl-naranja';
    return (
        <span className={`arl-badge ${colorClass}`}>
            {nivel || 1}
        </span>
    );
};

const Tooltip = ({ text, children }) => {
    const [show, setShow] = useState(false);
    return (
        <span className="tooltip-wrapper"
            onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            {show && (
                <span className="tooltip-text">
                    {text}
                    <span className="tooltip-arrow"></span>
                </span>
            )}
        </span>
    );
};

const CampoPasswordVer = ({ password }) => {
    const [mostrar, setMostrar] = useState(false);
    return (
        <div className="flex items-center gap-2">
            <span className="font-size-13 text-gray">Contrasena:</span>
            <span className="text-mono font-size-13" className={mostrar ? '' : 'password-dots'}>
                {mostrar ? (password || 'N/A') : '••••••••'}
            </span>
            <button onClick={() => setMostrar(!mostrar)} className="btn-icon btn-xs" title={mostrar ? 'Ocultar' : 'Mostrar'}>
                {mostrar ? '🙈' : '👁️'}
            </button>
        </div>
    );
};

// ============================================================
// CONTEXT PARA COMPARTIR EL REF DEL FORMULARIO SIN RE-RENDER
// ============================================================
const FormDataContext = createContext(null);

// ============================================================
// CAMPO MODAL - CADA CAMPO TIENE SU PROPIO ESTADO LOCAL
// ============================================================
const CampoModal = memo(({ label, initialValue, editKey, type = 'text', options = null, nestedKey = null, readOnly = false, soloNumeros = false, soloLetras = false }) => {
    const [val, setVal] = useState(initialValue);
    const formDataRef = useContext(FormDataContext);

    useEffect(() => {
        setVal(initialValue);
    }, [initialValue]);

    if (readOnly) {
        return (
            <p className="modal-readonly-row">
                <strong className="modal-readonly-label">{label}:</strong>{' '}
                <span className="modal-readonly-value">{initialValue}</span>
            </p>
        );
    }

    const handleChange = (e) => {
        let newVal = e.target.value;
        if (soloNumeros) newVal = newVal.replace(/[^0-9]/g, '');
        if (soloLetras) newVal = newVal.replace(/[0-9]/g, '');
        setVal(newVal);
        if (!formDataRef.current) return;
        if (nestedKey) {
            if (!formDataRef.current[nestedKey]) formDataRef.current[nestedKey] = {};
            formDataRef.current[nestedKey][editKey] = newVal;
        } else {
            formDataRef.current[editKey] = newVal;
        }
    };

    const handleKeyDown = (e) => {
        if (!soloNumeros) return;
        const teclasPermitidas = [
            'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Tab', 'Home', 'End', 'Enter', 'Escape'
        ];
        if (teclasPermitidas.includes(e.key)) return;
        if (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
        if (/^[0-9]$/.test(e.key)) return;
        e.preventDefault();
    };

    return (
        <div className="campo-modal">
            <label className="campo-modal-label">{label}</label>
            {options ? (
                <select value={val} onChange={handleChange} className="campo-modal-select">
                    {options}
                </select>
            ) : (
                <input
                    type={type === 'number' ? 'text' : type}
                    value={val}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    inputMode={soloNumeros ? 'numeric' : undefined}
                    className="campo-modal-input"
                />
            )}
        </div>
    );
});

// ============================================================
// MODAL DETALLE - ESTADO PROPIO Y REF COMPARTIDO
// ============================================================
const ModalDetalle = memo(({ usuario, onClose, onGuardar, calcularNomina, modoEdicionInicial = false }) => {
    const navigate = useNavigate();
    const [modoEdicion, setModoEdicion] = useState(modoEdicionInicial);
    const [passwordReseteado, setPasswordReseteado] = useState(null);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const datosEditRef = useRef({...usuario});

    useEffect(() => {
        datosEditRef.current = {...usuario};
        setModoEdicion(modoEdicionInicial);
        setPasswordReseteado(null);
        setMostrarPassword(false);
    }, [usuario, modoEdicionInicial]);

    const resetearPassword = useCallback(() => {
        const nueva = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
        setPasswordReseteado(nueva);
        datosEditRef.current.password = nueva;
    }, []);
const guardar = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // 🔍 1. Agrega esto para depurar en la consola del navegador (F12)
    console.log("DATOS EN REF AL GUARDAR:", datosEditRef.current);

    const datos = datosEditRef.current || {};

    // 2. Validación estricta que contempla undefined, null o cadena vacía:
    const tipoEmpleado = datos.tipoEmpleado ? String(datos.tipoEmpleado).trim() : '';
    const tipoContrato = datos.tipoContrato ? String(datos.tipoContrato).trim() : '';
    const tipoDocumento = datos.tipoDocumento ? String(datos.tipoDocumento).trim() : '';

    if (!tipoEmpleado || tipoEmpleado === '') {
        alert('❌ Debe seleccionar un Tipo de Empleado.');
        return; // DETIENE EL FLUJO AQUÍ
    }

    if (!tipoContrato || tipoContrato === '') {
        alert('❌ Debe seleccionar un Tipo de Contrato.');
        return;
    }

    if (!tipoDocumento || tipoDocumento === '') {
        alert('❌ Debe seleccionar un Tipo de Documento.');
        return;
    }

    // 2. VALIDACIÓN DE SELECTS CON VALOR VACÍO ("")
    // Al dejar "-- Seleccione --", el valor es "" y causa el error de Mongoose
    if (!datos.tipoEmpleado || datos.tipoEmpleado === '') {
        alert('❌ Por favor seleccione un Tipo de Empleado.');
        return;
    }

    if (!datos.tipoContrato || datos.tipoContrato === '') {
        alert('❌ Por favor seleccione un Tipo de Contrato.');
        return;
    }

    if (!datos.tipoDocumento || datos.tipoDocumento === '') {
        alert('❌ Por favor seleccione un Tipo de Documento.');
        return;
    }

    // 3. VALIDACIÓN DE DATOS BANCARIOS (Si aplica)
    if (!datos.datosBancarios?.banco || !datos.datosBancarios?.numeroCuenta?.trim()) {
        alert('❌ Por favor complete la información bancaria.');
        return;
    }

    // 4. VALIDACIONES DE FORMATO
    if (/\d/.test(datos.nombre)) {
        alert('❌ El nombre no debe contener números.');
        return;
    }
    if (!/^\d+$/.test(datos.documento)) {
        alert('❌ El documento solo debe contener números.');
        return;
    }

    // -------------------------------------------------------------
    // SOLO SI PASA TODAS LAS VALIDACIONES, SE EJECUTA EL FETCH
    // -------------------------------------------------------------
    const nomina = calcularNomina(datos.sueldo, datos.tipoContrato, datos.tipoSalario);
    const datosAEnviar = {
        ...datos,
        valorHora: nomina.valorHora,
        recibeAuxilioTransporte: nomina.recibeAuxilio
    };

    try {
        const response = await fetchConAuth('http://localhost:5000/api/usuario/' + datos.email, {
            method: 'PUT',
            body: JSON.stringify(datosAEnviar)
        });

        if (response.status === 401) {
            alert('Sesión expirada.');
            navigate('/login');
            return;
        }

        const result = await response.json();
        if (result.success) {
            alert('✅ Actualizado correctamente');
            onGuardar();
            onClose();
        } else {
            alert('❌ ' + (result.error || 'Error al guardar'));
        }
    } catch (err) {
        alert('❌ Error de conexión');
    }
}, [calcularNomina, onGuardar, onClose]);

    if (!usuario) return null;
    const user = usuario;

    const SeccionModal = ({ titulo, icono, children }) => (
        <div className="modal-section">
            <h4 className="modal-section-title">
                <span>{icono}</span>{titulo}
            </h4>
            {children}
        </div>
    );

    return (
        <FormDataContext.Provider value={datosEditRef}>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div>
                            <h2 className="modal-title">
                                {modoEdicion ? '✏️ Editar: ' : '👤 '}{user.nombre}
                            </h2>
                            <p className="modal-subtitle">{user.email} · {labelRol(user.rol)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {!modoEdicion ? (
                                <button onClick={() => { setModoEdicion(true); setPasswordReseteado(null); }}
                                    className="btn-warning">
                                    ✏️ Editar
                                </button>
                            ) : (
                                <>
                                    <button type="submit" onClick={guardar} className="btn-success">💾 Guardar</button>
                                    <button onClick={() => { setModoEdicion(false); datosEditRef.current = {...usuario}; setPasswordReseteado(null); setMostrarPassword(false); }}
                                        className="btn-secondary">
                                        Cancelar
                                    </button>
                                </>
                            )}
                            <button onClick={onClose} className="btn-link ml-2">✕</button>
                        </div>
                    </div>

                    <div className="modal-body">
                        <div className="modal-grid">
                            <div>
                                <SeccionModal titulo="Información Laboral" icono="👤">
                                    <CampoModal label="Nombre" initialValue={user.nombre} editKey="nombre" soloLetras={true} readOnly={!modoEdicion} />
                                    <CampoModal label="Correo Corporativo" initialValue={user.email} editKey="email" readOnly={!modoEdicion} />
                                    <CampoModal label="Documento" initialValue={user.documento} editKey="documento" soloNumeros={true} readOnly={!modoEdicion} />
                                    <CampoModal label="Cargo" initialValue={user.cargo} editKey="cargo" readOnly={!modoEdicion} />
                                    <CampoModal label="Rol" initialValue={user.rol} editKey="rol"
                                        options={
                                            <><option value="">-- Seleccione --</option><option value="admin">Admin</option><option value="gerente">Gerente</option><option value="residente">Residente</option><option value="comercial">Comercial</option><option value="contabilidad">Contabilidad</option><option value="secretaria">Secretaria</option><option value="supervisor">Supervisor</option><option value="oficial">Oficial</option><option value="ayudante">Ayudante</option><option value="cliente">Cliente</option></>
                                        } readOnly={!modoEdicion} />
                                    <CampoModal label="Sueldo Base" initialValue={user.sueldo} editKey="sueldo" type="number" soloNumeros={true} readOnly={!modoEdicion} />
                                    <CampoModal label="Valor Hora" initialValue={`$${(user.valorHora != null ? user.valorHora : calcularNomina(user.sueldo, user.tipoContrato, user.tipoSalario).valorHora || 0).toLocaleString()}`} readOnly={true} />
                                    <CampoModal label="Fecha Ingreso" initialValue={user.fechaIngreso ? new Date(user.fechaIngreso).toISOString().split('T')[0] : ''} editKey="fechaIngreso" type="date" readOnly={!modoEdicion} />
                                    <CampoModal label="Tipo Contrato" initialValue={user.tipoContrato} editKey="tipoContrato"
                                        options={
                                            <><option value="">-- Seleccione --</option><option value="obra_labor">Obra / Labor</option><option value="indefinido">Termino Indefinido</option><option value="fijo">Termino Fijo</option><option value="aprendizaje">Aprendizaje</option><option value="prestacion_servicios">Prestacion de Servicios</option></>
                                        } readOnly={!modoEdicion} />
                                    <CampoModal label="Tipo Empleado" initialValue={user.tipoEmpleado || ''} editKey="tipoEmpleado"
                                        options={
                                            <><option value="">-- Seleccione --</option><option value="obra">Obra</option><option value="planta">Planta</option><option value="residente">Residente</option></>
                                        } readOnly={!modoEdicion} />
                                    <CampoModal label="Turno" initialValue={user.turnoAsignado || ''} editKey="turnoAsignado"
                                        options={
                                            <><option value="">Sin turno fijo</option><option value="06-15">6:00 AM - 3:00 PM</option><option value="07-16">7:00 AM - 4:00 PM</option><option value="08-17">8:00 AM - 5:00 PM</option></>
                                        } readOnly={!modoEdicion} />
                                    <CampoModal label="Estado" initialValue={user.estadoLaboral || 'activo'} editKey="estadoLaboral"
                                        options={
                                            <><option value="activo">Activo</option><option value="vacaciones">Vacaciones</option><option value="incapacitado">Incapacitado</option><option value="suspendido">Suspendido</option></>
                                        } readOnly={!modoEdicion} />
                                </SeccionModal>

                                <SeccionModal titulo="Seguridad" icono="🔐">
                                    {!modoEdicion ? (
                                        <div>
                                            <CampoPasswordVer password={datosEditRef.current?.password} />
                                            <button onClick={resetearPassword} className="btn-primary btn-small mt-2">
                                                🔄 Resetear Contrasena
                                            </button>
                                            {passwordReseteado && (
                                                <div className="password-box">
                                                    <p className="password-title">✅ Nueva contrasena generada:</p>
                                                    <p className="password-value">{passwordReseteado}</p>
                                                    <p className="password-hint">Copie esta contrasena. Solo se mostrara una vez.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="campo-modal-label">Nueva Contrasena</label>
                                            <div className="password-input-group">
                                                <input type={mostrarPassword ? 'text' : 'password'} defaultValue={''}
                                                    onChange={(e) => { datosEditRef.current.password = e.target.value; }}
                                                    className="password-input"
                                                    placeholder="Dejar vacio para no cambiar" />
                                                <button onClick={() => setMostrarPassword(!mostrarPassword)}
                                                    className="btn-icon">
                                                    {mostrarPassword ? '🙈' : '👁️'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </SeccionModal>
                            </div>

                            <div>
                                <SeccionModal titulo="Seguridad Social" icono="🏥">
                                    <CampoModal label="EPS" initialValue={user.eps || ''} editKey="eps" soloLetras={true} readOnly={!modoEdicion} />
                                    <CampoModal label="Fondo Pension" initialValue={user.fondoPension || ''} editKey="fondoPension"
                                        options={
                                            <><option value="">-- Seleccione --</option><option value="Porvenir">Porvenir</option><option value="Proteccion">Proteccion</option><option value="Colfondos">Colfondos</option><option value="Skandia">Skandia</option><option value="Colpensiones">Colpensiones</option></>
                                        } readOnly={!modoEdicion} />
                                    <CampoModal label="Fondo Cesantias" initialValue={user.fondoCesantias || ''} editKey="fondoCesantias"
                                        options={
                                            <><option value="">-- Seleccione --</option><option value="PORVENIR">Porvenir</option><option value="PROTECCION">Proteccion</option><option value="COLFONDOS">Colfondos</option><option value="SKANDIA">Skandia</option><option value="COLPENSIONES">Colpensiones</option><option value="FNA">FNA</option></>
                                        } readOnly={!modoEdicion} />
                                    <CampoModal label="Nivel ARL" initialValue={getNivelARLByRol(user.rol)} readOnly={true} />
                                    <CampoModal label="Caja Compensacion" initialValue={user.cajaCompensacion || ''} editKey="cajaCompensacion"
                                        options={
                                            <><option value="">-- Seleccione --</option><option value="Colsubsidio">Colsubsidio</option><option value="Cafam">Cafam</option><option value="Comfamiliar">Comfamiliar</option><option value="Compensar">Compensar</option></>
                                        } readOnly={!modoEdicion} />
                                    <CampoModal
                                        label="Numero de Cuenta Fondo"
                                        initialValue={user.numeroCuentaFondo || ''}
                                        editKey="numeroCuentaFondo"
                                        soloNumeros={true}
                                        readOnly={!modoEdicion} />
                                </SeccionModal>

                                <SeccionModal titulo="Datos Bancarios" icono="💳">
                                    {(user.datosBancarios || modoEdicion) ? (
                                        <>
                                            <CampoModal
                                                label="Banco "
                                                initialValue={user.datosBancarios?.banco || ''}
                                                editKey="banco"
                                                nestedKey="datosBancarios"
                                                options={
                                                    <><option value="">-- Seleccione --</option>
                                                    <option value="Bancolombia">Bancolombia</option>
                                                    <option value="Davivienda">Banco Davivienda</option>
                                                    <option value="BBVA">Banco BBVA Colombia</option>
                                                    <option value="Bogota">Banco de Bogota</option>
                                                    <option value="Caja Social">Banco Caja Social</option>
                                                    <option value="Popular">Banco Popular</option>
                                                    <option value="GNB Sudameris">Banco GNB Sudameris</option>
                                                    <option value="Agrario">Banco Agrario de Colombia</option>
                                                    <option value="Occidente">Banco de Occidente</option>
                                                    <option value="AV Villas">Banco Comercial AV Villas</option>
                                                    <option value="Colpatria">Scotiabank Colpatria</option>
                                                    <option value="Itau">Itau Colombia</option>
                                                    <option value="Nequi">Nequi</option>
                                                    <option value="Daviplata">Daviplata</option></>
                                                }
                                                readOnly={!modoEdicion} />
                                            <CampoModal
                                                label="Tipo de Cuenta "
                                                initialValue={user.datosBancarios?.tipoCuenta || 'ahorros'}
                                                editKey="tipoCuenta"
                                                nestedKey="datosBancarios"
                                                options={
                                                    <><option value="ahorros">Ahorros</option>
                                                    <option value="corriente">Corriente</option></>
                                                }
                                                readOnly={!modoEdicion} />
                                            <CampoModal
                                                label="Numero de Cuenta "
                                                initialValue={user.datosBancarios?.numeroCuenta || ''}
                                                editKey="numeroCuenta"
                                                nestedKey="datosBancarios"
                                                soloNumeros={true}
                                                readOnly={!modoEdicion} />
                                        </>
                                    ) : (
                                        <p className="text-red font-size-13">❌ No registrados</p>
                                    )}
                                </SeccionModal>

                                <SeccionModal titulo="Configuracion Nomina" icono="💰">
                                    <CampoModal
                                        label="Auxilio Transporte"
                                        initialValue={user.recibeAuxilioTransporte ? 'true' : 'false'}
                                        editKey="recibeAuxilioTransporte"
                                        options={
                                            <><option value="true">✅ Si recibe</option>
                                            <option value="false">❌ No recibe</option></>
                                        }
                                        readOnly={!modoEdicion} />
                                    <CampoModal
                                        label="Tipo Salario"
                                        initialValue={user.tipoSalario || 'fijo_mensual'}
                                        editKey="tipoSalario"
                                        options={
                                            <><option value="fijo_mensual">Fijo Mensual</option>
                                            <option value="fijo_quincenal">Fijo Quincenal</option>
                                            <option value="por_hora">Por Hora (Obra/Labor)</option></>
                                        }
                                        readOnly={!modoEdicion} />
                                </SeccionModal>
                            </div>
                        </div>

                        {user.documentosCargados && user.documentosCargados.length > 0 && (
                            <div className="mt-4">
                                <h4 className="modal-section-title-sm">📎 Documentos</h4>
                                <ul className="doc-list">
                                    {user.documentosCargados.map((doc, idx) => (
                                        <li key={idx}>
                                            <a href={doc.url} target="_blank" rel="noreferrer" className="doc-link">
                                                📄 {doc.tipo}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button onClick={onClose} className="btn-primary">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </FormDataContext.Provider>
    );
});

// ============================================================
// GESTION USUARIOS — ESTRUCTURA ALINEADA CON ADMIN.JS
// ============================================================
function GestionUsuarios() {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [vistaActiva, setVistaActiva] = useState('activos');
    const [nuevoUsuario, setNuevoUsuario] = useState({
        nombre: '', email: '', password: '', tipoDocumento: '', documento: '',
        cargo: '', sueldo: '', fechaIngreso: '', rol: '',
        eps: '', fondoPension: '', fondoCesantias: '', numeroCuentaFondo: '',
        cajaCompensacion: '',
        datosBancarios: { banco: '', tipoCuenta: 'ahorros', numeroCuenta: '' },
        tipoContrato: '', tipoSalario: 'por_hora', recibeAuxilioTransporte: true,
        tipoEmpleado: '', turnoAsignado: '', estadoLaboral: 'activo'
    });
    const [filtroRol, setFiltroRol] = useState('');
    const [busquedaTexto, setBusquedaTexto] = useState('');
    const [usuarioDetalle, setUsuarioDetalle] = useState(null);
    const [modoEdicionInicial, setModoEdicionInicial] = useState(false);
    const [errores, setErrores] = useState({});

    const cargarUsuarios = useCallback(() => {
        const endpoint = vistaActiva === 'activos'
            ? 'http://localhost:5000/api/usuarios/activos'
            : 'http://localhost:5000/api/usuarios/retirados';
        fetchConAuth(endpoint)
            .then(res => {
                if (res.status === 401) {
                    alert('Sesion expirada. Inicie sesion nuevamente.');
                    navigate('/login');
                    throw new Error('No autorizado');
                }
                return res.json();
            })
            .then(resJson => {
                if (resJson.success) setUsuarios(resJson.data);
            })
            .catch(err => console.error('Error al cargar:', err));
    }, [vistaActiva]);

    useEffect(() => {
        if (!esAdmin()) {
            alert('Acceso denegado.');
            navigate('/admin');
        } else {
            cargarUsuarios();
        }
    }, [cargarUsuarios]);

    const calcularNomina = useCallback((sueldo, tipoContrato, tipoSalario) => {
        const sueldoNum = Number(sueldo) || 0;
        return {
            valorHora: calcularValorHora(sueldoNum, tipoContrato, tipoSalario),
            recibeAuxilio: debeRecibirAuxilio(sueldoNum),
            topeAuxilio: TOPE_AUXILIO,
            auxilioMensual: calcularAuxilioTransporte(sueldoNum, 30)
        };
    }, []);

    const validarFormulario = useCallback(() => {
        const errs = {};
        if (!nuevoUsuario.nombre) errs.nombre = 'Obligatorio';
        else if (/\d/.test(nuevoUsuario.nombre)) errs.nombre = 'No debe contener números';

        if (!nuevoUsuario.email) errs.email = 'Obligatorio';
        if (!nuevoUsuario.password) errs.password = 'Obligatorio';
        if (!nuevoUsuario.documento) errs.documento = 'Obligatorio';
        else if (!/^\d+$/.test(nuevoUsuario.documento)) errs.documento = 'Solo números permitidos';

        if (!nuevoUsuario.cargo) errs.cargo = 'Obligatorio';
        if (!nuevoUsuario.sueldo || Number(nuevoUsuario.sueldo) <= 0) errs.sueldo = 'Debe ser mayor a 0';
        if (!nuevoUsuario.fechaIngreso) errs.fechaIngreso = 'Obligatorio';
        if (!nuevoUsuario.rol) errs.rol = 'Obligatorio';

        if (!nuevoUsuario.eps) errs.eps = 'Obligatorio';
        else if (/\d/.test(nuevoUsuario.eps)) errs.eps = 'No debe contener números';

        if (!nuevoUsuario.fondoPension) errs.fondoPension = 'Obligatorio';
        if (!nuevoUsuario.datosBancarios.banco) errs.banco = 'Obligatorio';
        if (!nuevoUsuario.datosBancarios.numeroCuenta) errs.numeroCuenta = 'Obligatorio';
        else if (!/^\d+$/.test(nuevoUsuario.datosBancarios.numeroCuenta)) errs.numeroCuenta = 'Solo números permitidos';

        if (!nuevoUsuario.tipoContrato) errs.tipoContrato = 'Obligatorio';

        if (nuevoUsuario.numeroCuentaFondo && !/^\d+$/.test(nuevoUsuario.numeroCuentaFondo)) {
            errs.numeroCuentaFondo = 'Solo números permitidos';
        }

        setErrores(errs);
        return Object.keys(errs).length === 0;
    }, [nuevoUsuario]);

    const manejarCrear = useCallback(async (e) => {
        e.preventDefault();
        if (!validarFormulario()) return;
        const nomina = calcularNomina(nuevoUsuario.sueldo, nuevoUsuario.tipoContrato, nuevoUsuario.tipoSalario);
        const dataEnviar = {
            ...nuevoUsuario,
            sueldo: Number(nuevoUsuario.sueldo),
            nivelARL: getNivelARLByRol(nuevoUsuario.rol),
            valorHora: nomina.valorHora,
            recibeAuxilioTransporte: nomina.recibeAuxilio
        };
        try {
            const response = await fetchConAuth('http://localhost:5000/api/usuarios', {
                method: 'POST', body: JSON.stringify(dataEnviar)
            });
            const data = await response.json();
            if (data.success) {
                alert('✅ Usuario creado exitosamente');
                setNuevoUsuario({
                    nombre: '', email: '', password: '', tipoDocumento: '', documento: '',
                    cargo: '', sueldo: '', fechaIngreso: '', rol: '',
                    eps: '', fondoPension: '', fondoCesantias: '', numeroCuentaFondo: '',
                    cajaCompensacion: '',
                    datosBancarios: { banco: '', tipoCuenta: 'ahorros', numeroCuenta: '' },
                    tipoContrato: '', tipoSalario: 'por_hora', recibeAuxilioTransporte: true,
                    tipoEmpleado: '', turnoAsignado: '', estadoLaboral: 'activo'
                });
                setErrores({}); cargarUsuarios();
            } else {
                alert('❌ Error: ' + (data.error || 'No se pudo crear'));
            }
        } catch (err) { alert('❌ Error de conexion'); }
    }, [nuevoUsuario, validarFormulario, calcularNomina, cargarUsuarios]);

    const verUsuario = useCallback((user) => {
        setModoEdicionInicial(false);
        setUsuarioDetalle(user);
    }, []);

    const iniciarEdicion = useCallback((user) => {
        setModoEdicionInicial(true);
        setUsuarioDetalle(user);
    }, []);

    const eliminarUsuario = useCallback(async (id) => {
        if (window.confirm('¿Eliminar usuario permanentemente?')) {
            try {
                await fetchConAuth('http://localhost:5000/api/usuarios/' + id, { method: 'DELETE' });
                cargarUsuarios();
            }
            catch (err) { alert('❌ Error al eliminar'); }
        }
    }, [cargarUsuarios]);

    const usuariosFiltrados = usuarios.filter(u => {
        const coincideRol = filtroRol === '' || u.rol === filtroRol;
        const termino = busquedaTexto.toLowerCase();
        const coincideTexto = (u.nombre || '').toLowerCase().includes(termino) ||
            (u.documento || '').includes(termino) || (u.cargo || '').toLowerCase().includes(termino);
        return coincideRol && coincideTexto;
    });

    
// Detectar rol del usuario desde localStorage o default
const userRol = localStorage.getItem('rol') || 'ADMIN';
    
    return (
      <div className="dba-container">
        <div className="dba-wrapper">
            <div className="dba-header-text">
                <h1 className="dba-title">👥 Gestión de Usuarios</h1>
                <p className="dba-subtitle">
                    Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                </p>
            </div>

            {/* TABS ACTIVOS / RETIRADOS */}
            <div className="tabs-container">
                {[
                    { key: 'activos', label: '✅ Personal Activo', color: '#2e7d32' },
                    { key: 'retirados', label: '📋 Historial Retirados', color: '#c62828' },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setVistaActiva(tab.key)}
                        className={`tab-button ${vistaActiva === tab.key ? 'tab-button-active' : ''}`}
                        style={{ color: vistaActiva === tab.key ? tab.color : '#666' }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* FILTROS */}
            <div className="filtro-container">
                <input type="text" placeholder="🔍 Buscar por nombre, cedula o cargo..."
                    value={busquedaTexto} onChange={(e) => setBusquedaTexto(e.target.value)}
                    className="filtro-input" />
                <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
                    <option value="">Todos los roles</option>
                    <OpcionesRol />
                </select>
            </div>

            {/* FORMULARIO CREACION (solo en vista activos) */}
            {vistaActiva === 'activos' && (
                <form onSubmit={manejarCrear} className="form-crear">

                    {/* SECCION 1: INFORMACION BASICA */}
                    <Seccion titulo="Información Basica" icono="👤" abierta={false}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nombre(s) y Apellido(s) *</label>
                                <input type="text" value={nuevoUsuario.nombre} placeholder="Nombres completos"
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[0-9]/g, '');
                                        setNuevoUsuario({ ...nuevoUsuario, nombre: val });
                                    }}
                                    className={errores.nombre ? 'input-error' : ''} />
                                {errores.nombre && <span className="form-error">{errores.nombre}</span>}
                            </div>
                            <div className="form-group">
                                <label>Correo Corporativo *</label>
                                <input type="email" value={nuevoUsuario.email} placeholder="correo@neo.com"
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                                    className={errores.email ? 'input-error' : ''} />
                                {errores.email && <span className="form-error">{errores.email}</span>}
                            </div>
                            <div className="form-group">
                                <label>Contrasena *</label>
                                <input type="password" value={nuevoUsuario.password} placeholder="Contrasena"
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                                    className={errores.password ? 'input-error' : ''} />
                                {errores.password && <span className="form-error">{errores.password}</span>}
                            </div>
                            <div className="form-group">
                                <label>Tipo Documento *</label>
                                <select value={nuevoUsuario.tipoDocumento}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, tipoDocumento: e.target.value })}>
                                    <OpcionesTipoDocumento />
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Numero Documento *</label>
                                <input type="text" value={nuevoUsuario.documento} placeholder="Numero de documento"
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setNuevoUsuario({ ...nuevoUsuario, documento: val });
                                    }}
                                    className={errores.documento ? 'input-error' : ''} />
                                {errores.documento && <span className="form-error">{errores.documento}</span>}
                            </div>
                            <div className="form-group">
                                <label>Cargo *</label>
                                <input type="text" value={nuevoUsuario.cargo} placeholder="Ej: Ingeniero, Oficial, Ayudante"
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, cargo: e.target.value })}
                                    className={errores.cargo ? 'input-error' : ''} />
                                {errores.cargo && <span className="form-error">{errores.cargo}</span>}
                            </div>
                            <div className="form-group">
                                <label>Sueldo Base *</label>
                                <input type="number" value={nuevoUsuario.sueldo} placeholder="0" min="0"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || Number(val) >= 0) {
                                            setNuevoUsuario({ ...nuevoUsuario, sueldo: val });
                                        }
                                    }}
                                    className={errores.sueldo ? 'input-error' : ''} />
                                {errores.sueldo && <span className="form-error">{errores.sueldo}</span>}
                                {nuevoUsuario.sueldo > 0 && (
                                    <span className="font-size-11 text-gray block mt-1">
                                        {(() => {
                                            const sueldoNum = Number(nuevoUsuario.sueldo);
                                            if (sueldoNum < SMLV) return `❌ Minimo legal: $${SMLV.toLocaleString('es-CO')}`;
                                            if (sueldoNum <= TOPE_AUXILIO) return `✅ Recibe auxilio transporte: $${AUXILIO_TRANSPORTE.toLocaleString('es-CO')} (Tope: $${TOPE_AUXILIO.toLocaleString('es-CO')})`;
                                            return `❌ No recibe auxilio (Supera tope: $${TOPE_AUXILIO.toLocaleString('es-CO')})`;
                                        })()}
                                        {' | '}
                                        Valor hora: ${calcularNomina(nuevoUsuario.sueldo, nuevoUsuario.tipoContrato, nuevoUsuario.tipoSalario).valorHora.toLocaleString('es-CO')}
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Fecha Ingreso *</label>
                                <input type="date" value={nuevoUsuario.fechaIngreso}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, fechaIngreso: e.target.value })}
                                    className={errores.fechaIngreso ? 'input-error' : ''} />
                                {errores.fechaIngreso && <span className="form-error">{errores.fechaIngreso}</span>}
                            </div>
                            <div className="form-group">
                                <label>Rol *</label>
                                <select value={nuevoUsuario.rol}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                                    className={errores.rol ? 'input-error' : ''}>
                                    <OpcionesRol />
                                </select>
                                {nuevoUsuario.rol && (
                                    <span className="font-size-11 text-blue block mt-1">
                                        Nivel ARL asignado: {getNivelARLByRol(nuevoUsuario.rol)}
                                        ({getNivelARLByRol(nuevoUsuario.rol) === 1 ? 'Oficina' : getNivelARLByRol(nuevoUsuario.rol) === 2 ? 'Tecnico' : 'Obra'})
                                    </span>
                                )}
                                {errores.rol && <span className="form-error">{errores.rol}</span>}
                            </div>
                        </div>
                    </Seccion>

                    {/* SECCION 2: SEGURIDAD SOCIAL */}
                    <Seccion titulo="Seguridad Social" icono="🏥" abierta={false}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>EPS *</label>
                                <input type="text" value={nuevoUsuario.eps} placeholder="Ej: Sanitas, Sura, Nueva EPS"
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[0-9]/g, '');
                                        setNuevoUsuario({ ...nuevoUsuario, eps: val });
                                    }}
                                    className={errores.eps ? 'input-error' : ''} />
                                {errores.eps && <span className="form-error">{errores.eps}</span>}
                            </div>
                            <div className="form-group">
                                <label>Fondo de Pensiones *</label>
                                <select value={nuevoUsuario.fondoPension}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, fondoPension: e.target.value })}
                                    className={errores.fondoPension ? 'input-error' : ''}>
                                    <OpcionesFondoPension />
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Fondo de Cesantias *</label>
                                <select value={nuevoUsuario.fondoCesantias}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, fondoCesantias: e.target.value })}>
                                    <OpcionesFondoCesantias />
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Numero Cuenta Fondo *</label>
                                <input type="text" value={nuevoUsuario.numeroCuentaFondo} placeholder="Numero de cuenta"
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setNuevoUsuario({ ...nuevoUsuario, numeroCuentaFondo: val });
                                    }} />
                            </div>
                            <div className="form-group">
                                <label>Caja de Compensacion *</label>
                                <select value={nuevoUsuario.cajaCompensacion}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, cajaCompensacion: e.target.value })}>
                                    <OpcionesCajaCompensacion />
                                </select>
                            </div>
                        </div>
                    </Seccion>

                    {/* SECCION 3: DATOS BANCARIOS */}
                    <Seccion titulo="Datos Bancarios " icono="💳" abierta={false}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Banco *</label>
                                <select value={nuevoUsuario.datosBancarios.banco}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, datosBancarios: { ...nuevoUsuario.datosBancarios, banco: e.target.value } })}
                                    className={errores.banco ? 'input-error' : ''}>
                                    <OpcionesBanco />
                                </select>
                                {errores.banco && <span className="form-error">{errores.banco}</span>}
                            </div>
                            <div className="form-group">
                                <label>Tipo de Cuenta *</label>
                                <select value={nuevoUsuario.datosBancarios.tipoCuenta}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, datosBancarios: { ...nuevoUsuario.datosBancarios, tipoCuenta: e.target.value } })}>
                                    <option value="ahorros">Ahorros</option>
                                    <option value="corriente">Corriente</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Numero de Cuenta *</label>
                                <input type="text" value={nuevoUsuario.datosBancarios.numeroCuenta} placeholder="Numero de cuenta"
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setNuevoUsuario({ ...nuevoUsuario, datosBancarios: { ...nuevoUsuario.datosBancarios, numeroCuenta: val } });
                                    }}
                                    className={errores.numeroCuenta ? 'input-error' : ''} />
                                {errores.numeroCuenta && <span className="form-error">{errores.numeroCuenta}</span>}
                            </div>
                        </div>
                    </Seccion>

                    {/* SECCION 4: CONFIGURACION NOMINA */}
                    <Seccion titulo="Configuracion Nomina" icono="💰" abierta={false}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Tipo de Contrato *</label>
                                <select value={nuevoUsuario.tipoContrato}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, tipoContrato: e.target.value })}
                                    className={errores.tipoContrato ? 'input-error' : ''}>
                                    <OpcionesTipoContrato />
                                </select>
                                {errores.tipoContrato && <span className="form-error">{errores.tipoContrato}</span>}
                            </div>
                            <div className="form-group">
                                <label>Tipo de Salario *</label>
                                <select value={nuevoUsuario.tipoSalario}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, tipoSalario: e.target.value })}>
                                    <OpcionesTipoSalario />
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Tipo de Empleado *</label>
                                <select value={nuevoUsuario.tipoEmpleado}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, tipoEmpleado: e.target.value })}>
                                    <OpcionesTipoEmpleado />
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Turno Asignado *</label>
                                <select value={nuevoUsuario.turnoAsignado}
                                    onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, turnoAsignado: e.target.value })}>
                                    <OpcionesTurno />
                                </select>
                            </div>
                        </div>
                    </Seccion>

                    <button type="submit" className="btn-guardar btn-guardar-mt">
                        + Agregar Personal
                    </button>
                </form>
            )}

            {/* TABLA DE USUARIOS */}
            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Correo Corporativo</th>
                            <th className="text-center">Rol</th>
                            <th className="text-center">Doc</th>
                            <th>Cargo</th>
                            <th className="text-right">Sueldo</th>
                            <th className="text-center">ARL</th>
                            <th className="text-center">Contrato</th>
                            <th className="text-center">Turno</th>
                            <th className="text-center">Estado</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuariosFiltrados.map((user, idx) => (
                            <tr key={user._id} className={idx % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                                <td data-label="Nombre">
                                    <strong className="font-size-13 text-dark">{user.nombre}</strong>
                                    {user.liquidacionGenerada && (
                                        <span className="font-size-10 text-red block">⚠️ Liquidado</span>
                                    )}
                                </td>
                                <td data-label="Email">
                                    <Tooltip text={user.email}>
                                        <span className="font-size-12 text-gray text-ellipsis">
                                            {user.email}
                                        </span>
                                    </Tooltip>
                                </td>
                                <td data-label="Rol" className="text-center">
                                    <RolBadge rol={user.rol} />
                                </td>
                                <td data-label="Doc" className="text-center font-size-12 text-gray text-mono">
                                    {user.documento}
                                </td>
                                <td data-label="Cargo" className="font-size-13 text-gray">
                                    {user.cargo}
                                </td>
                                <td data-label="Sueldo" className="text-right font-size-13 font-bold text-green text-mono">
                                    ${(user.sueldo || 0).toLocaleString()}
                                </td>
                                <td data-label="ARL" className="text-center">
                                    <ArlBadge nivel={getNivelARLByRol(user.rol)} />
                                </td>
                                <td data-label="Contrato" className="text-center">
                                    <span className="tag-gray">{abrevContrato(user.tipoContrato)}</span>
                                </td>
                                <td data-label="Turno" className="text-center font-size-12 text-gray">
                                    {abrevTurno(user.turnoAsignado)}
                                </td>
                                <td data-label="Estado" className="text-center">
                                    <EstadoBadge estado={user.estadoLaboral} />
                                </td>
                                <td data-label="Acciones" className="text-center">
                                    <div className="acciones-flex">
                                        <button onClick={() => verUsuario(user)}
                                            className="btn-xs btn-info-outline">
                                            👁️Ver
                                        </button>
                                        {vistaActiva === 'activos' && (
                                            <>
                                                <button onClick={() => iniciarEdicion(user)}
                                                    className="btn-xs btn-warning-outline">
                                                    ✏️ Editar
                                                </button>
                                                <button onClick={() => eliminarUsuario(user._id)}
                                                    className="btn-xs btn-danger-outline">
                                                    🗑️ Eliminar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {usuariosFiltrados.length === 0 && (
                    <div className="text-center text-gray no-results">
                        No se encontraron resultados
                    </div>
                )}
            </div>

            {/* MODAL DETALLE */}
            {usuarioDetalle && (
                <ModalDetalle
                    usuario={usuarioDetalle}
                    onClose={() => setUsuarioDetalle(null)}
                    onGuardar={cargarUsuarios}
                    calcularNomina={calcularNomina}
                    modoEdicionInicial={modoEdicionInicial}
                />
            )}
            {/* Barra de Operaciones Inferior */}
            <div className="db-actions-group">
                <button onClick={() => navigate('/admin')} className="btn-primary">⚙️ Inicio </button>
            </div>
        </div>
    </div>
    );
}

export default GestionUsuarios;