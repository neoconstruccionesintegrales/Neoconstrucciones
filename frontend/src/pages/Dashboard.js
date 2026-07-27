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

  // 1. CARGAR DATOS DESDE MONGO DB ATLAS
  const cargarMensajes = useCallback(async () => {
    try {
      const res = await fetchConAuth('${API_URL}/api/mensajes');
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
      const res = await fetchConAuth('${API_URL}/api/citas');
      if (res.status === 401) {
        alert('Sesion expirada. Inicie sesion nuevamente.');
        window.location.href = '/login';
        return;
      }
      const resultado = await res.json();
      if (resultado.success) setCitas(resultado.data);
    } catch (error) {
      console.error('Error cargando citas de Atlas:', error);
    }
  }, []);

  useEffect(() => {
    cargarMensajes();
    cargarCitas();
  }, [cargarMensajes, cargarCitas]);

  // 2. ACTUALIZAR ESTADO O NOTAS EN ATLAS
  const actualizarMensaje = async (id, camposNuevos) => {
    try {
      const res = await fetchConAuth('${API_URL}/api/mensajes/' + id, {
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
      const res = await fetchConAuth('${API_URL}/api/citas/' + id, {
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
      ? '${API_URL}/api/mensajes/' + id
      : '${API_URL}/api/citas/' + id;
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

  // 4. INYECTOR AUTOMATICO DE DATOS DE PRUEBA
  const inicializarDatosPrueba = async () => {
    try {
      await fetchConAuth('${API_URL}/api/mensajes', {
        method: 'POST',
        body: JSON.stringify({
          idMensaje: 'MSG-' + Date.now(),
          nombre: 'Juan Perez',
          correo: 'juan.perez@neoconstrucciones.com',
          celular: '3154445566',
          mensaje: 'Interesado en cotizar la placa para un segundo piso.',
          estado: 'pendiente',
          notas: ''
        })
      });

      await fetchConAuth('${API_URL}/api/citas', {
        method: 'POST',
        body: JSON.stringify({
          idCita: 'CIT-' + Date.now(),
          nombreCliente: 'Ing. Alirio Gomez',
          celular: '3209998877',
          tipoServicio: 'Obra Civil - Nivelacion de Terreno',
          fecha: '2026-05-18',
          hora: '14:30',
          estado: 'proceso',
          notas: 'Llevar planos impresos del lote norte.'
        })
      });

      alert('Datos de prueba enviados con exito a MongoDB Atlas!');
      cargarMensajes();
      cargarCitas();
    } catch (error) {
      console.error('Error al inicializar datos:', error);
      alert('Error de comunicacion con el backend.');
    }
  };

  // PROTECCION DE RUTA
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const userRol = localStorage.getItem('rol') || 'ADMIN';

  return (
    <div className="db-container">
      <div className="db-wrapper">
        {/* HEADER — Alineado con clientes.css / usuario.css */}
        <div className="db-header-text">
          <h1 className="db-title">📊 Gestión de Mensajería y Visitas</h1>
          <p className="db-subtitle">
            Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
          </p>
        </div>

        {/* ACCIONES SUPERIOR — Barra tipo filtro-container */}
        <div className="db-actions-top">
          <button onClick={inicializarDatosPrueba} className="btn-nav-db" style={{ backgroundColor: '#e2e8f0', color: '#1e293b' }}>
            ⚡ Simular Datos en Mongo
          </button>
        </div>

        {/* GRID DE DOS PANELES */}
        <div className="db-grid-panels">
          {/* PANEL 1: ANUNCIOS Y MENSAJES */}
          <div className="db-card db-card-messages">
            <h2 className="db-panel-title tracking-title">📬 Anuncios y Mensajes</h2>
            <div className="db-items-list">
              {mensajes.filter(m => m.estado !== 'gestionado').length > 0 ? (
                mensajes
                  .filter(m => m.estado !== 'gestionado')
                  .map(m => (
                    <div key={m.idMensaje} className={`db-item-box estado-${m.estado || 'pendiente'}`}>
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
                    <div key={c.idCita} className={`db-item-box estado-${c.estado || 'pendiente'}`}>
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

        {/* Barra de Operaciones Inferior */}
        <div className="db-actions-group">
          <button onClick={() => navigate('/admin')} className="btn-primary">⚙️ Inicio</button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
