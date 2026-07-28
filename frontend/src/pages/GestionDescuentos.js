import React, { useState, useEffect } from 'react';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

const tipoLabels = {
  prestamo: 'Préstamo',
  falta_penalizacion: 'Penalización por falta',
  danos_perdidas: 'Daños o pérdidas',
  uniformes_epp: 'Uniformes / EPP',
  sancion_disciplinaria: 'Sanción disciplinaria',
  aporte_voluntario: 'Aporte voluntario',
  otro: 'Otro'
};

function GestionDescuentos() {
  const [descuentos, setDescuentos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [filtros, setFiltros] = useState({ email: '', tipo: '', estado: '' });
  // Detectar rol del usuario desde localStorage o default
  const userRol = localStorage.getItem('rol') || 'ADMIN';
  const [form, setForm] = useState({
    email: '',
    tipo: '',
    descripcion: '',
    valorTotal: '',
    valorCuota: '',
    cuotas: 1,
    condicion: { requiereFalta: false, idProyecto: '' }
  });

  useEffect(() => {
    cargarDescuentos();
    cargarEmpleados();
  }, []);

  const cargarDescuentos = async () => {
    setCargando(true);
    try {
      const query = new URLSearchParams();
      if (filtros.email) query.append('email', filtros.email);
      if (filtros.tipo) query.append('tipo', filtros.tipo);
      if (filtros.estado) query.append('estado', filtros.estado);

      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/descuentos?${query}`);
      const data = await res.json();
      if (data.success) setDescuentos(data.data?.descuentos || []);
    } catch (err) {
      console.error('Error cargando descuentos:', err);
    }
    setCargando(false);
  };

  const cargarEmpleados = async () => {
    try {
      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/usuarios`);
      const data = await res.json();
      if (data.success) setEmpleados(data.data.filter(u => u.estadoLaboral === 'activo'));
    } catch (err) {
      console.error('Error cargando empleados:', err);
    }
  };

  const handleChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    if (field === 'valorTotal' || field === 'cuotas') {
      const total = Number(newForm.valorTotal) || 0;
      const cuotas = Number(newForm.cuotas) || 1;
      if (total > 0 && cuotas > 0) {
        newForm.valorCuota = Math.round(total / cuotas);
      }
    }
    setForm(newForm);
  };

  const guardarDescuento = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/descuentos`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          valorTotal: Number(form.valorTotal),
          valorCuota: Number(form.valorCuota),
          cuotas: Number(form.cuotas)
        })
      });
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Descuento creado correctamente');
        setMostrarModal(false);
        setForm({ email: '', tipo: '', descripcion: '', valorTotal: '', valorCuota: '', cuotas: 1, condicion: { requiereFalta: false, idProyecto: '' } });
        cargarDescuentos();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al crear'));
      }
    } catch (err) {
      setMensaje('❌ Error de conexión');
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/descuentos/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevoEstado })
      });
      const data = await res.json();
      if (data.success) {
        setMensaje(`✅ Descuento ${nuevoEstado}`);
        cargarDescuentos();
      }
    } catch (err) {
      setMensaje('❌ Error al cambiar estado');
    }
  };

  const cancelarDescuento = async (id) => {
    if (!window.confirm('¿Cancelar este descuento?')) return;
    try {
      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/descuentos/${id}/cancelar`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Descuento cancelado');
        cargarDescuentos();
      }
    } catch (err) {
      setMensaje('❌ Error al cancelar');
    }
  };

  const getNombreEmpleado = (email) => {
    const emp = empleados.find(e => e.email === email);
    return emp ? emp.nombre : email;
  };

  const stats = {
    activos: descuentos.filter(d => d.estado === 'activo').length,
    totalPendiente: descuentos.filter(d => d.estado === 'activo').reduce((s, d) => s + Math.max(0, d.valorTotal - (d.valorCuota * d.cuotasPagadas)), 0),
    totalCuotaMes: descuentos.filter(d => d.estado === 'activo').reduce((s, d) => s + (d.cuotasPagadas < d.cuotas ? d.valorCuota : 0), 0)
  };

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        {/* HEADER CORREGIDO: subtítulo debajo del título + botón lateral */}
        <div className="dba-header-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="dba-title">💳 Gestión de Descuentos</h1>
            <p className="dba-subtitle">Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong></p>
          </div>
          <button onClick={() => setMostrarModal(true)} className="dba-btn dba-btn-primary" style={{ alignSelf: 'center' }}>
            ➕ Nuevo Descuento
          </button>
        </div>

        {mensaje && (
          <div className={`dba-alert ${mensaje.includes('❌') ? 'dba-alert-error' : 'dba-alert-success'}`}>
            <span>{mensaje}</span>
            <button onClick={() => setMensaje('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Stats */}
        <div className="dba-stats-grid">
          <div className="dba-stat-card" style={{ background: '#0077b1' }}>
            <div className="stat-label">Descuentos activos</div>
            <div className="stat-value">{stats.activos}</div>
          </div>
          <div className="dba-stat-card" style={{ background: '#1391c8' }}>
            <div className="stat-label">Total pendiente</div>
            <div className="stat-value">${stats.totalPendiente.toLocaleString('es-CO')}</div>
          </div>
          <div className="dba-stat-card" style={{ background: '#1DBD8E' }}>
            <div className="stat-label">Cuota mensual total</div>
            <div className="stat-value">${stats.totalCuotaMes.toLocaleString('es-CO')}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="dba-form-section" style={{ padding: '15px' }}>
          <div className="dba-filters" style={{ marginBottom: 0 }}>
            <select
              className="dba-select"
              value={filtros.email}
              onChange={e => setFiltros({...filtros, email: e.target.value})}
              style={{ minWidth: '200px' }}
            >
              <option value="">Todos los empleados</option>
              {empleados.map(emp => (
                <option key={emp.email} value={emp.email}>{emp.nombre || emp.email}</option>
              ))}
            </select>
            <select
              className="dba-select"
              value={filtros.tipo}
              onChange={e => setFiltros({...filtros, tipo: e.target.value})}
              style={{ minWidth: '180px' }}
            >
              <option value="">Todos los tipos</option>
              {Object.entries(tipoLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              className="dba-select"
              value={filtros.estado}
              onChange={e => setFiltros({...filtros, estado: e.target.value})}
              style={{ minWidth: '150px' }}
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="pausado">Pausado</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <button onClick={cargarDescuentos} className="dba-btn dba-btn-primary dba-btn-sm">
              🔍 Filtrar
            </button>
          </div>
        </div>

        {/* Tabla */}
        {cargando ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Cargando...</div>
        ) : descuentos.length === 0 ? (
          <div className="dba-empty">
            <div className="dba-empty-icon">💳</div>
            <h3>No hay descuentos registrados</h3>
            <p>Crea el primer descuento con el botón superior.</p>
          </div>
        ) : (
          <div className="dba-table-wrapper">
            <table className="dba-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: 'right' }}>Valor Total</th>
                  <th style={{ textAlign: 'right' }}>Cuota</th>
                  <th style={{ textAlign: 'center' }}>Progreso</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {descuentos.map(d => {
                  const pct = Math.min(100, (d.cuotasPagadas / d.cuotas) * 100);
                  return (
                    <tr key={d._id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{getNombreEmpleado(d.email)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gris-500)' }}>{d.email}</div>
                      </td>
                      <td>
                        <span className="dba-estado" style={{ background: '#f0f0f0', color: '#555' }}>
                          {tipoLabels[d.tipo] || d.tipo}
                        </span>
                      </td>
                      <td>{d.descripcion}</td>
                      <td style={{ textAlign: 'right' }}>${d.valorTotal?.toLocaleString('es-CO')}</td>
                      <td style={{ textAlign: 'right' }}>${d.valorCuota?.toLocaleString('es-CO')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="dba-progress">
                          <div className="dba-progress-track">
                            <div className="dba-progress-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="dba-progress-text">{d.cuotasPagadas}/{d.cuotas}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`dba-estado dba-estado-${d.estado}`}>{d.estado}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {d.estado === 'activo' && (
                          <button onClick={() => cambiarEstado(d._id, 'pausado')} className="dba-btn dba-btn-sm" style={{ background: '#fff3cd', color: '#856404', marginRight: '5px' }}>
                            ⏸️ Pausar
                          </button>
                        )}
                        {d.estado === 'pausado' && (
                          <button onClick={() => cambiarEstado(d._id, 'activo')} className="dba-btn dba-btn-sm" style={{ background: '#d4edda', color: '#155724', marginRight: '5px' }}>
                            ▶️ Activar
                          </button>
                        )}
                        {(d.estado === 'activo' || d.estado === 'pausado') && (
                          <button onClick={() => cancelarDescuento(d._id)} className="dba-btn dba-btn-sm dba-btn-danger">
                            🗑️ Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="dba-modal-overlay">
          <div className="dba-modal">
            <div className="dba-modal-header">
              <h3>➕ Nuevo Descuento</h3>
            </div>
            <form onSubmit={guardarDescuento}>
              <div className="dba-form-group" style={{ marginBottom: '15px' }}>
                <label className="dba-label">Empleado</label>
                <select className="dba-select" value={form.email} onChange={e => handleChange('email', e.target.value)} required>
                  <option value="">Seleccionar empleado...</option>
                  {empleados.map(emp => (
                    <option key={emp.email} value={emp.email}>{emp.nombre || emp.email} ({emp.email})</option>
                  ))}
                </select>
              </div>

              <div className="dba-form-group" style={{ marginBottom: '15px' }}>
                <label className="dba-label">Tipo de descuento</label>
                <select className="dba-select" value={form.tipo} onChange={e => handleChange('tipo', e.target.value)} required>
                  <option value="">Seleccionar tipo...</option>
                  {Object.entries(tipoLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="dba-form-group" style={{ marginBottom: '15px' }}>
                <label className="dba-label">Descripción</label>
                <input type="text" className="dba-input" value={form.descripcion} onChange={e => handleChange('descripcion', e.target.value)} placeholder="Ej: Préstamo para arreglo de moto" required />
              </div>

              <div className="dba-form-grid" style={{ marginBottom: '15px' }}>
                <div className="dba-form-group">
                  <label className="dba-label">Valor total ($)</label>
                  <input type="number" className="dba-input" value={form.valorTotal} onChange={e => handleChange('valorTotal', e.target.value)} min="1" required />
                </div>
                <div className="dba-form-group">
                  <label className="dba-label">N° de cuotas</label>
                  <input type="number" className="dba-input" value={form.cuotas} onChange={e => handleChange('cuotas', e.target.value)} min="1" required />
                </div>
              </div>

              <div className="dba-form-group" style={{ marginBottom: '20px' }}>
                <label className="dba-label">Valor cuota ($) <span style={{ color: 'var(--gris-500)', fontWeight: 'normal' }}>— auto</span></label>
                <input type="number" className="dba-input" value={form.valorCuota} onChange={e => handleChange('valorCuota', e.target.value)} min="1" required style={{ background: '#f9f9f9' }} />
              </div>

              <div className="dba-modal-footer">
                <button type="button" onClick={() => setMostrarModal(false)} className="dba-btn dba-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="dba-btn dba-btn-primary">
                  💾 Guardar Descuento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionDescuentos;