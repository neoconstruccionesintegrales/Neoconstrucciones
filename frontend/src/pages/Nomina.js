import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

function Nomina() {
  const navigate = useNavigate();
  const rol = localStorage.getItem('rol');

  const [resumen, setResumen] = useState({
    totalNominaMes: 0,
    empleadosActivos: 0,
    extrasPendientes: 0,
    nominasPendientes: 0,
    descuentosActivos: 0,
    costosPlanta: 0
  });
  const [ultimasNominas, setUltimasNominas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const esGerente = rol === 'admin' || rol === 'gerente';
  const esSecretaria = rol === 'secretaria';
  const esContador = rol === 'contabilidad';
  const esObrero = rol === 'oficial' || rol === 'ayudante';

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Empleados activos
      let activos = 0;
      try {
        const resEmp = await fetchConAuth('http://localhost:5000/api/usuarios');
        const textEmp = await resEmp.text();
        let dataEmp;
        try {
          dataEmp = JSON.parse(textEmp);
        } catch (e) {
          console.error('Respuesta no-JSON de /api/usuarios:', textEmp.substring(0, 200));
          dataEmp = { success: false };
        }
        if (dataEmp.success && Array.isArray(dataEmp.data)) {
          activos = dataEmp.data.filter(u => u.estadoLaboral === 'activo').length;
        }
      } catch (err) {
        console.error('Error fetching usuarios:', err);
      }

      // Descuentos activos
      let descuentosActivos = 0;
      let totalPendienteDescuentos = 0;
      if (esGerente || esContador) {
        try {
          const resDesc = await fetchConAuth('http://localhost:5000/api/descuentos?estado=activo');
          const textDesc = await resDesc.text();
          let dataDesc;
          try {
            dataDesc = JSON.parse(textDesc);
          } catch (e) {
            console.error('Respuesta no-JSON de /api/descuentos:', textDesc.substring(0, 200));
            dataDesc = { success: false };
          }
          if (dataDesc.success && dataDesc.data?.descuentos) {
            descuentosActivos = dataDesc.data.descuentos.length;
            totalPendienteDescuentos = dataDesc.data.descuentos.reduce((sum, d) => sum + (d.valorPendiente || d.valorTotal || 0), 0);
          }
        } catch (err) {
          console.error('Error fetching descuentos:', err);
        }
      }

      // Nóminas recientes
      let nominas = [];
      try {
        const resNom = await fetchConAuth('http://localhost:5000/api/nomina?anio=2026');
        const textNom = await resNom.text();
        let dataNom;
        try {
          dataNom = JSON.parse(textNom);
        } catch (e) {
          console.error('Respuesta no-JSON de /api/nomina:', textNom.substring(0, 200));
          dataNom = { success: false };
        }
        if (dataNom.success && Array.isArray(dataNom.data)) {
          nominas = dataNom.data.slice(0, 5);
        }
      } catch (err) {
        console.error('Error fetching nomina:', err);
      }

      // Extras pendientes
      let extrasPend = 0;
      if (esGerente) {
        try {
          const resExt = await fetchConAuth('http://localhost:5000/api/asistencia/proyecto/all');
          const textExt = await resExt.text();
          let dataExt;
          try {
            dataExt = JSON.parse(textExt);
          } catch (e) {
            console.error('Respuesta no-JSON de /api/asistencia:', textExt.substring(0, 200));
            dataExt = { success: false };
          }
          if (dataExt.success && Array.isArray(dataExt.data)) {
            extrasPend = dataExt.data.filter(r => r.extrasPendientesAprobacion === true).length;
          }
        } catch (e) {
          console.error('Error fetching asistencia:', e);
        }
      }

      const totalMes = nominas.reduce((acc, n) => acc + (n.totalNomina || 0), 0);

      setResumen({
        totalNominaMes: totalMes,
        empleadosActivos: activos,
        extrasPendientes: extrasPend,
        nominasPendientes: nominas.filter(n => n.estado === 'calculada').length,
        descuentosActivos,
        costosPlanta: totalPendienteDescuentos
      });
      setUltimasNominas(nominas);
    } catch (err) {
      console.error('Error general cargando dashboard nómina:', err);
    }
    setCargando(false);
  };

  // Menú filtrado por rol
  const menuItems = [
    { label: 'Registro de Asistencia', icon: '📋', path: '/nomina/asistencia', roles: ['admin', 'gerente', 'secretaria', 'supervisor'] },
    { label: 'Aprobar Horas Extras', icon: '✅', path: '/nomina/aprobar-extras', roles: ['admin', 'gerente'] },
    { label: 'Novedades (Incapacidades, Vacaciones)', icon: '📑', path: '/nomina/novedades', roles: ['admin', 'gerente', 'secretaria'] },
    { label: 'Generar Nómina', icon: '💰', path: '/nomina/generar', roles: ['admin', 'gerente', 'secretaria'] },
    { label: 'Gestión de Descuentos', icon: '💳', path: '/nomina/descuentos', roles: ['admin', 'gerente', 'contabilidad'] },
    { label: 'Comprobantes de Pago', icon: '🧾', path: '/nomina/comprobantes', roles: ['admin', 'gerente', 'secretaria', 'supervisor', 'oficial', 'ayudante', 'residente', 'contabilidad'] },
    { label: 'Reporte para Contador', icon: '📊', path: '/nomina/reportes', roles: ['admin', 'gerente', 'contabilidad'] },
    { label: 'Liquidación de Contrato', icon: '⚖️', path: '/nomina/liquidacion', roles: ['admin', 'gerente'] },
    { label: 'Consignar Cesantías a Fondo', icon: '🏦', path: '/nomina/cesantias-fondo', roles: ['admin', 'gerente', 'contabilidad'] },
  ];

  const itemsFiltrados = menuItems.filter(item => item.roles.includes(rol));

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        {/* Header */}
        <div className="dba-header-text">
          <h1 className="dba-title">Gestión de Nómina</h1>
          <p className="dba-subtitle">
            Neoconstrucciones S.A.S — <strong>Rol: {rol?.toUpperCase()}</strong>
          </p>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="nomina-resumen-grid">
          <div className="nomina-resumen-card nrc-bg-azul">
            <div className="nomina-resumen-label">Empleados Activos</div>
            <div className="nomina-resumen-valor">{resumen.empleadosActivos}</div>
          </div>

          <div className="nomina-resumen-card nrc-bg-verde">
            <div className="nomina-resumen-label">Total Nómina Mes</div>
            <div className="nomina-resumen-valor">${resumen.totalNominaMes.toLocaleString()}</div>
          </div>

          {(esGerente || esSecretaria) && (
            <div className="nomina-resumen-card nrc-bg-rojo">
              <div className="nomina-resumen-label">Extras Pendientes</div>
              <div className="nomina-resumen-valor">{resumen.extrasPendientes}</div>
            </div>
          )}

          {(esGerente || esContador) && (
            <div className="nomina-resumen-card nrc-bg-azul-oscuro">
              <div className="nomina-resumen-label">Descuentos Activos</div>
              <div className="nomina-resumen-valor">{resumen.descuentosActivos}</div>
            </div>
          )}
        </div>

        {/* Menú de opciones */}
        <div className="dba-header-text dba-header-mt">
          <h2 className="dba-title dba-title-sm">Opciones del Módulo</h2>
        </div>

        <div className="dba-grid">
          {itemsFiltrados.map((item, idx) => (
            <div
              key={idx}
              className="dba-card dba-card--azul"
              onClick={() => navigate(item.path)}
            >
              <div className="dba-icon-circle dba-icon--azul">
                <span className="dba-icon-emoji">{item.icon}</span>
              </div>
              <h2 className="dba-card-title dba-card-title--azul">{item.label}</h2>
              <div className="dba-badge dba-badge--azul">
                ACCESO {rol?.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {/* Últimas nóminas */}
        {(esGerente || esSecretaria || esContador) && ultimasNominas.length > 0 && (
          <div className="dba-section-mt">
            <div className="dba-header-text dba-header-mb">
              <h2 className="dba-title dba-title-sm">
                Últimas Nóminas Generadas
              </h2>
            </div>
            <div className="dba-table-wrapper">
              <table className="dba-table">
                <thead>
                  <tr className="dba-table-header">
                    <th className="dba-th">ID Nómina</th>
                    <th className="dba-th">Período</th>
                    <th className="dba-th">Estado</th>
                    <th className="dba-th dba-th-right">Total Nómina</th>
                    <th className="dba-th dba-th-right">Descuentos</th>
                    <th className="dba-th dba-th-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasNominas.map(nom => {
                    const totalDescuentos = nom.empleados?.reduce((sum, emp) => sum + (emp.otrosDescuentos || 0), 0) || 0;
                    return (
                      <tr key={nom._id} className="dba-table-row">
                        <td className="dba-td">{nom.idNomina}</td>
                        <td className="dba-td">{nom.anio}-{String(nom.mes).padStart(2, '0')} Q{nom.quincena}</td>
                        <td className="dba-td">
                          <span className={`dba-estado-badge dba-estado--${nom.estado}`}>
                            {nom.estado.toUpperCase()}
                          </span>
                        </td>
                        <td className="dba-td dba-td-right dba-td-bold">${nom.totalNomina?.toLocaleString()}</td>
                        <td className="dba-td dba-td-right">
                          {totalDescuentos > 0 ? (
                            <span className="dba-valor-negativo">
                              -${totalDescuentos.toLocaleString()}
                            </span>
                          ) : (
                            <span className="dba-valor-muted">—</span>
                          )}
                        </td>
                        <td className="dba-td dba-td-center">
                          <button
                            className="dba-btn-ver"
                            onClick={() => navigate(`/nomina/comprobantes?nomina=${nom.idNomina}`)}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Para obreros: acceso directo a su comprobante */}
        {esObrero && (
          <div className="dba-grid dba-mt-1">
            <div className="dba-card dba-card--verde">
              <div className="dba-icon-circle dba-icon--verde">
                <span className="dba-icon-emoji">🧾</span>
              </div>
              <h2 className="dba-card-title dba-card-title--verde">Mi Comprobante de Pago</h2>
              <p className="dba-card-desc">Consulta tu colilla de nómina más reciente</p>
              <button
                className="dba-btn-verde"
                onClick={() => navigate('/nomina/comprobantes')}
              >
                Ver Mi Colilla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Nomina;
