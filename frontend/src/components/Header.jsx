import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoEmpresa from '../imagenes/logo.png';
import '../style/header.css';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);
  const scrollTargetRef = useRef(null);

  // Detectar scroll para sombra
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToElement = (id) => {
    const attemptScroll = (attempts = 0) => {
      const elemento = document.getElementById(id);
      if (elemento) {
        setTimeout(() => {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      } else if (attempts < 20) {
        requestAnimationFrame(() => attemptScroll(attempts + 1));
      }
    };
    attemptScroll();
  };

  const irAlCatalogo = () => {
    setMenuAbierto(false);
    scrollTargetRef.current = 'catalogo';
    
    if (location.pathname !== '/') {
      navigate('/?scrollTo=catalogo');
    } else {
      scrollToElement('catalogo');
    }
  };

  // Efecto para manejar scroll cuando llegamos a '/' desde otra página
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const scrollTo = params.get('scrollTo');
    
    if (location.pathname === '/' && (scrollTo === 'catalogo' || scrollTargetRef.current === 'catalogo')) {
      scrollTargetRef.current = null;
      navigate('/', { replace: true });
      const timer = setTimeout(() => {
        scrollToElement('catalogo');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.search, navigate]);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    };
    if (menuAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuAbierto]);

  // Cerrar menú al cambiar de tamaño a desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMenuAbierto(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determinar link activo
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname === path) return true;
    return false;
  };

  const navLinks = [
    { label: 'Nosotros', path: '/nosotros', action: () => { setMenuAbierto(false); navigate('/nosotros'); } },
    { label: 'Nuestros servicios', path: '/', action: irAlCatalogo },
    { label: 'Simulador Virtual', path: '/simulador', action: () => { setMenuAbierto(false); navigate('/simulador'); } },
    { label: 'Agendar tu cita', path: '/agendar-cita', action: () => { setMenuAbierto(false); navigate('/agendar-cita'); } },
    { label: 'Galería', path: '/galeria-videos', action: () => { setMenuAbierto(false); navigate('/galeria-videos'); } },
    { label: 'Contactos', path: '/contacto', action: () => { setMenuAbierto(false); navigate('/contacto'); } },
  ];

  return (
    <nav className={`header-nav ${scrolled ? 'scrolled' : ''}`} ref={menuRef}>
      <div className="header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src={logoEmpresa} alt="Neoconstrucciones Integrales SAS" className="logo-img" />
      </div>

      <div className="header-menu-desktop">
        {navLinks.map((link, i) => (
          <button 
            key={i} 
            onClick={link.action} 
            className={`header-link ${isActive(link.path) ? 'active' : ''}`}
          >
            {link.label}
          </button>
        ))}
      </div>

      <div className="header-right">
        <button 
          onClick={() => { setMenuAbierto(false); navigate('/admin'); }} 
          className="header-intranet"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Intranet
        </button>

        <button 
          className={`header-hamburger ${menuAbierto ? 'active' : ''}`}
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div className={`header-menu-mobile ${menuAbierto ? 'open' : ''}`}>
        {navLinks.map((link, i) => (
          <button 
            key={i} 
            onClick={link.action} 
            className={`header-link-mobile ${isActive(link.path) ? 'active' : ''}`}
          >
            {link.label}
          </button>
        ))}
        <button 
          onClick={() => { setMenuAbierto(false); navigate('/admin'); }} 
          className="header-link-mobile intranet"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{width:16, height:16, marginRight:6, verticalAlign:'middle'}}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Intranet
        </button>
      </div>
    </nav>
  );
}

export default Header;