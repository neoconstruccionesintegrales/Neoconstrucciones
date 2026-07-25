import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../style/adminheader.css';
import logoEmpresa from '../imagenes/logo.png';

function AdminHeader() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [dropdownAbierto, setDropdownAbierto] = useState(null);
  const navRef = useRef(null);
  const rol = localStorage.getItem('rol');

  const cerrarSesion = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const toggleMenu = () => setMenuAbierto(!menuAbierto);

  const toggleDropdown = (idx) => {
    setDropdownAbierto(dropdownAbierto === idx ? null : idx);
  };

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setDropdownAbierto(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bloquear scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (menuAbierto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuAbierto]);

  const menuAdmin = [
    { type: 'link', to: '/admin', label: 'Inicio' },
    { type: 'link', to: '/gestion-usuarios', label: 'Usuarios' },
    { type: 'link', to: '/admin-servicios', label: 'Servicios' },
    { type: 'link', to: '/clientes', label: 'Clientes' },
    {
      type: 'dropdown',
      label: 'Finanzas y Proyectos',
      items: [
        { to: '/gestion-cotizaciones', label: 'Cotizaciones' },
        { to: '/proyectos', label: 'Proyectos' },
        { to: '/facturas', label: 'Facturación' },
      ],
    },
    {
      type: 'dropdown',
      label: 'Nómina',
      items: [
        { to: '/nomina', label: 'Gestión de Nómina' },
        { to: '/registro-laboral', label: 'Registro Personal' },
        { to: '/nomina/asistencia', label: 'Registro de Asistencia' },
        { to: '/nomina/novedades', label: 'Novedades (Incapacidades, Vacaciones)' },
        { to: '/nomina/descuentos', label: 'Gestión de Descuentos' },
        { to: '/nomina/reportes', label: 'Reporte para Contador' },
        { to: '/nomina/cesantias-fondo', label: 'Consignar Cesantías a Fondo' },
        { to: '/nomina/aprobar-extras', label: 'Aprobar Horas Extras' },
        { to: '/nomina/generar', label: 'Generar Nómina' },
        { to: '/nomina/comprobantes', label: 'Comprobante de Pago' },
        { to: '/nomina/liquidacion', label: 'Liquidación de Contrato' },
      ],
    },
    { type: 'link', to: '/admin-dashboard', label: 'Mensajería y Visitas' },
  ];

  const menuContabilidad = [
    { type: 'link', to: '/facturas', label: 'Facturación' },
    { type: 'link', to: '/registro-laboral', label: 'Mi Registro Laboral' },
  ];

  const menuComercial = [
    { type: 'link', to: '/admin-dashboard', label: 'Mensajería y Visitas' },
    { type: 'link', to: '/registro-laboral', label: 'Mi Registro Laboral' },
  ];

  const menuResidente = [
    { type: 'link', to: '/registro-laboral', label: 'Mi Registro Laboral' },
  ];

  let enlaces = [];
  if (rol === 'admin') enlaces = menuAdmin;
  else if (rol === 'contabilidad') enlaces = menuContabilidad;
  else if (rol === 'comercial') enlaces = menuComercial;
  else if (rol === 'residente') enlaces = menuResidente;

  return (
    <>
        <header className="adh-header no-print">
          <div className="adh-inner">
          {/* Logo */}
          <div className="adh-logo">
            <img src={logoEmpresa} alt="Neoconstrucciones Integrales SAS" />
          </div>

          {/* Hamburguesa */}
          <button
            className={`adh-hamburger ${menuAbierto ? 'adh-hamburger--active' : ''}`}
            onClick={toggleMenu}
            aria-label="Abrir menú"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Navegación */}
          <nav
            ref={navRef}
            className={`adh-nav ${menuAbierto ? 'adh-nav--open' : ''}`}
          >
            {enlaces.map((item, i) =>
              item.type === 'link' ? (
                <Link
                  key={i}
                  to={item.to}
                  className="adh-link"
                  onClick={() => setMenuAbierto(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <div
                  key={i}
                  className={`adh-dropdown ${
                    dropdownAbierto === i ? 'adh-dropdown--open' : ''
                  }`}
                >
                  <button
                    className="adh-dropdown-toggle"
                    onClick={() => toggleDropdown(i)}
                  >
                    {item.label}
                    <span className="adh-dropdown-arrow">▾</span>
                  </button>

                  <div className="adh-dropdown-menu">
                    {item.items.map((sub, j) =>
                      sub.to ? (
                        <Link
                          key={j}
                          to={sub.to}
                          className="adh-dropdown-item"
                          onClick={() => {
                            setMenuAbierto(false);
                            setDropdownAbierto(null);
                          }}
                        >
                          {sub.label}
                        </Link>
                      ) : (
                        <span key={j} className="adh-dropdown-item adh-dropdown-item--muted">
                          {sub.label}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </nav>

          {/* Acciones */}
          <div className="adh-actions">
            <span className="adh-rol">Rol: {rol?.toUpperCase()}</span>
            <button className="adh-logout" onClick={cerrarSesion}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Overlay para cerrar menú al tocar fuera (solo móvil) */}
      {menuAbierto && (
        <div className="adh-overlay" onClick={() => setMenuAbierto(false)} />
      )}
    </>
  );
}

export default AdminHeader;