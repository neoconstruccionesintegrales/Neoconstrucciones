import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/nomina.css';
import axios from '../utils/axiosConfig';
import { toBase64 } from '../utils/toBase64';
import logo from '../imagenes/logo.png';

const fmt = (v) => (v || 0).toLocaleString('es-CO');
const fmtFecha = (fechaStr) => {
  if (!fechaStr) return 'N/A';
  const d = new Date(fechaStr);
  return isNaN(d.getTime()) ? fechaStr : d.toLocaleDateString('es-CO');
};

const motivosLabels = {
  renuncia_voluntaria: 'Renuncia Voluntaria',
  terminacion_contrato: 'Terminación de Contrato',
  despido_justa_causa: 'Despido con Justa Causa',
  despido_sin_justa_causa: 'Despido sin Justa Causa',
  mutuo_acuerdo: 'Mutuo Acuerdo',
  jubilacion: 'Jubilación',
  muerte: 'Muerte'
};

const motivosRetiro = [
  { value: 'renuncia_voluntaria', label: 'Renuncia Voluntaria' },
  { value: 'terminacion_contrato', label: 'Terminación de Contrato' },
  { value: 'despido_justa_causa', label: 'Despido con Justa Causa' },
  { value: 'despido_sin_justa_causa', label: 'Despido sin Justa Causa' },
  { value: 'mutuo_acuerdo', label: 'Mutuo Acuerdo' },
  { value: 'jubilacion', label: 'Jubilación' },
  { value: 'muerte', label: 'Muerte' },
];

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================
function InfoBox({ label, value }) {
  return (
    <div className="dba-hist-info-box">
      <div className="dba-hist-info-box-label">{label}</div>
      <div className="dba-hist-info-box-value">{value || 'N/A'}</div>
    </div>
  );
}

function FilaValor({ label, valor, bold, danger }) {
  const className = `dba-hist-resumen-row${bold ? ' dba-hist-resumen-row--bold' : ''}${danger ? ' dba-hist-resumen-row--danger' : ''}`;
  return (
    <div className={className}>
      <span>{label}</span>
      <span>${fmt(valor)}</span>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL CON PESTAÑAS
// ============================================================
function Liquidacion() {
  const navigate = useNavigate();
  const userRol = localStorage.getItem('rol') || 'ADMIN';
  
  // Estado de pestañas
  const [tabActiva, setTabActiva] = useState('generar');

  // Estados para GENERAR LIQUIDACIÓN
  const [empleados, setEmpleados] = useState([]);
  const [email, setEmail] = useState('');
  const [fechaFinal, setFechaFinal] = useState(new Date().toISOString().split('T')[0]);
  const [motivoRetiro, setMotivoRetiro] = useState('renuncia_voluntaria');
  const [inasistencias, setInasistencias] = useState(null);
  const [vacacionesTomadas, setVacacionesTomadas] = useState(null);
  const [vacacionesManual, setVacacionesManual] = useState(false);
  const [vacacionesCalculado, setVacacionesCalculado] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [inasistenciasCalculado, setInasistenciasCalculado] = useState(0);
  const [inasistenciasManual, setInasistenciasManual] = useState(false);
  const [verificandoInasistencias, setVerificandoInasistencias] = useState(false);
  const [detalleInasistencias, setDetalleInasistencias] = useState([]);
  const [logoBase64, setLogoBase64] = useState('');

  // Estados para HISTORIAL
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [filtroAnio, setFiltroAnio] = useState('');
  const [liquidacionSeleccionada, setLiquidacionSeleccionada] = useState(null);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [errorModal, setErrorModal] = useState('');

  // ============================================================
  // CARGAR LOGO EN BASE64
  // ============================================================
  useEffect(() => {
    const cargarLogo = async () => {
      try {
        const base64 = await toBase64(logo);
        setLogoBase64(base64);
      } catch (error) {
        console.error('Error cargando logo:', error);
        setLogoBase64('');
      }
    };
    cargarLogo();
  }, []);

  // ============================================================
  // CARGAR EMPLEADOS
  // ============================================================
  const cargarEmpleados = async () => {
    try {
      const response = await axios.get('/usuarios');
      if (response.data.success) {
        setEmpleados(response.data.data.filter(u => u.estadoLaboral === 'activo'));
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  };

  useEffect(() => {
    cargarEmpleados();
  }, []);

  // ============================================================
  // VERIFICAR INASISTENCIAS Y VACACIONES
  // ============================================================
  useEffect(() => {
    if (email && fechaFinal) {
      const verificarTodo = async () => {
        await verificarInasistencias(email, fechaFinal);
        await verificarVacaciones(email, fechaFinal);
      };
      verificarTodo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaFinal, email]);

  const verificarInasistencias = async (emailSel, fechaSel) => {
    if (!emailSel || !fechaSel) return;
    setVerificandoInasistencias(true);
    try {
      const response = await axios.get('/nomina/verificar-inasistencias', {
        params: { email: emailSel, fechaFinal: fechaSel }
      });
      if (response.data.success) {
        setInasistenciasCalculado(response.data.inasistencias);
        setDetalleInasistencias(response.data.detalle || []);
        if (!inasistenciasManual) {
          setInasistencias(response.data.inasistencias);
        }
      }
    } catch (error) {
      console.error('Error verificando inasistencias:', error);
    } finally {
      setVerificandoInasistencias(false);
    }
  };

  const verificarVacaciones = async (emailSel, fechaSel) => {
    if (!emailSel || !fechaSel) return;
    try {
      const response = await axios.get('/nomina/verificar-vacaciones', {
        params: { email: emailSel, fechaFinal: fechaSel }
      });
      if (response.data.success) {
        setVacacionesCalculado(response.data.vacacionesTomadas);
        if (!vacacionesManual) {
          setVacacionesTomadas(response.data.vacacionesTomadas);
        }
      }
    } catch (error) {
      console.error('Error verificando vacaciones:', error);
    }
  };

  // ============================================================
  // HANDLERS PARA GENERAR
  // ============================================================
  const handleEmpleadoChange = (e) => {
    const selectedEmail = e.target.value;
    setEmail(selectedEmail);
    const emp = empleados.find(u => u.email === selectedEmail);
    setEmpleadoSeleccionado(emp || null);
    setInasistenciasManual(false);
    setInasistencias(null);
    setInasistenciasCalculado(0);
    setDetalleInasistencias([]);
    setVacacionesTomadas(0);
    setVacacionesManual(false);
    setVacacionesCalculado(0);
    setResultado(null);

    if (selectedEmail && fechaFinal) {
      const verificarTodo = async () => {
        await verificarInasistencias(selectedEmail, fechaFinal);
        await verificarVacaciones(selectedEmail, fechaFinal);
      };
      verificarTodo();
    }
  };

// ============================================================
// HANDLERS PARA GENERAR
// ============================================================
const liquidar = async (e) => {
  e.preventDefault();
  setMensaje('');
  
  // ✅ VALIDACIÓN: Verificar que haya un empleado seleccionado
  if (!email) {
    setMensaje('❌ Debes seleccionar un empleado');
    return;
  }
  
  // ✅ MENSAJE DE CONFIRMACIÓN
  const empleado = empleados.find(emp => emp.email === email);
  const nombreEmpleado = empleado?.nombre || email;
  
  const confirmar = window.confirm(
    `⚠️ ¿Está seguro de generar la liquidación para:\n\n` +
    `👤 ${nombreEmpleado}\n` +
    `📅 Fecha de retiro: ${new Date(fechaFinal).toLocaleDateString('es-CO')}\n` +
    `📌 Motivo: ${motivosRetiro.find(m => m.value === motivoRetiro)?.label || motivoRetiro}\n\n` +
    `🔴 Esta acción:\n` +
    `• Generará la liquidación del empleado\n` +
    `• Marcará al empleado como RETIRADO\n` +
     `¿Deseas continuar?`
  );
  
  if (!confirmar) {
    return; // ✅ Si el usuario cancela, no hace nada
  }

  try {
    const esVacacionesManual = (vacacionesTomadas !== undefined && vacacionesTomadas !== null && String(vacacionesTomadas).trim() !== '');
    const diasVacacionesTomadas = esVacacionesManual
      ? Number(vacacionesTomadas)
      : vacacionesCalculado;

    const payload = {
      email,
      fechaFinal,
      motivoRetiro,
      inasistencias: inasistencias || 0,
      vacacionesTomadas: diasVacacionesTomadas
    };

    const response = await axios.post('/nomina/liquidar', payload);
    
    if (response.data.success) {
      setResultado(response.data.data);
      setMensaje('✅ Liquidación generada. Empleado marcado como retirado.');
      cargarEmpleados();
      if (tabActiva === 'historial') {
        cargarLiquidaciones();
      }
    } else {
      setMensaje('❌ ' + (response.data.error || 'Error al liquidar'));
    }
  } catch (error) {
    setMensaje('❌ Error de conexión: ' + (error.response?.data?.error || error.message));
  }
};
  // ============================================================
  // CARGAR HISTORIAL
  // ============================================================
  const cargarLiquidaciones = useCallback(async () => {
    setCargandoHistorial(true);
    setErrorModal('');
    try {
      const params = filtroAnio ? { anio: filtroAnio } : {};
      const response = await axios.get('/nomina/liquidaciones', { params });
      if (response.data.success) {
        setLiquidaciones(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando liquidaciones:', error);
    } finally {
      setCargandoHistorial(false);
    }
  }, [filtroAnio]);

  useEffect(() => {
    if (tabActiva === 'historial') {
      cargarLiquidaciones();
    }
  }, [tabActiva, cargarLiquidaciones]);

  // ============================================================
  // HANDLERS PARA HISTORIAL
  // ============================================================
  const verDetalle = async (id) => {
    if (!id) {
      setErrorModal('❌ ID de liquidación no válido');
      return;
    }
    
    setErrorModal('');
    try {
      const idLimpio = String(id).trim();
      const response = await axios.get(`/nomina/liquidaciones/${idLimpio}`);
      
      if (response.data.success) {
        setLiquidacionSeleccionada(response.data.data);
      } else {
        setErrorModal(response.data.error || '❌ Error al cargar la liquidación');
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 404) {
        setErrorModal('❌ Liquidación no encontrada. Verifique el ID.');
      } else if (error.response?.status === 401) {
        setErrorModal('❌ Sesión expirada. Inicie sesión nuevamente.');
      } else {
        setErrorModal('❌ Error de conexión: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const cerrarModal = () => {
    setLiquidacionSeleccionada(null);
    setErrorModal('');
  };

  const exportarExcel = () => {
    const datos = liquidacionesFiltradas.length > 0 ? liquidacionesFiltradas : liquidaciones;
    if (!datos || datos.length === 0) {
      alert('❌ No hay liquidaciones para exportar');
      return;
    }

    const SEP = ';';
    const NEWLINE = '\r\n';
    const BOM = '\ufeff';

    const headers = [
      'ID Liquidación', 'Nombre', 'Documento', 'Email', 'Cargo',
      'Fecha Ingreso', 'Fecha Retiro', 'Motivo Retiro', 'Días Trabajados',
      'Inasistencias', 'Vacaciones Tomadas', 'Salario Base',
      'Auxilio Transporte', 'Base Liquidación', 'Reintegros',
      'Prestaciones Sociales', 'Deducciones', 'Total Liquidación'
    ];

    const filas = datos.map(liq => [
      liq.idLiquidacion || '', liq.nombre || '', liq.documento || '',
      liq.email || '', liq.cargo || '', fmtFecha(liq.fechaIngreso),
      fmtFecha(liq.fechaLiquidacion), motivosLabels[liq.motivoRetiro] || liq.motivoRetiro || '',
      liq.diasTrabajados || 0, liq.inasistencias || 0, liq.vacacionesTomadas || 0,
      liq.salarioBase || 0, liq.auxilioTransporte || 0, liq.baseLiquidacion || 0,
      liq.totalReintegros || 0, liq.totalPrestaciones || 0, liq.totalDeducciones || 0,
      liq.totalLiquidacion || 0
    ]);

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
    link.setAttribute('download', `Liquidaciones_${filtroAnio || 'Todas'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================
// GENERADOR DE PDF (usando window.print para guardar como PDF)
// ============================================================
const descargarPDF = (liq) => {
  if (!liq) return;
  
  const logoImg = logoBase64 
    ? `<img src="${logoBase64}" alt="Logo" style="max-height:50px;" />`
    : `<span style="font-size:18px;font-weight:bold;color:#0077b1;">NEOCONSTRUCCIONES</span>`;
  
  const contenido = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Liquidacion_${liq.nombre || 'empleado'}_${liq.idLiquidacion || 'ID'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page { 
      size: A4; 
      margin: 12mm 15mm;
    }
    
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      max-width: 750px; 
      margin: 0 auto; 
      padding: 20px; 
      color: #1a237e; 
      font-size: 11px; 
      line-height: 1.5; 
      background: white;
    }
    
    .header { 
      text-align: center; 
      border-bottom: 3px solid #0d47a1; 
      padding-bottom: 15px; 
      margin-bottom: 20px; 
    }
    
    .header .logo-container { 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      gap: 12px; 
      flex-wrap: wrap; 
    }
    
    .header h1 { 
      color: #0d47a1; 
      margin: 0; 
      font-size: 20px; 
      letter-spacing: 1px; 
      font-weight: 700;
    }
    
    .header .subtitle {
      font-size: 12px;
      color: #37474f;
      margin-top: 4px;
    }
    
    .badge { 
      display: inline-block; 
      padding: 4px 20px; 
      background: #e3f2fd; 
      color: #0d47a1; 
      border-radius: 20px; 
      font-size: 11px; 
      font-weight: 600; 
      margin-top: 8px; 
      border: 1px solid #0d47a1; 
    }
    
    .section { 
      margin-bottom: 16px; 
      page-break-inside: avoid;
    }
    
    .section-title { 
      color: #0d47a1; 
      border-bottom: 2px solid #0d47a1; 
      padding-bottom: 4px; 
      margin-bottom: 10px; 
      font-size: 13px; 
      text-transform: uppercase; 
      letter-spacing: 0.05em; 
      font-weight: 700; 
    }
    
    .info-grid { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 0 30px; 
    }
    
    .info-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 5px 0; 
      border-bottom: 1px dotted #e0e0e0; 
    }
    
    .info-row .label { 
      color: #546e7a; 
      flex: 1; 
    }
    
    .info-row .value { 
      font-weight: 500; 
      text-align: right; 
      flex: 1; 
      padding-left: 15px; 
    }
    
    .table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 8px; 
    }
    
    .table td { 
      padding: 5px 8px; 
      border-bottom: 1px solid #e3f2fd; 
      font-size: 11px; 
    }
    
    .table td.num { 
      text-align: right; 
      font-weight: 500; 
      font-family: 'Courier New', monospace;
    }
    
    .table tr:last-child td {
      border-bottom: none;
    }
    
    .subtotal { 
      background: #f5f9ff; 
      font-weight: 700; 
      color: #0d47a1; 
    }
    
    .subtotal td {
      padding: 6px 8px;
    }
    
    .deduccion { 
      color: #c62828; 
    }
    
    .descuento-tipo { 
      font-size: 9px; 
      color: #888; 
      margin-left: 4px; 
    }
    
    .neto { 
      background: #e8f5e9; 
      padding: 20px; 
      text-align: center; 
      border-radius: 8px; 
      margin: 16px 0; 
      border: 2px solid #2e7d32; 
    }
    
    .neto h2 { 
      color: #2e7d32; 
      margin: 0; 
      font-size: 26px; 
      font-family: 'Courier New', monospace;
    }
    
    .neto .neto-label {
      color: #37474f;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }
    
    .firmas { 
      margin-top: 40px; 
      display: flex; 
      justify-content: space-between; 
      padding: 0 20px; 
    }
    
    .firma-box { 
      text-align: center; 
      width: 220px; 
    }
    
    .firma-line { 
      border-top: 1px solid #1a237e; 
      padding-top: 6px; 
      margin-top: 40px; 
    }
    
    .firma-box .firma-nombre {
      font-weight: 700;
      font-size: 12px;
    }
    
    .firma-box .firma-doc {
      font-size: 10px;
      color: #546e7a;
    }
    
    .firma-box .firma-rol {
      font-size: 10px;
      color: #546e7a;
      margin-top: 2px;
    }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
    
    @media (max-width: 600px) { 
      .info-grid { grid-template-columns: 1fr; } 
      .firmas { flex-direction: column; align-items: center; gap: 20px; padding: 0; } 
      .firma-box { width: 100%; } 
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      ${logoImg}
      <div>
        <h1>LIQUIDACIÓN DE CONTRATO</h1>
        <div class="subtitle">
          Neoconstrucciones Integrales SAS | NIT 901.421.096-1
        </div>
      </div>
    </div>
    <div class="badge">${motivosLabels[liq.motivoRetiro] || liq.motivoRetiro}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Información del Empleado</div>
    <div class="info-grid">
      <div class="info-row"><span class="label">Nombre</span><span class="value">${liq.nombre || 'N/A'}</span></div>
      <div class="info-row"><span class="label">Identificación (CC)</span><span class="value">${liq.documento || 'N/A'}</span></div>
      <div class="info-row"><span class="label">Cargo</span><span class="value">${liq.cargo || 'N/A'}</span></div>
      <div class="info-row"><span class="label">Tipo de contrato</span><span class="value">${liq.tipoContrato || 'N/A'}</span></div>
      <div class="info-row"><span class="label">Fecha de ingreso</span><span class="value">${fmtFecha(liq.fechaIngreso)}</span></div>
      <div class="info-row"><span class="label">Fecha de retiro</span><span class="value">${fmtFecha(liq.fechaLiquidacion)}</span></div>
      <div class="info-row"><span class="label">Días trabajados</span><span class="value">${liq.diasTrabajados} días</span></div>
      <div class="info-row"><span class="label">Inasistencias</span><span class="value">${liq.inasistencias || 0} días</span></div>
      ${liq.vacacionesTomadas > 0 ? `<div class="info-row"><span class="label">Vacaciones tomadas</span><span class="value">${liq.vacacionesTomadas} días</span></div>` : ''}
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Base de Liquidación</div>
    <table class="table">
      <tr><td>Sueldo Base</td><td class="num">$${fmt(liq.salarioBase)}</td></tr>
      <tr><td>Auxilio de Transporte</td><td class="num">$${fmt(liq.auxilioTransporte)}</td></tr>
      <tr class="subtotal"><td><strong>Total Base</strong></td><td class="num"><strong>$${fmt(liq.baseLiquidacion)}</strong></td></tr>
    </table>
  </div>
  
  ${liq.totalReintegros > 0 ? `
  <div class="section">
    <div class="section-title">Reintegros</div>
    <table class="table">
      <tr><td>Reintegro de Salario (${liq.diasMesEfectivos || 0} días)</td><td class="num">$${fmt(liq.sueldoPendiente)}</td></tr>
      <tr class="subtotal"><td><strong>Subtotal Reintegros</strong></td><td class="num"><strong>$${fmt(liq.totalReintegros)}</strong></td></tr>
    </table>
  </div>` : ''}
  
  <div class="section">
    <div class="section-title">Prestaciones Sociales</div>
    <table class="table">
      <tr><td>Prima de Servicios</td><td class="num">$${fmt(liq.prima)}</td></tr>
      <tr><td>Cesantías</td><td class="num">$${fmt(liq.cesantias)}</td></tr>
      <tr><td>Intereses sobre Cesantías</td><td class="num">$${fmt(liq.interesesCesantias)}</td></tr>
      <tr><td>Vacaciones Proporcionales</td><td class="num">$${fmt(liq.vacaciones)}</td></tr>
      <tr class="subtotal"><td><strong>Subtotal Prestaciones</strong></td><td class="num"><strong>$${fmt(liq.totalPrestaciones)}</strong></td></tr>
    </table>
  </div>
  
  <div class="section">
    <div class="section-title">Deducciones</div>
    <table class="table">
      ${liq.saludEmpleado > 0 ? `<tr><td>Salud (4%)</td><td class="num deduccion">-$${fmt(liq.saludEmpleado)}</td></tr>` : ''}
      ${liq.pensionEmpleado > 0 ? `<tr><td>Pensión (4%)</td><td class="num deduccion">-$${fmt(liq.pensionEmpleado)}</td></tr>` : ''}
      ${(liq.detalleDeducciones || []).map(desc => `
        <tr>
          <td>
            ${desc.tipo || 'Otro'}
            ${desc.descripcion ? `<span class="descuento-tipo">(${desc.descripcion})</span>` : ''}
            ${desc.cuotasTotal > 1 ? `<span class="descuento-tipo">- Cuota ${desc.cuotasPagadas + 1}/${desc.cuotasTotal}</span>` : ''}
          </td>
          <td class="num deduccion">-$${fmt(desc.saldoPendiente)}</td>
        </tr>
      `).join('')}
      <tr class="subtotal"><td><strong>Total Deducciones</strong></td><td class="num deduccion"><strong>-$${fmt(liq.totalDeducciones)}</strong></td></tr>
    </table>
  </div>
  
  <div class="neto">
    <div class="neto-label">Total a pagar al empleado</div>
    <h2>$${fmt(liq.totalLiquidacion)}</h2>
  </div>
  
  <div class="firmas">
    <div class="firma-box">
      <div class="firma-line">
        <p class="firma-nombre">${liq.nombre || ''}</p>
        <p class="firma-doc">CC No. ${liq.documento || '_________________'}</p>
        <p class="firma-rol">Empleado</p>
      </div>
    </div>
    <div class="firma-box">
      <div class="firma-line">
        <p class="firma-nombre">Neoconstrucciones Integrales SAS</p>
        <p class="firma-doc">NIT 901.421.096-1</p>
        <p class="firma-rol">Empleador</p>
      </div>
    </div>
  </div>
  
  <div class="no-print" style="text-align:center;margin-top:20px;padding:10px;">
    <button onclick="window.print()" style="padding:10px 30px;background:#0d47a1;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;">
      🖨️ Guardar como PDF
    </button>
    <button onclick="window.close()" style="padding:10px 30px;background:#e0e0e0;color:#333;border:none;border-radius:6px;cursor:pointer;font-size:14px;margin-left:10px;">
      ✕ Cerrar
    </button>
    <p style="margin-top:10px;font-size:11px;color:#888;">
      💡 Al hacer clic en "Guardar como PDF", selecciona "Guardar como PDF" en el destino de impresión.
    </p>
  </div>
  
  <script>
    // Auto-abrir diálogo de impresión al cargar
    window.onload = function() {
      // Pequeño retraso para asegurar que todo se renderice
      setTimeout(function() {
        window.print();
      }, 500);
    };
    
    // También permitir impresión con Ctrl+P
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    });
  </script>
</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
  if (ventana) {
    ventana.document.write(contenido);
    ventana.document.close();
  } else {
    alert('⚠️ Por favor, desbloquea las ventanas emergentes (pop-ups) para poder ver el PDF.');
  }
};

  const liquidacionesFiltradas = liquidaciones.filter(liq => {
    const termino = busquedaHistorial.toLowerCase();
    return (
      (liq.nombre || '').toLowerCase().includes(termino) ||
      (liq.documento || '').includes(termino) ||
      (liq.idLiquidacion || '').toLowerCase().includes(termino)
    );
  });

  const getMotivoClass = (motivo) => {
    if (motivo === 'renuncia_voluntaria') return 'dba-hist-motivo dba-hist-motivo--renuncia';
    if (motivo?.includes('despido')) return 'dba-hist-motivo dba-hist-motivo--despido';
    return 'dba-hist-motivo dba-hist-motivo--otro';
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        <div className="dba-header-text">
          <h1 className="dba-title">⚖️ Liquidación de Contrato</h1>
          <p className="dba-subtitle">
            Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong>
          </p>
        </div>

        {/* PESTAÑAS */}
        <div className="tabs-container">
          <button
            onClick={() => setTabActiva('generar')}
            className={`tab-button ${tabActiva === 'generar' ? 'tab-button-active' : ''}`}
            style={{ color: tabActiva === 'generar' ? '#2e7d32' : '#666' }}
          >
            ⚖️ Generar Liquidación
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`tab-button ${tabActiva === 'historial' ? 'tab-button-active' : ''}`}
            style={{ color: tabActiva === 'historial' ? '#1565c0' : '#666' }}
          >
            📋 Historial de Liquidaciones
          </button>
        </div>

        {/* ============================================
            TAB 1: GENERAR LIQUIDACIÓN
            ============================================ */}
        {tabActiva === 'generar' && (
          <div className="dba-tab-content">
            {mensaje && (
              <div className={`dba-liquidacion-alert ${mensaje.includes('❌') ? 'dba-liquidacion-alert--error' : 'dba-liquidacion-alert--success'}`}>
                <span>{mensaje}</span>
                <button onClick={() => setMensaje('')} className="dba-alert-close">✕</button>
              </div>
            )}

            <form onSubmit={liquidar} className="dba-liquidacion-form">
              <div className="dba-liquidacion-form-grid">
                <div className="dba-liquidacion-form-group">
                  <label>Empleado a Liquidar *</label>
                  <select
                    className="dba-select dba-select--wide"
                    value={email}
                    onChange={handleEmpleadoChange}
                    required
                  >
                    <option value="">-- Seleccione --</option>
                    {empleados.map(emp => (
                      <option key={emp._id} value={emp.email}>
                        {emp.nombre} — {emp.cargo} ({emp.tipoContrato})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dba-liquidacion-form-group">
                  <label>Fecha Final *</label>
                  <input
                    type="date"
                    className="dba-input"
                    value={fechaFinal}
                    onChange={e => setFechaFinal(e.target.value)}
                    required
                  />
                </div>

                <div className="dba-liquidacion-form-group">
                  <label>Motivo de Retiro *</label>
                  <select
                    className="dba-select"
                    value={motivoRetiro}
                    onChange={e => setMotivoRetiro(e.target.value)}
                  >
                    {motivosRetiro.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="dba-liquidacion-form-group">
                  <label>Inasistencias (días)</label>
                  <div className="dba-liquidacion-input-group">
                    <input
                      type="number"
                      min="0"
                      className="dba-input dba-input--narrow"
                      value={inasistencias === null ? '' : inasistencias}
                      onChange={e => {
                        setInasistenciasManual(true);
                        setInasistencias(Number(e.target.value));
                      }}
                    />
                    {verificandoInasistencias && <span className="dba-liquidacion-input-hint">⏳</span>}
                    {inasistenciasCalculado > 0 && !inasistenciasManual && (
                      <span className="dba-liquidacion-input-hint">({inasistenciasCalculado} auto)</span>
                    )}
                  </div>
                  {detalleInasistencias.length > 0 && (
                    <div className="dba-liquidacion-inasistencias-box">
                      <strong>Días encontrados:</strong>
                      <ul>
                        {detalleInasistencias.map((d, i) => (
                          <li key={i}>
                            {fmtFecha(d.fecha)} — {d.tipo === 'falta_injustificada' ? 'Falta injustificada' : 'Licencia no remunerada'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="dba-liquidacion-form-group">
                  <label>Vacaciones Tomadas</label>
                  <div className="dba-liquidacion-input-group">
                    <input
                      type="number"
                      min="0"
                      className="dba-input dba-input--narrow"
                      value={vacacionesTomadas === null ? '' : vacacionesTomadas}
                      onChange={e => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        setVacacionesTomadas(val);
                        setVacacionesManual(val !== null && val >= 0);
                      }}
                    />
                    {vacacionesCalculado > 0 && !vacacionesManual && (
                      <span className="dba-liquidacion-input-hint">({vacacionesCalculado} auto)</span>
                    )}
                  </div>
                </div>

                <button type="submit" className="dba-liquidacion-btn-generar">
                  ⚖️ Generar Liquidación
                </button>
              </div>

              {empleadoSeleccionado && (
                <div className="dba-liquidacion-emp-info">
                  <strong>Información del empleado:</strong>{' '}
                  <span>CC {empleadoSeleccionado.documento || 'N/A'} | </span>
                  <span>Salario base ${fmt(empleadoSeleccionado.sueldo)} | </span>
                  <span>Auxilio: {empleadoSeleccionado.recibeAuxilioTransporte ? 'Sí' : 'No'} | </span>
                  <span>Ingreso: {fmtFecha(empleadoSeleccionado.fechaIngreso) || 'N/A'}</span>
                </div>
              )}

              <p className="dba-liquidacion-warning">
                ⚠️ Advertencia: Esta acción marcará al empleado como RETIRADO y no podrá deshacerse fácilmente.
              </p>
            </form>

            {resultado && empleadoSeleccionado && (
              <div className="dba-liquidacion-result">
                <div className="dba-liquidacion-pdf-btn">
                  <button onClick={() => descargarPDF(resultado)}>📄 Ver / Imprimir PDF</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================
            TAB 2: HISTORIAL DE LIQUIDACIONES
            ============================================ */}
        {tabActiva === 'historial' && (
          <div className="dba-tab-content">
            {/* Filtros */}
            <div className="dba-hist-toolbar">
              <div className="dba-hist-form-group">
                <label>Buscar</label>
                <input
                  type="text"
                  className="dba-input"
                  placeholder="Nombre, documento o ID..."
                  value={busquedaHistorial}
                  onChange={e => setBusquedaHistorial(e.target.value)}
                />
              </div>
              <div className="dba-hist-form-group">
                <label>Año</label>
                <select
                  className="dba-select"
                  value={filtroAnio}
                  onChange={e => setFiltroAnio(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
              <div className="dba-hist-btn-group">
                <button className="dba-hist-btn-refresh" onClick={cargarLiquidaciones}>
                  🔄 Actualizar
                </button>
                <button className="dba-hist-btn-export" onClick={exportarExcel}>
                  📥 Exportar Excel
                </button>
              </div>
            </div>

            {/* Tabla */}
            {cargandoHistorial ? (
              <div className="dba-hist-loading">
                <p>⏳ Cargando liquidaciones...</p>
              </div>
            ) : liquidacionesFiltradas.length === 0 ? (
              <div className="dba-hist-empty">
                <h3>📭 No hay liquidaciones registradas</h3>
                <p>Las liquidaciones aparecerán aquí una vez que se generen.</p>
              </div>
            ) : (
              <div className="dba-hist-table-wrapper">
                <table className="dba-hist-table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Documento</th>
                      <th>Fecha Retiro</th>
                      <th>Motivo</th>
                      <th>Días Trab.</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidacionesFiltradas.map(liq => {
                      const idCorrecto = liq.idLiquidacion; 
                      
                      return (
                        <tr key={liq._id || Math.random()}>
                          <td>
                            <div className="dba-hist-nombre">{liq.nombre || 'N/A'}</div>
                            <div className="dba-hist-email">{liq.email}</div>
                          </td>
                          <td>{liq.documento || 'N/A'}</td>
                          <td>{fmtFecha(liq.fechaLiquidacion)}</td>
                          <td>
                            <span className={getMotivoClass(liq.motivoRetiro)}>
                              {motivosLabels[liq.motivoRetiro] || liq.motivoRetiro}
                            </span>
                          </td>
                          <td>{liq.diasTrabajados} días</td>
                          <td className="dba-hist-total">${fmt(liq.totalLiquidacion)}</td>
                          <td>
                            <div className="dba-hist-actions">
                              <button 
                                className="dba-hist-btn-ver" 
                                onClick={() => {
                                  if (idCorrecto) {
                                    verDetalle(idCorrecto);
                                  } else {
                                    alert('❌ Error: Esta liquidación no tiene un ID válido (idLiquidacion vacío)');
                                  }
                                }}
                              >
                                Ver
                              </button>
                              <button 
                                className="dba-hist-btn-pdf" 
                                onClick={() => descargarPDF(liq)}
                              >
                                PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal de detalle */}
            {liquidacionSeleccionada && (
              <div className="dba-hist-modal-overlay" onClick={cerrarModal}>
                <div className="dba-hist-modal" onClick={e => e.stopPropagation()}>
                  <button className="dba-hist-modal-close" onClick={cerrarModal}>✕</button>
                  <h2 className="dba-hist-modal-title">📄 Detalle de Liquidación</h2>
                  
                  {errorModal && (
                    <div className="dba-hist-modal-error">⚠️ {errorModal}</div>
                  )}

                  <div className="dba-hist-info-grid">
                    <InfoBox label="Empleado" value={liquidacionSeleccionada.nombre} />
                    <InfoBox label="Documento" value={liquidacionSeleccionada.documento} />
                    <InfoBox label="Fecha Retiro" value={fmtFecha(liquidacionSeleccionada.fechaLiquidacion)} />
                    <InfoBox label="Días Trabajados" value={liquidacionSeleccionada.diasTrabajados + ' días'} />
                    <InfoBox label="Inasistencias" value={(liquidacionSeleccionada.inasistencias || 0) + ' días'} />
                    <InfoBox label="Vacaciones" value={(liquidacionSeleccionada.vacacionesTomadas || 0) + ' días'} />
                    <InfoBox label="Motivo" value={motivosLabels[liquidacionSeleccionada.motivoRetiro] || liquidacionSeleccionada.motivoRetiro} />
                  </div>

                  <div className="dba-hist-resumen">
                    <h4 className="dba-hist-resumen-title">💰 Resumen Financiero</h4>
                    <div className="dba-hist-resumen-grid">
                      <FilaValor label="Salario Base" valor={liquidacionSeleccionada.salarioBase} />
                      <FilaValor label="Auxilio Transporte" valor={liquidacionSeleccionada.auxilioTransporte} />
                      <FilaValor label="Base Liquidación" valor={liquidacionSeleccionada.baseLiquidacion} bold />
                      <div></div>
                      <FilaValor label="Reintegros" valor={liquidacionSeleccionada.totalReintegros} />
                      <FilaValor label="Prestaciones Sociales" valor={liquidacionSeleccionada.totalPrestaciones} />
                      <FilaValor label="Deducciones" valor={-liquidacionSeleccionada.totalDeducciones} danger />
                      <div></div>
                    </div>
                    <div className="dba-hist-resumen-total">
                      <p className="dba-hist-resumen-total-label">Total a Pagar al Empleado</p>
                      <h2 className="dba-hist-resumen-total-value">${fmt(liquidacionSeleccionada.totalLiquidacion)}</h2>
                    </div>
                  </div>

                  <div className="dba-hist-modal-actions">
                    <button className="dba-hist-btn-primary" onClick={() => descargarPDF(liquidacionSeleccionada)}>
                      📄 Ver / Imprimir PDF
                    </button>
                    <button className="dba-hist-btn-secondary" onClick={cerrarModal}>
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botón volver */}
        <div className="db-actions-group">
          <button onClick={() => navigate('/admin')} className="btn-primary">
            ⚙️ Inicio
          </button>
        </div>
      </div>
    </div>
  );
}

export default Liquidacion;