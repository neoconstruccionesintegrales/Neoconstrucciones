import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/dashboard.css';

// ✅ HELPER: Fetch con token automático
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

function Dashboard() {
  const navigate = useNavigate();
  const [mensajes, setMensajes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [pestanaActiva, setPestanaActiva] = useState('activas'); // 'activas' o 'historial'
  const userRol = localStorage.getItem('rol') || 'ADMIN';

  // 1. CARGAR DATOS DESDE MONGO DB ATLAS
  const cargarMensajes = useCallback(async () => {
    try {
      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/mensajes`);
      if (res.status === 401) {
        alert('Sesion expirada. Inicie sesion nuevamente.');
        window.location.href = '/login';
        return;
      }
      const resultado = await res.json();
      if (resultado.success) setMensajes(resultado.data);
    } catch (error) {
      console.error('Error cargando mensajes de Atlas:', error);
    }
  }, []);

  const cargarCitas = useCallback(async () => {
    try {
      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/citas`);
      if (res.status === 401) {
        alert('Sesion expirada. Inicie sesion nuevamente.');
        window.location.href = '/login';
        return;
      }
      const resultado = await res.json();
      if (resultado.success) setCitas(resultado.data);
    } catch (error) {
      console.error('Error cargando citas:', error);
    }
  }, []);

  useEffect(() => {
    cargarMensajes();
    cargarCitas();
  }, [cargarMensajes, cargarCitas]);

  // 2. ACTUALIZAR ESTADO O NOTAS EN ATLAS
  const actualizarMensaje = async (id, camposNuevos) => {
    try {
      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/mensajes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(camposNuevos)
      });
      if (res.status === 401) {
        alert('No autorizado.');
        window.location.href = '/login';
        return;
      }
      const resultado = await res.json();
      if (resultado.success) {
        // Actualizamos el estado en el Frontend sin recargar
        setMensajes(function(prev) {
          return prev.map(function(m) {
            return m.idMensaje === id ? Object.assign({}, m, camposNuevos) : m;
          });
        });
      }
    } catch (error) {
      console.error('Error al actualizar mensaje en Atlas:', error);
    }
  };

  const actualizarCita = async (id, camposNuevos) => {
    try {
    const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/citas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(camposNuevos)
    });
      if (res.status === 401) {
        alert('No autorizado.');
        window.location.href = '/login';
        return;
      }
      const resultado = await res.json();
      if (resultado.success) {
        // Actualizamos el estado en el Frontend sin recargar
        setCitas(function(prev) {
          return prev.map(function(c) {
            return c.idCita === id ? Object.assign({}, c, camposNuevos) : c;
          });
        });
      }
    } catch (error) {
      console.error('Error al actualizar cita en Atlas:', error);
    }
  };

  // 3. ELIMINAR PERMANENTEMENTE DE ATLAS
  const eliminarElemento = async (id, tipo) => {
    const confirmation = window.confirm('Esta seguro de eliminar permanentemente este registro de MongoDB Atlas?');
    if (!confirmation) return;

    const url = tipo === 'msg'
      ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/mensajes/${id}`
      : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/citas/${id}`;
    try {
      const res = await fetchConAuth(url, { method: 'DELETE' });
      if (res.status === 401) {
        alert('No autorizado.');
        window.location.href = '/login';
        return;
      }
      const resultado = await res.json();
      if (resultado.success) {
        alert('Registro removido con exito de la base de datos.');
        if (tipo === 'msg') {
          cargarMensajes();
        } else {
          cargarCitas();
        }
      } else {
        alert('No se pudo eliminar el registro de Atlas.');
      }
    } catch (error) {
      console.error('Error al borrar:', error);
    }
  };

  // PROTECCION DE RUTA
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="db-container">
      <div className="db-wrapper">
        {/* HEADER */}
        <div className="db-header-text">
          <h1 className="db-title">📊 Gestión de Mensajería y Visitas</h1>
          <p className="db-subtitle">
            Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
          </p>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="db-tabs-container">
          <button 
            onClick={() => setPestanaActiva('activas')}
            className={`db-tab-btn ${pestanaActiva === 'activas' ? 'db-tab-btn--active' : ''}`}
          >
            📋 Gestión (Pendientes / Procesos)
          </button>
          <button 
            onClick={() => setPestanaActiva('historial')}
            className={`db-tab-btn ${pestanaActiva === 'historial' ? 'db-tab-btn--active' : ''}`}
          >
            🏛️ Historial (Gestionados)
          </button>
        </div>

        {/* ============================================
            PANEL DE GESTIÓN (Pendientes / Procesos)
            ============================================ */}
        {pestanaActiva === 'activas' && (
          <div className="db-grid-panels">
            
            {/* PANEL 1: ANUNCIOS Y MENSAJES */}
            <div className="db-card db-card-messages">
              <h2 className="db-panel-title tracking-title">📬 Anuncios y Mensajes</h2>
              <div className="db-items-list">
                {mensajes.filter(m => m.estado !== 'gestionado').length > 0 ? (
                  mensajes
                    .filter(m => m.estado !== 'gestionado')
                    .map(m => (
                      <div key={m.idMensaje} className="db-item-box db-item-box--blanco">
                        <div className="db-item-header">
                          <div className="db-item-client-name db-text-blue">{m.nombre}</div>
                          <select
                            value={m.estado || 'pendiente'}
                            onChange={(e) => actualizarMensaje(m.idMensaje, { estado: e.target.value })}
                            className="db-status-select"
                          >
                            <option value="pendiente">🔴 Pendiente</option>
                            <option value="proceso">🟡 En Proceso</option>
                            <option value="gestionado">🟢 Gestionado</option>
                          </select>
                        </div>

                        <div className="db-client-contact-info">
                          <span>📧 <strong>Correo electrónico:</strong> <a href={`mailto:${m.correo}`}>{m.correo || 'No registrado'}</a></span>
                          <span>📱 <strong>Celular:</strong> <a href={`https://wa.me/57${m.celular}`} target="_blank" rel="noreferrer">{m.celular || 'No registrado'}</a></span>
                        </div>

                        <p className="db-item-text-body">💬 {m.mensaje}</p>

                        <div className="db-management-notes">
                          <label className="db-notes-label">Notas de Gestión Interna:</label>
                          <textarea
                            placeholder="Ej: Se respondió cotización inicial por correo..."
                            value={m.notas || ''}
                            onChange={(e) => actualizarMensaje(m.idMensaje, { notas: e.target.value })}
                            className="db-notes-textarea"
                          />
                        </div>

                        <button onClick={() => eliminarElemento(m.idMensaje, 'msg')} className="btn-delete-permanent">
                          Eliminar Registro ✕
                        </button>
                      </div>
                    ))
                ) : (
                  <p className="db-empty-state">📬 No hay mensajes pendientes por gestionar.</p>
                )}
              </div>
            </div>

            {/* PANEL 2: VISITAS TÉCNICAS */}
            <div className="db-card db-card-appointments">
              <h2 className="db-panel-title schedule-title">🗓️ Visitas Técnicas</h2>
              <div className="db-items-list">
                {citas.filter(c => c.estado !== 'gestionado').length > 0 ? (
                  citas
                    .filter(c => c.estado !== 'gestionado')
                    .map(c => (
                      <div key={c.idCita} className="db-item-box db-item-box--blanco">
                        <div className="db-item-header">
                          <div className="db-item-client-name db-text-green">{c.nombreCliente}</div>
                          <select
                            value={c.estado || 'pendiente'}
                            onChange={(e) => actualizarCita(c.idCita, { estado: e.target.value })}
                            className="db-status-select"
                          >
                            <option value="pendiente">🔴 Pendiente</option>
                            <option value="proceso">🟡 En Ruta</option>
                            <option value="gestionado">🟢 Realizada</option>
                          </select>
                        </div>

                        <div className="db-client-contact-info">
                          <span>📱 <strong>Celular:</strong> <a href={`https://wa.me/57${c.celular}`} target="_blank" rel="noreferrer">{c.celular || 'No registrado'}</a></span>
                          <span>📍 <strong>Categoria del servicio:</strong> <span className="text-blue">{c.tipoServicio || 'No especificado'}</span></span>
                        </div>

                        <div className="db-item-timestamp">
                          📅 {c.fecha || 'Sin fecha'} | ⏰ {c.hora || 'Sin hora'}
                        </div>

                        <div className="db-management-notes">
                          <label className="db-notes-label">Reporte Técnico de Visita:</label>
                          <textarea
                            placeholder="Ej: Se asistió a obra. Terreno requiere nivelación civil previa..."
                            value={c.notas || ''}
                            onChange={(e) => actualizarCita(c.idCita, { notas: e.target.value })}
                            className="db-notes-textarea"
                          />
                        </div>

                        <button onClick={() => eliminarElemento(c.idCita, 'cita')} className="btn-delete-permanent">
                          Eliminar Registro ✕
                        </button>
                      </div>
                    ))
                ) : (
                  <p className="db-empty-state">🗓️ No hay visitas de obra pendientes.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================
            PANEL DE HISTORIAL (Gestionados) 
            ============================================ */}
        {pestanaActiva === 'historial' && (
          <div className="db-grid-panels">
            
            {/* HISTORIAL MENSAJES */}
            <div className="db-card db-card-messages">
              <h2 className="db-panel-title tracking-title">📜 Historial de Mensajes</h2>
              <div className="db-items-list">
                {mensajes.filter(m => m.estado === 'gestionado').length > 0 ? (
                  mensajes
                    .filter(m => m.estado === 'gestionado')
                    .map(m => (
                      <div key={m.idMensaje} className="db-item-box db-item-box--historial">
                        <div className="db-item-header">
                          <div className="db-item-client-name db-text-blue">{m.nombre}</div>
                          <div className="db-historial-badge">✅ Gestionado</div>
                        </div>
                        <div className="db-historial-meta">
                          <span>📧 {m.correo}</span>
                          <span>📱 {m.celular}</span>
                        </div>
                        <p className="db-item-text-body">💬 {m.mensaje}</p>
                        {m.notas && (
                          <div className="db-historial-notes-box">
                            <strong>Nota de gestión:</strong> {m.notas}
                          </div>
                        )}
                        <div className="db-historial-footer">
                          <span className="db-historial-user">👤 Gestionado por: {userRol.toUpperCase()}</span>
                          <span className="db-historial-date">📅 {new Date().toLocaleDateString()}</span>
                        </div>
                        <button onClick={() => eliminarElemento(m.idMensaje, 'msg')} className="btn-delete-permanent">
                          Eliminar Registro ✕
                        </button>
                      </div>
                    ))
                ) : (
                  <p className="db-empty-state">📜 No hay mensajes gestionados aún.</p>
                )}
              </div>
            </div>

            {/* HISTORIAL CITAS */}
            <div className="db-card db-card-appointments">
              <h2 className="db-panel-title schedule-title">📜 Historial de Visitas</h2>
              <div className="db-items-list">
                {citas.filter(c => c.estado === 'gestionado').length > 0 ? (
                  citas
                    .filter(c => c.estado === 'gestionado')
                    .map(c => (
                      <div key={c.idCita} className="db-item-box db-item-box--historial">
                        <div className="db-item-header">
                          <div className="db-item-client-name db-text-green">{c.nombreCliente}</div>
                          <div className="db-historial-badge">✅ Realizada</div>
                        </div>
                        <div className="db-historial-meta">
                          <span>📱 {c.celular}</span>
                          <span>📍 {c.tipoServicio}</span>
                        </div>
                        <div className="db-item-timestamp">
                          📅 {c.fecha} | ⏰ {c.hora}
                        </div>
                        {c.notas && (
                          <div className="db-historial-notes-box">
                            <strong>Reporte:</strong> {c.notas}
                          </div>
                        )}
                        <div className="db-historial-footer">
                          <span className="db-historial-user">👤 Gestionado por: {userRol.toUpperCase()}</span>
                          <span className="db-historial-date">📅 {new Date().toLocaleDateString()}</span>
                        </div>
                        <button onClick={() => eliminarElemento(c.idCita, 'cita')} className="btn-delete-permanent">
                          Eliminar Registro ✕
                        </button>
                      </div>
                    ))
                ) : (
                  <p className="db-empty-state">📜 No hay visitas gestionadas aún.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Barra de Operaciones Inferior */}
        <div className="db-actions-group">
          <button onClick={() => navigate('/admin')} className="btn-primary">⚙️ Inicio</button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;