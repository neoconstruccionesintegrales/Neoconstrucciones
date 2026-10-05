import React, { useState, useEffect } from 'react';
import '../../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

const fmt = (v) => (v || 0).toLocaleString('es-CO');
const fmtFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  return isNaN(d.getTime()) ? fechaStr : d.toLocaleDateString('es-CO');
};

// ============================================================
// COMPONENTE: Resumen de Facturas Pagadas
// ============================================================
function ResumenFacturasPagadas({ facturasPagadas, anio }) {
  const totalFacturas = facturasPagadas.length;
  const totalSubtotal = facturasPagadas.reduce((sum, f) => sum + (f.subtotal || 0), 0);
  const totalIVA = facturasPagadas.reduce((sum, f) => sum + (f.iva || 0), 0);
  const totalNeto = facturasPagadas.reduce((sum, f) => sum + (f.netoACobrar || 0), 0);
  const totalRetencion = facturasPagadas.reduce((sum, f) => sum + (f.retencion || 0), 0);

  if (totalFacturas === 0) {
    return (
      <div className="dba-card" style={{ padding: '16px', textAlign: 'center', background: '#f5f5f5' }}>
        <p style={{ color: '#888' }}>📄 No hay facturas pagadas para {anio}</p>
      </div>
    );
  }

  return (
    <div className="resumen-pagado" style={{ 
      background: '#e8f5e9', 
      padding: '16px', 
      borderRadius: '8px',
      marginBottom: '20px',
      border: '2px solid #2e7d32'
    }}>
      <h3 style={{ color: '#2e7d32', marginBottom: '12px' }}>✅ Facturas Pagadas - {anio}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#546e7a' }}>Total Facturas</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>{totalFacturas}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#546e7a' }}>Subtotal</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>${fmt(totalSubtotal)}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#546e7a' }}>IVA</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>${fmt(totalIVA)}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#546e7a' }}>Retención</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#c0392b' }}>${fmt(totalRetencion)}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#546e7a' }}>Neto Cobrado</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a8a3f' }}>${fmt(totalNeto)}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: Balance Financiero
// ============================================================
function BalanceFinanciero({ ingresos, egresos }) {
  const resultado = ingresos - egresos;
  const esPositivo = resultado >= 0;
  const margen = egresos > 0 ? (resultado / egresos) * 100 : 0;

  return (
    <div className="dba-card" style={{ 
      padding: '16px', 
      border: `2px solid ${esPositivo ? '#2e7d32' : '#c0392b'}`,
      background: esPositivo ? '#f1f8e9' : '#fce4ec',
      marginBottom: '20px'
    }}>
      <h3 style={{ marginBottom: '12px', color: '#2c3e50' }}>📊 Balance Financiero</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#546e7a' }}>Ingresos (Facturas Pagadas)</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>${fmt(ingresos)}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#546e7a' }}>Egresos (Nóminas + Costos)</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c0392b' }}>${fmt(egresos)}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#546e7a' }}>Resultado</div>
          <div style={{ 
            fontSize: '22px', 
            fontWeight: 'bold', 
            color: esPositivo ? '#2e7d32' : '#c0392b' 
          }}>
            {esPositivo ? '+' : ''}${fmt(resultado)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#546e7a' }}>Margen</div>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: esPositivo ? '#2e7d32' : '#c0392b' 
          }}>
            {margen.toFixed(1)}%
          </div>
        </div>
      </div>
      {resultado < 0 && (
        <div style={{ marginTop: '12px', padding: '8px', background: '#ffcdd2', borderRadius: '4px', color: '#c62828', fontSize: '13px' }}>
          ⚠️ El resultado es negativo. Se recomienda revisar los gastos o aumentar los ingresos.
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
function ReportesNomina() {
  const userRol = localStorage.getItem('rol') || 'ADMIN';
  const isContador = userRol === 'contabilidad' || userRol === 'admin';

  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  
  // Datos para informes
  const [nominas, setNominas] = useState([]);
  const [cesantias, setCesantias] = useState([]);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [resumenAnual, setResumenAnual] = useState(null);
  
  // ✅ CORREGIDO: Solo declaramos lo que usamos
  const [facturasPagadas, setFacturasPagadas] = useState([]);
  const [resumenFacturas, setResumenFacturas] = useState(null);
  
  // Estado de aprobación del contador
  const [nominasPendientes, setNominasPendientes] = useState([]);
  
  // Para gráficos
  const [showGraficos, setShowGraficos] = useState(false);

  const [tabActiva, setTabActiva] = useState('dashboard');

  useEffect(() => {
    cargarTodosLosDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes]);

  // ============================================================
  // CARGA DE DATOS
  // ============================================================
  const cargarTodosLosDatos = async () => {
    setCargando(true);
    setMensaje('');
    
    try {
      // 1. Cargar nóminas del año
      const resNom = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/nomina?anio=${anio}`
      );
      const dataNom = await resNom.json();
      if (dataNom.success) {
        setNominas(dataNom.data || []);
        const pendientes = (dataNom.data || []).filter(
          n => n.estado === 'calculada' || n.estado === 'pendiente_contador'
        );
        setNominasPendientes(pendientes);
      }

      // 2. Cargar cesantías (desde localStorage)
      try {
        const cesantiasGuardadas = localStorage.getItem('cesantias_historial');
        if (cesantiasGuardadas) {
          const data = JSON.parse(cesantiasGuardadas);
          setCesantias(data.filter(c => c.anio === anio) || []);
        }
      } catch (e) {
        console.error('Error cargando cesantías locales:', e);
      }

      // 3. Cargar liquidaciones
      try {
        const resLiq = await fetchConAuth(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/nomina/liquidaciones?anio=${anio}`
        );
        const dataLiq = await resLiq.json();
        if (dataLiq.success) {
          setLiquidaciones(dataLiq.data || []);
        }
      } catch (e) {
        console.error('Error cargando liquidaciones:', e);
      }

      // 4. Cargar facturas - SOLO LAS PAGADAS
      try {
        const resFact = await fetchConAuth(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/facturas`
        );
        const dataFact = await resFact.json();
        if (dataFact.success) {
          // ✅ CORREGIDO: Solo filtramos las pagadas, no guardamos todas
          const pagadas = (dataFact.data || []).filter(f => {
            const fecha = new Date(f.fechaEmision);
            return f.estado === 'Pagada' && fecha.getFullYear() === anio;
          });
          setFacturasPagadas(pagadas);
          
          // Calcular resumen de facturas
          const totalSubtotal = pagadas.reduce((sum, f) => sum + (f.subtotal || 0), 0);
          const totalIVA = pagadas.reduce((sum, f) => sum + (f.iva || 0), 0);
          const totalRetencion = pagadas.reduce((sum, f) => sum + (f.retencion || 0), 0);
          const totalNeto = pagadas.reduce((sum, f) => sum + (f.netoACobrar || 0), 0);
          
          setResumenFacturas({
            totalFacturas: pagadas.length,
            totalSubtotal,
            totalIVA,
            totalRetencion,
            totalNeto
          });
        }
      } catch (e) {
        console.error('Error cargando facturas:', e);
        setFacturasPagadas([]);
      }

      // 5. Calcular resumen anual
      calcularResumenAnual(dataNom.data || []);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      setMensaje('❌ Error al cargar los datos');
    }
    
    setCargando(false);
  };

  const calcularResumenAnual = (nominasData) => {
    const totalNomina = nominasData.reduce((sum, n) => sum + (n.totalNomina || 0), 0);
    const totalAportes = nominasData.reduce((sum, n) => sum + (n.totalAportes || 0), 0);
    const totalCosto = nominasData.reduce((sum, n) => sum + (n.totalCosto || 0), 0);
    const totalEmpleados = new Set();
    nominasData.forEach(n => {
      (n.empleados || []).forEach(e => totalEmpleados.add(e.email));
    });
    
    setResumenAnual({
      totalNomina,
      totalAportes,
      totalCosto,
      totalEmpleados: totalEmpleados.size,
      totalNominas: nominasData.length,
      nominasPagadas: nominasData.filter(n => n.estado === 'pagada').length,
      nominasAprobadas: nominasData.filter(n => n.estado === 'aprobada').length,
    });
  };

  // ============================================================
  // APROBACIÓN DE NÓMINA POR CONTADOR
  // ============================================================
  const aprobarNominaContador = async (idNomina) => {
    if (!isContador) {
      setMensaje('❌ No tienes permisos para aprobar nóminas');
      return;
    }
    
    if (!window.confirm('¿Confirmas que esta nómina es correcta y puede ser pagada?')) return;
    
    try {
      const res = await fetchConAuth(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/nomina/${idNomina}/aprobar-contador`,
        { method: 'PUT' }
      );
      const data = await res.json();
      if (data.success) {
        setMensaje('✅ Nómina aprobada por contador');
        cargarTodosLosDatos();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al aprobar'));
      }
    } catch (err) {
      setMensaje('❌ Error de conexión');
    }
  };

  // ============================================================
  // EXPORTAR INFORMES
  // ============================================================
  const exportarExcel = (tipo, data) => {
    if (!data || data.length === 0) {
      setMensaje('❌ No hay datos para exportar');
      return;
    }

    const SEP = ';';
    const NEWLINE = '\r\n';
    const BOM = '\ufeff';

    let headers = [];
    let filas = [];

    switch (tipo) {
      case 'nomina':
        headers = ['ID Nómina', 'Período', 'Empleados', 'Total Devengado', 'Total Deducciones', 'Neto a Pagar', 'Costo Total', 'Estado'];
        filas = data.map(n => [
          n.idNomina,
          `${fmtFecha(n.fechaInicio)} - ${fmtFecha(n.fechaFin)}`,
          n.empleados?.length || 0,
          n.totalDevengado || 0,
          n.totalDeducciones || 0,
          n.totalNomina || 0,
          n.totalCosto || 0,
          n.estado || ''
        ]);
        break;
        
      case 'cesantias':
        headers = ['Año', 'Empleados', 'Total Cesantías', 'Total Intereses', 'Total a Consignar', 'Fecha Límite'];
        filas = data.map(c => [
          c.anio,
          c.totalEmpleados || 0,
          c.totalCesantias || 0,
          c.totalIntereses || 0,
          c.totalConsignar || 0,
          `28 Feb ${c.anio + 1}`
        ]);
        break;
        
      case 'liquidaciones':
        headers = ['ID Liquidación', 'Empleado', 'Documento', 'Cargo', 'Fecha Retiro', 'Salario Base', 'Prestaciones', 'Deducciones', 'Total a Pagar', 'Motivo'];
        filas = data.map(l => [
          l.idLiquidacion || '',
          l.nombre || '',
          l.documento || '',
          l.cargo || '',
          fmtFecha(l.fechaLiquidacion),
          l.salarioBase || 0,
          l.totalPrestaciones || 0,
          l.totalDeducciones || 0,
          l.totalLiquidacion || 0,
          l.motivoRetiro || ''
        ]);
        break;
        
      case 'facturas':
        headers = ['ID Factura', 'Cliente', 'Proyecto', 'Fecha Emisión', 'Fecha Pago', 'Subtotal', 'IVA', 'Retención', 'Neto Cobrado', 'Método Pago'];
        filas = data.map(f => [
          f.idFactura || '',
          f.nombreEmpresa || '',
          f.nombreProyecto || '',
          fmtFecha(f.fechaEmision),
          fmtFecha(f.fechaPagoTotal || f.fechaPagoAnticipo),
          f.subtotal || 0,
          f.iva || 0,
          f.retencion || 0,
          f.netoACobrar || 0,
          f.metodoPago || ''
        ]);
        break;
        
      default:
        return;
    }

    const escapar = (valor) => {
      const str = String(valor ?? '');
      if (str.includes(SEP) || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvContent = BOM + [
      headers.join(SEP),
      ...filas.map(fila => fila.map(escapar).join(SEP))
    ].join(NEWLINE);

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${tipo}_${anio}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setMensaje(`✅ ${tipo} exportada a Excel`);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        {/* Header */}
        <div className="dba-header-text">
          <h1 className="dba-title">📊 Reportes para Contador</h1>
          <p className="dba-subtitle">
            Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
            {isContador && <span style={{ color: '#1a8a3f', marginLeft: '10px' }}>✅ Tienes permisos de aprobación</span>}
          </p>
        </div>

        {mensaje && (
          <div className={`dba-alert ${mensaje.includes('❌') ? 'dba-alert-error' : 'dba-alert-success'}`}>
            {mensaje}
            <button className="dba-alert-close" onClick={() => setMensaje('')}>✕</button>
          </div>
        )}

        {/* Filtros */}
        <div className="dba-filters" style={{ marginBottom: '20px' }}>
          <div className="dba-form-group">
            <label className="dba-label">Año</label>
            <select className="dba-select" value={anio} onChange={e => setAnio(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="dba-form-group">
            <label className="dba-label">Mes</label>
            <select className="dba-select" value={mes} onChange={e => setMes(Number(e.target.value))}>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2026, m - 1).toLocaleString('es-CO', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <button className="dba-btn dba-btn-primary" onClick={cargarTodosLosDatos} disabled={cargando}>
            {cargando ? '⏳ Cargando...' : '🔄 Actualizar'}
          </button>
        </div>

        {/* Tabs */}
        <div className="dba-tabs" style={{ marginBottom: '20px' }}>
          {[
            { key: 'dashboard', label: '📊 Dashboard', color: '#127782' },
            { key: 'nominas', label: '📋 Nóminas', color: '#2c3e50' },
            { key: 'cesantias', label: '🏦 Cesantías', color: '#d17325' },
            { key: 'facturas', label: '📄 Facturas Pagadas', color: '#2e7d32' },
            { key: 'liquidaciones', label: '⚖️ Liquidaciones', color: '#c0392b' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setTabActiva(tab.key)}
              className={`dba-tab ${tabActiva === tab.key ? 'dba-tab--active' : ''}`}
              style={{ '--tab-color': tab.color }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================================
            TAB: DASHBOARD
            ============================================================ */}
        {tabActiva === 'dashboard' && (
          <div>
            {/* Resumen Anual */}
            {resumenAnual && (
              <div className="dba-stats-grid" style={{ marginBottom: '24px' }}>
                <div className="dba-stat-card" style={{ background: '#127782' }}>
                  <div className="stat-label">Total Nómina</div>
                  <div className="stat-value">${fmt(resumenAnual.totalNomina)}</div>
                </div>
                <div className="dba-stat-card" style={{ background: '#1a3c40' }}>
                  <div className="stat-label">Total Aportes</div>
                  <div className="stat-value">${fmt(resumenAnual.totalAportes)}</div>
                </div>
                <div className="dba-stat-card" style={{ background: '#2c3e50' }}>
                  <div className="stat-label">Costo Total</div>
                  <div className="stat-value">${fmt(resumenAnual.totalCosto)}</div>
                </div>
                <div className="dba-stat-card" style={{ background: '#c0392b' }}>
                  <div className="stat-label">Empleados</div>
                  <div className="stat-value">{resumenAnual.totalEmpleados}</div>
                </div>
              </div>
            )}

            {/* Balance Financiero */}
            {resumenAnual && resumenFacturas && (
              <BalanceFinanciero 
                ingresos={resumenFacturas.totalNeto || 0}
                egresos={resumenAnual.totalCosto || 0}
              />
            )}

            {/* Resumen Facturas Pagadas en Dashboard */}
            {resumenFacturas && resumenFacturas.totalFacturas > 0 && (
              <div className="dba-stats-grid" style={{ marginBottom: '24px' }}>
                <div className="dba-stat-card" style={{ background: '#2e7d32' }}>
                  <div className="stat-label">Facturas Pagadas</div>
                  <div className="stat-value">{resumenFacturas.totalFacturas}</div>
                </div>
                <div className="dba-stat-card" style={{ background: '#1b5e20' }}>
                  <div className="stat-label">Neto Cobrado</div>
                  <div className="stat-value">${fmt(resumenFacturas.totalNeto)}</div>
                </div>
                <div className="dba-stat-card" style={{ background: '#f57c00' }}>
                  <div className="stat-label">IVA Recaudado</div>
                  <div className="stat-value">${fmt(resumenFacturas.totalIVA)}</div>
                </div>
                <div className="dba-stat-card" style={{ background: '#c62828' }}>
                  <div className="stat-label">Retención</div>
                  <div className="stat-value">${fmt(resumenFacturas.totalRetencion)}</div>
                </div>
              </div>
            )}

            {/* Nóminas Pendientes de Aprobación */}
            {isContador && nominasPendientes.length > 0 && (
              <div className="dba-card" style={{ border: '2px solid #f39c12', marginBottom: '20px' }}>
                <h3 style={{ color: '#f39c12', marginBottom: '12px' }}>⏳ Nóminas Pendientes de Aprobación por Contador</h3>
                <div className="dba-table-wrapper">
                  <table className="dba-table">
                    <thead>
                      <tr>
                        <th>ID Nómina</th>
                        <th>Período</th>
                        <th>Empleados</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nominasPendientes.map(nom => (
                        <tr key={nom._id}>
                          <td>{nom.idNomina}</td>
                          <td>{fmtFecha(nom.fechaInicio)} - {fmtFecha(nom.fechaFin)}</td>
                          <td>{nom.empleados?.length || 0}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>${fmt(nom.totalNomina)}</td>
                          <td>
                            <span className="dba-estado-badge dba-estado-badge--calculada">
                              {nom.estado === 'calculada' ? '📝 Calculada' : '⏳ Pendiente'}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="dba-btn-aprobar" 
                              onClick={() => aprobarNominaContador(nom.idNomina)}
                            >
                              ✅ Aprobar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Gráficos simples (CSS) */}
            <div className="dba-card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: '#2c3e50' }}>📈 Resumen del Año</h3>
                <button 
                  className="dba-btn dba-btn-secondary" 
                  onClick={() => setShowGraficos(!showGraficos)}
                >
                  {showGraficos ? '📊 Ocultar Gráficos' : '📊 Mostrar Gráficos'}
                </button>
              </div>
            </div>

            {showGraficos && resumenAnual && resumenFacturas && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Gráfico de barras simple - Ingresos vs Gastos */}
                <div className="dba-card" style={{ padding: '16px' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#546e7a' }}>Ingresos vs Gastos</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                        <span style={{ color: '#2e7d32' }}>Ingresos (Facturas Pagadas)</span>
                        <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>${fmt(resumenFacturas.totalNeto)}</span>
                      </div>
                      <div style={{ background: '#e0e0e0', borderRadius: '4px', height: '16px', overflow: 'hidden' }}>
                        <div style={{ 
                          background: '#2e7d32', 
                          height: '100%', 
                          width: `${Math.min(100, (resumenFacturas.totalNeto / Math.max(resumenAnual.totalCosto, 1)) * 100)}%`,
                          transition: 'width 0.5s'
                        }}></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                        <span style={{ color: '#c0392b' }}>Gastos (Nóminas + Costos)</span>
                        <span style={{ fontWeight: 'bold', color: '#c0392b' }}>${fmt(resumenAnual.totalCosto)}</span>
                      </div>
                      <div style={{ background: '#e0e0e0', borderRadius: '4px', height: '16px', overflow: 'hidden' }}>
                        <div style={{ 
                          background: '#c0392b', 
                          height: '100%', 
                          width: `${Math.min(100, (resumenAnual.totalCosto / Math.max(resumenFacturas.totalNeto, 1)) * 100)}%`,
                          transition: 'width 0.5s'
                        }}></div>
                      </div>
                    </div>
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ fontWeight: 'bold' }}>Resultado</span>
                        <span style={{ fontWeight: 'bold', color: (resumenFacturas.totalNeto - resumenAnual.totalCosto) >= 0 ? '#2e7d32' : '#c0392b' }}>
                          {(resumenFacturas.totalNeto - resumenAnual.totalCosto) >= 0 ? '+' : ''}
                          ${fmt(resumenFacturas.totalNeto - resumenAnual.totalCosto)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estadísticas rápidas */}
                <div className="dba-card" style={{ padding: '16px' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#546e7a' }}>Estadísticas del Año</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>{resumenAnual.totalNominas}</div>
                      <div style={{ fontSize: '11px', color: '#546e7a' }}>Nóminas</div>
                    </div>
                    <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d47a1' }}>{resumenAnual.nominasPagadas}</div>
                      <div style={{ fontSize: '11px', color: '#546e7a' }}>Pagadas</div>
                    </div>
                    <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>{resumenFacturas.totalFacturas || 0}</div>
                      <div style={{ fontSize: '11px', color: '#546e7a' }}>Facturas Pagadas</div>
                    </div>
                    <div style={{ background: '#fce4ec', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c62828' }}>
                        {resumenAnual.totalNominas - resumenAnual.nominasPagadas - resumenAnual.nominasAprobadas}
                      </div>
                      <div style={{ fontSize: '11px', color: '#546e7a' }}>Pendientes</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB: NÓMINAS
            ============================================================ */}
        {tabActiva === 'nominas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#2c3e50' }}>📋 Nóminas del {anio}</h3>
              <button className="dba-btn-export" onClick={() => exportarExcel('nomina', nominas)}>
                📥 Exportar Excel
              </button>
            </div>
            
            {nominas.length === 0 ? (
              <div className="dba-historial-empty">
                <div className="dba-historial-empty-icon">📋</div>
                <h3>No hay nóminas para {anio}</h3>
              </div>
            ) : (
              <div className="dba-table-wrapper">
                <table className="dba-table">
                  <thead>
                    <tr>
                      <th>ID Nómina</th>
                      <th>Período</th>
                      <th>Empleados</th>
                      <th style={{ textAlign: 'right' }}>Total Devengado</th>
                      <th style={{ textAlign: 'right' }}>Total Deducciones</th>
                      <th style={{ textAlign: 'right' }}>Neto a Pagar</th>
                      <th style={{ textAlign: 'right' }}>Costo Total</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nominas.map(nom => (
                      <tr key={nom._id}>
                        <td>{nom.idNomina}</td>
                        <td>{fmtFecha(nom.fechaInicio)} - {fmtFecha(nom.fechaFin)}</td>
                        <td>{nom.empleados?.length || 0}</td>
                        <td style={{ textAlign: 'right' }}>${fmt(nom.totalDevengado)}</td>
                        <td style={{ textAlign: 'right', color: '#c0392b' }}>${fmt(nom.totalDeducciones)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>${fmt(nom.totalNomina)}</td>
                        <td style={{ textAlign: 'right' }}>${fmt(nom.totalCosto)}</td>
                        <td>
                          <span className={`dba-estado-badge dba-estado-badge--${nom.estado || 'abierta'}`}>
                            {nom.estado || 'Abierta'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB: CESANTÍAS
            ============================================================ */}
        {tabActiva === 'cesantias' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#d17325' }}>🏦 Cesantías - {anio}</h3>
              <button className="dba-btn-export" onClick={() => exportarExcel('cesantias', cesantias)}>
                📥 Exportar Excel
              </button>
            </div>

            {cesantias.length === 0 ? (
              <div className="dba-historial-empty">
                <div className="dba-historial-empty-icon">🏦</div>
                <h3>No hay cesantías registradas para {anio}</h3>
                <p>Ve a "Consignar Cesantías" para generar el reporte.</p>
              </div>
            ) : (
              <div className="dba-table-wrapper">
                <table className="dba-table">
                  <thead>
                    <tr>
                      <th>Año</th>
                      <th style={{ textAlign: 'center' }}>Empleados</th>
                      <th style={{ textAlign: 'right' }}>Total Cesantías</th>
                      <th style={{ textAlign: 'right' }}>Total Intereses</th>
                      <th style={{ textAlign: 'right' }}>Total a Consignar</th>
                      <th>Fecha Límite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cesantias.map((c, idx) => (
                      <tr key={idx}>
                        <td><strong>{c.anio}</strong></td>
                        <td style={{ textAlign: 'center' }}>{c.totalEmpleados || 0}</td>
                        <td style={{ textAlign: 'right' }}>${fmt(c.totalCesantias || 0)}</td>
                        <td style={{ textAlign: 'right' }}>${fmt(c.totalIntereses || 0)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#c0392b' }}>${fmt(c.totalConsignar || 0)}</td>
                        <td>28 Feb {c.anio + 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB: FACTURAS PAGADAS
            ============================================================ */}
        {tabActiva === 'facturas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#2e7d32' }}>📄 Facturas Pagadas - {anio}</h3>
              <button className="dba-btn-export" onClick={() => exportarExcel('facturas', facturasPagadas)}>
                📥 Exportar Excel
              </button>
            </div>

            {/* Resumen de facturas pagadas */}
            <ResumenFacturasPagadas facturasPagadas={facturasPagadas} anio={anio} />

            {facturasPagadas.length === 0 ? (
              <div className="dba-historial-empty">
                <div className="dba-historial-empty-icon">📄</div>
                <h3>No hay facturas pagadas para {anio}</h3>
                <p>Las facturas aparecerán aquí una vez que los clientes realicen los pagos.</p>
              </div>
            ) : (
              <div className="dba-table-wrapper">
                <table className="dba-table">
                  <thead>
                    <tr>
                      <th>ID Factura</th>
                      <th>Cliente / Proyecto</th>
                      <th>Fecha Pago</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                      <th style={{ textAlign: 'right' }}>IVA</th>
                      <th style={{ textAlign: 'right' }}>Retención</th>
                      <th style={{ textAlign: 'right' }}>Neto Cobrado</th>
                      <th>Método Pago</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasPagadas.map(f => {
                      const esIndependiente = f.idProyecto && f.idProyecto.startsWith('IND-');
                      const fechaPago = f.fechaPagoTotal || f.fechaPagoAnticipo;
                      return (
                        <tr key={f._id || f.idFactura}>
                          <td><strong>{f.idFactura}</strong></td>
                          <td>
                            <div style={{ fontWeight: '500' }}>{f.nombreEmpresa || 'N/A'}</div>
                            <div style={{ fontSize: '11px', color: '#888' }}>{f.nombreProyecto || 'Sin proyecto'}</div>
                          </td>
                          <td>{fmtFecha(fechaPago)}</td>
                          <td style={{ textAlign: 'right' }}>${fmt(f.subtotal)}</td>
                          <td style={{ textAlign: 'right' }}>${fmt(f.iva)}</td>
                          <td style={{ textAlign: 'right', color: '#c0392b' }}>${fmt(f.retencion)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#2e7d32' }}>${fmt(f.netoACobrar)}</td>
                          <td style={{ fontSize: '12px' }}>{f.metodoPago || 'N/A'}</td>
                          <td>
                            <span className={`tipo-badge ${esIndependiente ? 'tipo-independiente' : 'tipo-proyecto'}`}>
                              {esIndependiente ? '📄 Independiente' : '📋 Proyecto'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#e8f5e9', fontWeight: 'bold' }}>
                      <td colSpan="3" style={{ padding: '12px', textAlign: 'right' }}>
                        TOTALES
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        ${fmt(facturasPagadas.reduce((s, f) => s + (f.subtotal || 0), 0))}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        ${fmt(facturasPagadas.reduce((s, f) => s + (f.iva || 0), 0))}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#c0392b' }}>
                        ${fmt(facturasPagadas.reduce((s, f) => s + (f.retencion || 0), 0))}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#2e7d32', fontSize: '16px' }}>
                        ${fmt(facturasPagadas.reduce((s, f) => s + (f.netoACobrar || 0), 0))}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB: LIQUIDACIONES
            ============================================================ */}
        {tabActiva === 'liquidaciones' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#c0392b' }}>⚖️ Liquidaciones - {anio}</h3>
              <button className="dba-btn-export" onClick={() => exportarExcel('liquidaciones', liquidaciones)}>
                📥 Exportar Excel
              </button>
            </div>

            {liquidaciones.length === 0 ? (
              <div className="dba-historial-empty">
                <div className="dba-historial-empty-icon">⚖️</div>
                <h3>No hay liquidaciones para {anio}</h3>
              </div>
            ) : (
              <div className="dba-table-wrapper">
                <table className="dba-table">
                  <thead>
                    <tr>
                      <th>ID Liquidación</th>
                      <th>Empleado</th>
                      <th>Documento</th>
                      <th>Cargo</th>
                      <th>Fecha Retiro</th>
                      <th style={{ textAlign: 'right' }}>Salario Base</th>
                      <th style={{ textAlign: 'right' }}>Prestaciones</th>
                      <th style={{ textAlign: 'right' }}>Deducciones</th>
                      <th style={{ textAlign: 'right' }}>Total a Pagar</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidaciones.map(l => (
                      <tr key={l._id || l.idLiquidacion}>
                        <td>{l.idLiquidacion || 'N/A'}</td>
                        <td><strong>{l.nombre || 'N/A'}</strong></td>
                        <td>{l.documento || 'N/A'}</td>
                        <td>{l.cargo || 'N/A'}</td>
                        <td>{fmtFecha(l.fechaLiquidacion)}</td>
                        <td style={{ textAlign: 'right' }}>${fmt(l.salarioBase)}</td>
                        <td style={{ textAlign: 'right' }}>${fmt(l.totalPrestaciones)}</td>
                        <td style={{ textAlign: 'right', color: '#c0392b' }}>${fmt(l.totalDeducciones)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#2e7d32' }}>${fmt(l.totalLiquidacion)}</td>
                        <td>
                          <span className="dba-estado-badge dba-estado-badge--calculada">
                            {l.motivoRetiro || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportesNomina;