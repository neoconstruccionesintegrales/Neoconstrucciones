import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/admin.css';

function Admin() {
  const navigate = useNavigate();
  const userRol = localStorage.getItem('rol') || '';

  const modulos = [
    { titulo: 'Gestión de Usuarios', icon: '👥', path: '/gestion-usuarios', desc: 'Configuración de roles.', color: '#9151B8', permisos: ['admin'] },
    { titulo: 'Gestión de Clientes', icon: '👷', path: '/clientes', desc: 'Gestión de clientes', color: '#FF8F5C', permisos: ['admin'] },
    { titulo: 'Gestión de Nómina', icon: '👷', path: '/nomina', desc: 'Nómina y gestión de especialistas.', color: '#73CC80', permisos: ['admin'] },
    { titulo: 'Gestión de Cotizaciones', icon: '🧾', path: '/gestion-cotizaciones', desc: 'Cotizaciones.', color: '#52647A', permisos: ['admin'] },
    { titulo: 'Gestión de Servicios', icon: '🛠️', path: '/admin-servicios', desc: 'Gestión técnica de ingeniería e insumos.', color: '#0FA69D', permisos: ['admin'] },
    { titulo: 'Gestión de Proyectos', icon: '🏗️', path: '/proyectos', desc: 'Seguimiento de hitos y cronogramas.', color: '#EEB72B', permisos: ['admin'] },
    { titulo: 'Gestión de Facturación', icon: '🧾', path: '/facturas', desc: 'Emisión de cobros y conciliación.', color: '#007268', permisos: ['admin', 'contabilidad'] },
    { titulo: 'Gestión de Mensajería y Visitas', icon: '📬', path: '/admin-dashboard', desc: 'Control de clientes y agenda técnica.', color: '#006ECF', permisos: ['admin', 'comercial'] }
  ];

  const modulosVisibles = userRol === 'admin'
    ? modulos
    : modulos.filter(m => m.permisos.includes(userRol));

  useEffect(() => {
    const isAuth = localStorage.getItem('auth');
    if (!isAuth) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        <div className="dba-header-text">
          <h1 className="dba-title">Panel Administrativo</h1>
          <p className="dba-subtitle">
            Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
          </p>
        </div>

        <div className="dba-grid">
          {modulosVisibles.map((m, i) => (
            <div key={i} className="dba-card" onClick={() => navigate(m.path)}>
              <div className="dba-icon-circle" style={{ backgroundColor: `${m.color}15` }}>
                <span style={{ fontSize: '32px' }}>{m.icon}</span>
              </div>
              <h2 className="dba-card-title" style={{ color: m.color }}>{m.titulo}</h2>
              <p className="dba-card-desc">{m.desc}</p>
              <div className="dba-badge" style={{ color: m.color, borderColor: m.color }}>
                ACCESO {userRol.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Admin;