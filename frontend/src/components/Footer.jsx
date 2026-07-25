import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/footer.css';

function Footer() {
  const navigate = useNavigate();

  const textoMarquee = 'NEOCONSTRUCCIONES INTEGRALES S.A.S.';
  const separador = '     ';
  const repeticiones = 8;
  const contenidoMarquee = Array(repeticiones).fill(`${textoMarquee}${separador}`).join('');

  const enlacesRapidos = [
    { label: 'Nuestros Servicios', path: '/servicios', icon: '→' },
    { label: 'Nuestra Misión', path: '/nosotros', icon: '→' },
    { label: 'Contáctanos', path: '/contacto', icon: '→' },
  ];

  return (
    <footer className="footer-dark">
      {/* ===== MARQUEE INFINITO ===== */}
      <div className="marquee-section-aislada">
        <div className="marquee-pista">
          <div className="marquee-grupo">
            <span>{contenidoMarquee}</span>
          </div>
          <div className="marquee-grupo" aria-hidden="true">
            <span>{contenidoMarquee}</span>
          </div>
        </div>
      </div>

      <div className="footer-dark-inner">
        {/* ===== ENLACES RÁPIDOS ===== */}
        <div className="footer-dark-links">
          {enlacesRapidos.map((link, i) => (
            <button
              key={i}
              className="footer-dark-link"
              onClick={() => navigate(link.path)}
            >
              <span>{link.label}</span>
              <span className="footer-link-arrow">{link.icon}</span>
            </button>
          ))}
        </div>

        {/* ===== INFO LEGAL ===== */}
        <div className="footer-dark-bottom">
          <p className="footer-legal">
            © {new Date().getFullYear()} Neoconstrucciones Integrales S.A.S. | Todos los derechos reservados.
            &nbsp;&nbsp;Cel: 3017723223&nbsp;&nbsp;
            <a href="mailto:info@neoconstrucciones.com">info@neoconstrucciones.com</a>
            &nbsp;&nbsp;NIT: 901421096-1 | Bogotá, Colombia
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;