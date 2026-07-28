import React, { useState, useEffect } from 'react';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...opciones.headers
    };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return fetch(url, {
        ...opciones,
        headers
    });
};

const Seccion = ({ titulo, icono, children, abierta = true }) => {
    const [expandida, setExpandida] = useState(abierta);
    return (
        <div className="dba-seccion-card">
            <div onClick={() => setExpandida(!expandida)} className="dba-seccion-header">
                <span>{expandida ? '▼' : '▶'}</span>
                <span>{icono}</span>
                <span>{titulo}</span>
            </div>
            {expandida && (
                <div className="dba-seccion-content">{children}</div>
            )}
        </div>
    );
};

function RegistroLaboral({ emailUsuario }) {
    const [registro, setRegistro] = useState({
        tipoId: '', tipoDocumento: '', fechaExpedicion: '', paisExp: '', deptoExp: '',
        nombre: '', fechaNacimiento: '', emailPersonal: '', email: '', estadoCivil: '',
        tipoSangre: '', sexo: '', libretaMilitar: '', eps: '', cargo: '', fechaIngreso: '',
        sueldo: '', paisRes: '', deptoRes: '', municipio: '', zona: '', barrio: '',
        direccion: '', telefono: '', movil: '', nombreContacto: '', telContacto: '',
        movilContacto: '', parentesco: '', tipoDocumental: '', documentosCargados: []
    });

    const [otroSexo, setOtroSexo] = useState(false);
    const [tempDoc, setTempDoc] = useState({ tipo: '', url: '' });

    const rolUsuario = localStorage.getItem('rol');
    const esAdministrador = rolUsuario === 'admin';

    useEffect(() => {
        const emailAUsar = emailUsuario || localStorage.getItem('email');
        const cargarDatos = async () => {
    if (!emailAUsar) return;
    try {
        const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/usuario/${emailAUsar}`);
        if (res.status === 401) {
            alert('Sesion expirada. Inicie sesion nuevamente.');
            window.location.href = '/login';
            return;
        }
                const data = await res.json();
                if (data.success) {
                    setRegistro(prev => ({ ...prev, ...data.data }));
                }
            } catch (err) {
                console.error('Error al cargar:', err);
            }
        };
        cargarDatos();
    }, [emailUsuario]);

    const actualizarRegistro = async () => {
        const datosAEnviar = { ...registro, rol: localStorage.getItem('rol') };
        const email = registro.email || emailUsuario || localStorage.getItem('email');
        try {
    const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/usuario/${email}`, {
        method: 'PUT',
        body: JSON.stringify(datosAEnviar)
    });
    if (res.status === 401) {
        alert('Sesion expirada. Inicie sesion nuevamente.');
        window.location.href = '/login';
        return;
    }
            const data = await res.json();
            if (data.success) {
                alert('Registro laboral actualizado correctamente!');
            } else {
                alert('Error al actualizar: ' + (data.error || 'Error desconocido'));
            }
        } catch (err) {
            alert('Error de conexion al servidor');
        }
    };

    const handleChange = (e) => {
        setRegistro({ ...registro, [e.target.name]: e.target.value });
    };

    const handleSexoChange = (e) => {
        const valor = e.target.value;
        setRegistro({ ...registro, sexo: valor });
        setOtroSexo(valor === 'Otro');
    };

    const agregarDocumento = () => {
        if (tempDoc.tipo && tempDoc.url) {
            const nuevoDoc = { id: Date.now(), tipo: tempDoc.tipo, url: tempDoc.url };
            setRegistro({ ...registro, documentosCargados: [...registro.documentosCargados, nuevoDoc] });
            setTempDoc({ tipo: '', url: '' });
        } else {
            alert('Por favor selecciona un tipo y pega una URL valida.');
        }
    };

    const eliminarDocumento = (id) => {
        setRegistro({ ...registro, documentosCargados: registro.documentosCargados.filter(doc => doc.id !== id) });
    };

    const userRol = localStorage.getItem('rol') || 'ADMIN';

    return (
        <div className="dba-container">
            <div className="dba-wrapper">
                <div className="dba-header-text">
                    <h1 className="dba-title">👤 Mí Registro Personal</h1>
                    <p className="dba-subtitle">
                        Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
                    </p>
                </div>

                {/* SECCION 1: DATOS BASICOS */}
                <Seccion titulo="Datos Basicos" icono="📋" abierta={false}>
                    <div className="dba-grid-form">
                        <div className="dba-input-group">
                            <label>Tipo de Documento</label>
                            <select name="tipoDocumento" value={registro.tipoDocumento || ''} onChange={esAdministrador ? handleChange : undefined}
                                className="dba-form-select" required disabled={!esAdministrador}>
                                <option value="">-- Seleccione --</option>
                                <option value="CC">Cédula de Ciudadanía</option>
                                <option value="CE">Cédula de Extranjería</option>
                                <option value="PA">Pasaporte</option>
                            </select>
                        </div>
                        <div className="dba-input-group">
                            <label>Número de Documento</label>
                            <input name="documento" value={registro.documento || ''} readOnly={!esAdministrador}
                                placeholder="Número de documento" onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Fecha de Expedición</label>
                            <input type="date" name="fechaExpedicion" value={registro.fechaExpedicion || ''}
                                onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>País de Expedición</label>
                            <input name="paisExp" value={registro.paisExp || ''} placeholder="País de expedición"
                                onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Departamento de Expedición</label>
                            <input name="deptoExp" value={registro.deptoExp || ''} placeholder="Departamento de expedición"
                                onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Nombre(s) y Apellido(s)</label>
                            <input name="nombre" value={registro.nombre || ''} readOnly={!esAdministrador}
                                placeholder="Nombres" onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Fecha de Nacimiento:</label>
                            <input type="date" name="fechaNacimiento" value={registro.fechaNacimiento || ''}
                                onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Correo electrónico Personal</label>
                            <input type="email" name="emailPersonal" value={registro.emailPersonal || ''}
                                placeholder="Email personal" onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Correo electrónico Corporativo</label>
                            <input type="email" name="email" value={registro.email || ''} readOnly={!esAdministrador}
                                placeholder="Email corporativo" onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Tipo de Sangre</label>
                            <select name="tipoSangre" value={registro.tipoSangre || ''} onChange={handleChange} className="dba-form-select">
                                <option value="">-- Seleccione --</option>
                                <option value="A+">A Positivo (A+)</option>
                                <option value="A-">A Negativo (A-)</option>
                                <option value="B+">B Positivo (B+)</option>
                                <option value="B-">B Negativo (B-)</option>
                                <option value="O+">O Positivo (O+)</option>
                                <option value="O-">O Negativo (O-)</option>
                                <option value="AB+">AB Positivo (AB+)</option>
                                <option value="AB-">AB Negativo (AB-)</option>
                            </select>
                        </div>
                        <div className="dba-input-group">
                            <label>Sexo</label>
                            <select name="sexo" value={registro.sexo || ''} onChange={handleSexoChange} className="dba-form-select">
                                <option value="">-- Seleccione --</option>
                                <option value="Femenino">Femenino</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Otro">Otro</option>
                            </select>
                            {otroSexo && (
                                <input name="sexoOtro" placeholder="Especifique sexo" onChange={handleChange}
                                    className="dba-form-input dba-input-dinamico" />
                            )}
                        </div>
                        <div className="dba-input-group">
                            <label>Estado Civil</label>
                            <select name="estadoCivil" value={registro.estadoCivil || ''} onChange={handleChange} className="dba-form-select">
                                <option value="">-- Seleccione --</option>
                                <option value="Soltero">Soltero(a)</option>
                                <option value="UnionLibre">Unión Libre</option>
                                <option value="Casado">Casado(a)</option>
                                <option value="Separado">Separado(a)</option>
                                <option value="Viudo">Viudo(a)</option>
                            </select>
                        </div>
                        <div className="dba-input-group">
                            <label>Libreta Militar</label>
                            <select name="libretaMilitar" value={registro.libretaMilitar || ''} onChange={handleChange} className="dba-form-select">
                                <option value="">-- Seleccione --</option>
                                <option value="SI">Sí</option>
                                <option value="NO">No</option>
                                <option value="NA">N/A</option>
                            </select>
                        </div>
                        <div className="dba-input-group">
                            <label>Fecha de Ingreso:</label>
                            <input type="date" name="fechaIngreso" value={registro.fechaIngreso || ''}
                                readOnly={!esAdministrador} onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Cargo</label>
                            <input name="cargo" value={registro.cargo || ''} readOnly={!esAdministrador}
                                placeholder="Cargo" onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Sueldo</label>
                            <input name="sueldo" value={registro.sueldo || ''} readOnly={!esAdministrador}
                                placeholder="Sueldo" onChange={handleChange} required className="dba-form-input" />
                        </div>
                    </div>
                </Seccion>

                {/* SECCION 2: LUGAR DE RESIDENCIA */}
                <Seccion titulo="Lugar de Residencia" icono="🏠" abierta={false}>
                    <div className="dba-grid-form">
                        <div className="dba-input-group">
                            <label>País</label>
                            <input name="paisRes" value={registro.paisRes || ''} placeholder="País"
                                onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Departamento</label>
                            <input name="deptoRes" value={registro.deptoRes || ''} placeholder="Departamento"
                                onChange={handleChange} className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Municipio</label>
                            <input name="municipio" value={registro.municipio || ''} placeholder="Municipio"
                                onChange={handleChange} className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Zona</label>
                            <input name="zona" value={registro.zona || ''} placeholder="Zona"
                                onChange={handleChange} className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Barrio</label>
                            <input name="barrio" value={registro.barrio || ''} placeholder="Barrio"
                                onChange={handleChange} className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Dirección</label>
                            <input type="text" name="direccion" value={registro.direccion || ''}
                                placeholder="Dirección" onChange={handleChange} required className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Teléfono fijo</label>
                            <input name="telefono" value={registro.telefono || ''} placeholder="Teléfono fijo"
                                onChange={handleChange} className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Teléfono móvil</label>
                            <input name="movil" value={registro.movil || ''} placeholder="Teléfono móvil"
                                onChange={handleChange} className="dba-form-input" />
                        </div>
                    </div>
                </Seccion>

                {/* SECCION 3: CONTACTO */}
                <Seccion titulo="Datos de Contacto / Familiar" icono="👨‍👩‍👧" abierta={false}>
                    <div className="dba-grid-form">
                        <div className="dba-input-group">
                            <label>Nombre de Contacto</label>
                            <input name="nombreContacto" value={registro.nombreContacto || ''}
                                placeholder="Nombre contacto" onChange={handleChange} className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Teléfono de Contacto</label>
                            <input name="telContacto" value={registro.telContacto || ''}
                                placeholder="Teléfono" onChange={handleChange} className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Móvil de contacto</label>
                            <input name="movilContacto" value={registro.movilContacto || ''}
                                placeholder="Móvil" onChange={handleChange} className="dba-form-input" />
                        </div>
                        <div className="dba-input-group">
                            <label>Parentesco</label>
                            <input name="parentesco" value={registro.parentesco || ''}
                                placeholder="Parentesco" onChange={handleChange} className="dba-form-input" />
                        </div>
                    </div>
                </Seccion>

                {/* SECCIÓN 4: DOCUMENTOS */}
                <Seccion titulo="Documentación Académica y Legal" icono="📁" abierta={false}>
                    <div className="dba-grid-form">
                        <select className="dba-form-select"
                            value={tempDoc.tipo} onChange={(e) => setTempDoc({...tempDoc, tipo: e.target.value})}>
                            <option value="">Seleccione documento</option>
                            <option value="Identidad">Documento de identidad</option>
                            <option value="Diploma">Diploma bachiller</option>
                            <option value="Salud">Certificado de Salud</option>
                            <option value="Bancaria">Certificación Bancaria</option>
                            <option value="Saberes">Certificado de saberes</option>
                        </select>
                        <input type="url" placeholder="https://drive.google.com/..."
                            value={tempDoc.url} onChange={(e) => setTempDoc({...tempDoc, url: e.target.value})}
                            className="dba-form-input" />
                        <button type="button" onClick={agregarDocumento} className="dba-btn-agregar">
                            + Agregar
                        </button>
                    </div>
                    <ul className="dba-docs-list">
                        {registro.documentosCargados.map((doc) => (
                            <li key={doc.id} className="dba-doc-item">
                                <span style={{ fontWeight: '500', color: '#1391c8' }}>
                                    {doc.tipo}:
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="dba-doc-link">
                                        (Ver archivo)
                                    </a>
                                </span>
                                <button type="button" onClick={() => eliminarDocumento(doc.id)} className="dba-btn-eliminar">
                                    Eliminar
                                </button>
                            </li>
                        ))}
                    </ul>
                </Seccion>

                <button type="button" onClick={actualizarRegistro} className="dba-btn-actualizar">
                    💾 Actualizar Registro
                </button>
            </div>
        </div>
    );
}

export default RegistroLaboral;