import React, { useState, useEffect } from 'react';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

function GestionNovedades() {
  const [empleados, setEmpleados] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [diasCalculados, setDiasCalculados] = useState(0);

  // Detectar rol del usuario desde localStorage o default
  const userRol = localStorage.getItem('rol') || 'ADMIN';
  const [form, setForm] = useState({
    email: '',
    tipo: 'incapacidad_eps',
    fechaInicio: '',
    fechaFin: '',
    descripcion: '',
    numeroIncapacidad: '',
    entidad: ''
  });

  useEffect(() => {
    cargarEmpleados();
    cargarNovedades();
  }, []);

  useEffect(() => {
    if (form.fechaInicio && form.fechaFin) {
      const inicio = new Date(form.fechaInicio);
      const fin = new Date(form.fechaFin);
      if (fin >= inicio) {
        const diffTime = Math.abs(fin - inicio);
        const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setDiasCalculados(dias);
      } else {
        setDiasCalculados(0);
      }
    } else {
      setDiasCalculados(0);
    }
  }, [form.fechaInicio, form.fechaFin]);

  const cargarEmpleados = async () => {
    try {
      const res = await fetchConAuth('${API_URL}/api/usuarios');
      const data = await res.json();
      if (data.success) setEmpleados(data.data.filter(u => u.estadoLaboral === 'activo'));
    } catch (err) { console.error(err); }
  };

  const cargarNovedades = async () => {
    try {
      const res = await fetchConAuth('${API_URL}/api/novedades');
      const data = await res.json();
      if (data.success) setNovedades(data.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.tipo === 'vacaciones' && diasCalculados > 15) {
      setMensaje('❌ Las vacaciones no pueden exceder 15 días');
      return;
    }

    if (new Date(form.fechaFin) < new Date(form.fechaInicio)) {
      setMensaje('❌ La fecha fin no puede ser anterior a la fecha inicio');
      return;
    }

    try {
      const res = await fetchConAuth('${API_URL}/api/novedades', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Novedad registrada correctamente');
        setForm({ email: '', tipo: 'incapacidad_eps', fechaInicio: '', fechaFin: '', descripcion: '', numeroIncapacidad: '', entidad: '' });
        setDiasCalculados(0);
        cargarNovedades();
      } else {
        setMensaje('❌ Error: ' + (data.error || 'No se pudo registrar'));
      }
    } catch (err) {
      setMensaje('❌ Error de conexión');
    }
  };

  const aprobarNovedad = async (id) => {
    try {
      const res = await fetchConAuth(`${API_URL}/api/novedades/${id}/aprobar`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Novedad aprobada');
        cargarNovedades();
      }
    } catch (err) {
      setMensaje('❌ Error');
    }
  };

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        <div className="dba-header-text">
          <h1 className="dba-title">📑 Gestión de Novedades</h1>
           <p className="dba-subtitle">Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong></p>
        </div>

        {mensaje && (
          <div className={`dba-alert ${mensaje.includes('❌') ? 'dba-alert-error' : 'dba-alert-success'}`}>
            <span>{mensaje}</span>
            <button onClick={() => setMensaje('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Formulario */}
        <div className="dba-form-section">
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--gris-800)', fontSize: '1.1rem' }}>Registrar Nueva Novedad</h3>
          <form onSubmit={handleSubmit}>
            <div className="dba-form-grid">
              <div className="dba-form-group">
                <label className="dba-label">Empleado</label>
                <select className="dba-select" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required>
                  <option value="">-- Seleccione --</option>
                  {empleados.map(emp => <option key={emp._id} value={emp.email}>{emp.nombre}</option>)}
                </select>
              </div>

              <div className="dba-form-group">
                <label className="dba-label">Tipo</label>
                <select className="dba-select" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  <option value="incapacidad_eps">Incapacidad EPS</option>
                  <option value="incapacidad_arl">Incapacidad ARL</option>
                  <option value="incapacidad_soat">Incapacidad SOAT</option>
                  <option value="vacaciones">Vacaciones</option>
                  <option value="licencia_remunerada">Licencia Remunerada</option>
                  <option value="licencia_no_remunerada">Licencia No Remunerada</option>
                  <option value="permiso">Permiso</option>
                  <option value="suspension">Suspensión</option>
                  <option value="capacitacion">Capacitación</option>
                </select>
              </div>

              <div className="dba-form-group">
                <label className="dba-label">Fecha Inicio</label>
                <input type="date" className="dba-input" value={form.fechaInicio} onChange={e => setForm({...form, fechaInicio: e.target.value})} required />
              </div>

              <div className="dba-form-group">
                <label className="dba-label">Fecha Fin</label>
                <input type="date" className="dba-input" value={form.fechaFin} onChange={e => setForm({...form, fechaFin: e.target.value})} required />
              </div>

              <div className="dba-form-group">
                <label className="dba-label">Días Calculados</label>
                <input
                  type="text"
                  className="dba-input"
                  value={diasCalculados > 0 ? `${diasCalculados} días` : ''}
                  readOnly
                  style={{
                    background: '#e3f2fd',
                    fontWeight: 'bold',
                    color: form.tipo === 'vacaciones' && diasCalculados > 15 ? '#d32f2f' : '#1565c0'
                  }}
                />
                {form.tipo === 'vacaciones' && diasCalculados > 15 && (
                  <span style={{ color: '#d32f2f', fontSize: '12px' }}>⚠️ Máximo 15 días permitidos</span>
                )}
              </div>

              {(form.tipo.startsWith('incapacidad')) && (
                <>
                  <div className="dba-form-group">
                    <label className="dba-label">N° Incapacidad</label>
                    <input type="text" className="dba-input" value={form.numeroIncapacidad} onChange={e => setForm({...form, numeroIncapacidad: e.target.value})} />
                  </div>
                  <div className="dba-form-group">
                    <label className="dba-label">Entidad (EPS/ARL/SOAT)</label>
                    <input type="text" className="dba-input" value={form.entidad} onChange={e => setForm({...form, entidad: e.target.value})} />
                  </div>
                </>
              )}

              <div className="dba-form-group full-width">
                <label className="dba-label">Descripción</label>
                <input type="text" className="dba-input" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Descripción de la novedad..." />
              </div>
            </div>

            <button
              type="submit"
              className="dba-btn dba-btn-primary"
              style={{ marginTop: '16px' }}
              disabled={form.tipo === 'vacaciones' && diasCalculados > 15}
            >
              Registrar Novedad
            </button>
          </form>
        </div>

        {/* Lista de novedades */}
        <div className="dba-header-text" style={{ marginTop: 'clamp(24px, 3vw, 40px)', marginBottom: 'clamp(12px, 2vw, 20px)' }}>
          <h2 className="dba-title" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>Novedades Registradas</h2>
        </div>

        <div className="dba-table-wrapper">
          <table className="dba-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Fechas</th>
                <th>Días</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {novedades.map(nov => (
                <tr key={nov._id}>
                  <td>{nov.idNovedad}</td>
                  <td>{nov.email}</td>
                  <td>{nov.tipo}</td>
                  <td>{new Date(nov.fechaInicio).toLocaleDateString()} - {new Date(nov.fechaFin).toLocaleDateString()}</td>
                  <td>{nov.dias}</td>
                  <td>
                    <span className={`dba-estado dba-estado-${nov.estado}`}>{nov.estado}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {nov.estado === 'pendiente' && (
                      <button onClick={() => aprobarNovedad(nov._id)} className="dba-btn dba-btn-success dba-btn-sm">
                        Aprobar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {novedades.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--gris-500)' }}>
                    Sin novedades registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GestionNovedades;
