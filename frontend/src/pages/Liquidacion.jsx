import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

const fmt = (v) => (v || 0).toLocaleString('es-CO');

const fmtFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const str = fechaStr.toString();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return new Date(fechaStr).toLocaleDateString('es-CO');
};

function Liquidacion() {
  const [empleados, setEmpleados] = useState([]);
  const [email, setEmail] = useState('');
  const [fechaFinal, setFechaFinal] = useState(new Date().toISOString().split('T')[0]);
  const [motivoRetiro, setMotivoRetiro] = useState('renuncia_voluntaria');
  const [inasistencias, setInasistencias] = useState(null);
  const [vacacionesTomadas, setVacacionesTomadas] = useState(null);
  const [vacacionesManual, setVacacionesManual] = useState(false);
  const [vacacionesCalculado, setVacacionesCalculado] = useState(0);
  const [detalleVacaciones, setDetalleVacaciones] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [inasistenciasCalculado, setInasistenciasCalculado] = useState(0);
  const [inasistenciasManual, setInasistenciasManual] = useState(false);
  const [verificandoInasistencias, setVerificandoInasistencias] = useState(false);
  const [detalleInasistencias, setDetalleInasistencias] = useState([]);
// Detectar rol del usuario desde localStorage o default
  const userRol = localStorage.getItem('rol') || 'ADMIN';
  const motivosRetiro = [
    { value: 'renuncia_voluntaria', label: 'Renuncia Voluntaria' },
    { value: 'terminacion_contrato', label: 'Terminación de Contrato' },
    { value: 'despido_justa_causa', label: 'Despido con Justa Causa' },
    { value: 'despido_sin_justa_causa', label: 'Despido sin Justa Causa' },
    { value: 'mutuo_acuerdo', label: 'Mutuo Acuerdo' },
    { value: 'jubilacion', label: 'Jubilación' },
    { value: 'muerte', label: 'Muerte' },
  ];

  useEffect(() => {
    cargarEmpleados();
  }, []);

  useEffect(() => {
    if (email && fechaFinal) {
      const verificarTodo = async () => {
        await verificarInasistencias(email, fechaFinal);
        await verificarVacaciones(email, fechaFinal);
      };
      verificarTodo();
    }
  }, [fechaFinal]);

  const cargarEmpleados = async () => {
    const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/usuarios`);
    const data = await res.json();
    if (data.success) setEmpleados(data.data.filter(u => u.estadoLaboral === 'activo'));
  };

  const verificarInasistencias = async (emailSel, fechaSel) => {
    if (!emailSel || !fechaSel) return;
    setVerificandoInasistencias(true);
    try {
    const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/nomina/verificar-inasistencias?email=${emailSel}&fechaFinal=${fechaSel}`);      const data = await res.json();
      if (data.success) {
        setInasistenciasCalculado(data.inasistencias);
        setDetalleInasistencias(data.detalle || []);
        if (!inasistenciasManual) {
          setInasistencias(data.inasistencias);
        }
      }
      return data;
    } catch (err) {
      console.error('Error verificando inasistencias:', err);
      throw err;
    } finally {
      setVerificandoInasistencias(false);
    }
  };

  const verificarVacaciones = async (emailSel, fechaSel) => {
    if (!emailSel || !fechaSel) return;
    try {
      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/nomina/verificar-vacaciones?email=${emailSel}&fechaFinal=${fechaSel}`);
      const data = await res.json();
      if (data.success) {
        setVacacionesCalculado(data.vacacionesTomadas);
        setDetalleVacaciones(data.detalle || []);
        if (!vacacionesManual) {
          setVacacionesTomadas(data.vacacionesTomadas);
        }
      }
      return data;
    } catch (err) {
      console.error('Error verificando vacaciones:', err);
      throw err;
    }
  };

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
    setDetalleVacaciones([]);

    if (selectedEmail && fechaFinal) {
      const verificarTodo = async () => {
        await verificarInasistencias(selectedEmail, fechaFinal);
        await verificarVacaciones(selectedEmail, fechaFinal);
      };
      verificarTodo();
    }
  };

  const liquidar = async (e) => {
    e.preventDefault();
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

      const res = await fetchConAuth(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/nomina/liquidar`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setResultado(data.data);
        setMensaje('✅ Liquidación generada. Empleado marcado como retirado.');
        cargarEmpleados();
      } else {
        setMensaje('❌ ' + (data.error || 'Error al liquidar'));
      }
    } catch (err) {
      setMensaje('❌ Error de conexión');
    }
  };

  const descargarPDF = () => {
    if (!resultado || !empleadoSeleccionado) return;

    const r = resultado;
    const emp = empleadoSeleccionado;

    const contenido = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Liquidación ${emp.nombre || r.email}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      max-width: 750px; 
      margin: 0 auto; 
      padding: 20px; 
      color: #263238; 
      font-size: 12px; 
      line-height: 1.5; 
    }
    .header { 
      text-align: center; 
      border-bottom: 3px solid #1565c0; 
      padding-bottom: 15px; 
      margin-bottom: 20px; 
    }
    .header h1 { 
      color: #0d47a1; 
      margin: 0; 
      font-size: 20px; 
      letter-spacing: 1px; 
    }
    .header p { 
      color: #546e7a; 
      margin: 3px 0; 
      font-size: 11px; 
    }
    .badge { 
      display: inline-block; 
      padding: 4px 16px; 
      background: #e3f2fd; 
      color: #0d47a1; 
      border-radius: 4px; 
      font-size: 11px; 
      font-weight: bold; 
      margin-top: 8px; 
      border: 1px solid #1565c0; 
    }
    .warning { 
      background: #fff8e1; 
      border-left: 4px solid #f57c00; 
      padding: 10px 14px; 
      margin-bottom: 15px; 
      font-size: 11px; 
      color: #856404; 
    }
    .section { margin-bottom: 20px; }
    .section-title { 
      color: #1565c0; 
      border-bottom: 2px solid #1565c0; 
      padding-bottom: 6px; 
      margin-bottom: 12px; 
      font-size: 13px; 
      text-transform: uppercase; 
      letter-spacing: 0.05em; 
      font-weight: bold; 
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 0 30px;
    }
    .info-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 7px 0; 
      border-bottom: 1px dotted #cfd8dc; 
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
    .info-row.highlight .value { 
      color: #0d47a1; 
      font-weight: bold; 
    }
    .full-width { grid-column: 1 / -1; }
    .table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 10px; 
    }
    .table th { 
      background: #e3f2fd; 
      padding: 8px 10px; 
      text-align: left; 
      font-size: 11px; 
      border-bottom: 2px solid #1565c0; 
      color: #0d47a1; 
      font-weight: 600;
    }
    .table td { 
      padding: 7px 10px; 
      border-bottom: 1px solid #e3f2fd; 
      font-size: 11px; 
    }
    .table td.num { 
      text-align: right; 
      font-weight: 500; 
    }
    .table .subtotal { 
      background: #f5f9ff; 
      font-weight: bold; 
      color: #0d47a1;
    }
    .table .deduccion { 
      color: #c62828; 
    }
    .exento { 
      color: #2e7d32; 
      font-size: 10px; 
      font-style: italic;
    }
    .neto { 
      background: #e8f5e9; 
      padding: 20px; 
      text-align: center; 
      border-radius: 6px; 
      margin: 20px 0; 
      border: 2px solid #2e7d32; 
    }
    .neto h2 { 
      color: #2e7d32; 
      margin: 0; 
      font-size: 24px; 
    }
    .neto-label { 
      color: #546e7a; 
      font-size: 11px; 
      text-transform: uppercase; 
      letter-spacing: 0.1em; 
      margin-bottom: 5px; 
    }
    .firmas { 
      margin-top: 40px; 
      display: flex; 
      justify-content: space-between; 
      padding: 0 30px; 
    }
    .firma-box { 
      text-align: center; 
      width: 220px; 
    }
    .firma-line { 
      border-top: 1px solid #263238; 
      padding-top: 5px; 
      margin-top: 50px; 
    }
    .firma-line p { 
      margin: 3px 0; 
      font-size: 11px; 
    }
    .footer { 
      margin-top: 25px; 
      padding-top: 12px; 
      border-top: 1px solid #bbdefb; 
      font-size: 10px; 
      color: #546e7a; 
      text-align: center; 
    }
    .footer-grid { 
      display: grid; 
      grid-template-columns: 1fr 1fr 1fr; 
      gap: 10px; 
      margin-top: 10px; 
      text-align: center; 
    }
    .footer-grid .box { 
      border: 1px solid #bbdefb; 
      padding: 8px; 
      border-radius: 4px; 
    }
    .footer-grid .box-label { 
      font-size: 9px; 
      color: #546e7a; 
      text-transform: uppercase; 
      margin-bottom: 3px; 
    }
    .footer-grid .box-value { 
      font-size: 11px; 
      font-weight: bold; 
      color: #263238; 
    }
    .nomina-info {
      background: #e3f2fd;
      border: 1px solid #1565c0;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 15px;
      font-size: 11px;
      color: #0d47a1;
    }
    @media print { 
      body { padding: 0; } 
      .no-print { display: none; } 
    }
    @media (max-width: 600px) {
      .info-grid { grid-template-columns: 1fr; }
      .firmas { flex-direction: column; align-items: center; gap: 20px; padding: 0; }
      .firma-box { width: 100%; }
      .footer-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>NEOCONSTRUCCIONES INTEGRALES SAS</h1>
    <p>NIT: 901421096-1 | Dirección: Calle 11C No. 80b-70</p>
    <div class="badge">LIQUIDACIÓN DE CONTRATO</div>
  </div>

  <div class="warning">
    Este documento certifica la finalización de la relación laboral y el pago de todas las prestaciones sociales conforme a la ley colombiana.
  </div>

  ${r.tieneNominaPagada ? `
  <div class="nomina-info">
    ℹ️ Se detectó nómina aprobada (${r.nominaReferencia}). Los reintegros corresponden a días no pagados en la quincena.
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">👤 Información del Empleado</div>
    <div class="info-grid">
      <div class="info-row"><span class="label">Nombre</span><span class="value">${emp.nombre || r.email}</span></div>
      <div class="info-row"><span class="label">Identificación (CC)</span><span class="value">${emp.documento || 'N/A'}</span></div>
      <div class="info-row"><span class="label">Cargo</span><span class="value">${emp.cargo || 'N/A'}</span></div>
      <div class="info-row"><span class="label">Tipo de contrato</span><span class="value">${emp.tipoContrato || 'N/A'}</span></div>
      <div class="info-row"><span class="label">Fecha de ingreso</span><span class="value">${fmtFecha(emp.fechaIngreso) || 'N/A'}</span></div>
      <div class="info-row"><span class="label">Fecha de retiro</span><span class="value">${fmtFecha(r.fechaLiquidacion)}</span></div>
      <div class="info-row highlight"><span class="label">Días trabajados en el año</span><span class="value">${r.diasTrabajados} días</span></div>
      <div class="info-row highlight"><span class="label">No. Inasistencias</span><span class="value">${r.inasistencias || 0} días</span></div>
      ${r.vacacionesTomadas > 0 ? `<div class="info-row highlight"><span class="label">Vacaciones tomadas</span><span class="value">${r.vacacionesTomadas} días</span></div>` : ''}
      <div class="info-row full-width"><span class="label">Motivo de retiro</span><span class="value">${motivosRetiro.find(m => m.value === r.motivoRetiro)?.label || r.motivoRetiro || 'N/A'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📊 Base de Liquidación</div>
    <table class="table">
      <tr><td>Sueldo Base</td><td class="num">$${fmt(r.salarioBase)}</td></tr>
      <tr><td>Auxilio de Transporte</td><td class="num">$${fmt(r.auxilioTransporte)}</td></tr>
      <tr class="subtotal"><td><strong>Total Base de Liquidación</strong></td><td class="num"><strong>$${fmt(r.baseLiquidacion)}</strong></td></tr>
    </table>
  </div>

  ${r.totalReintegros > 0 ? `
  <div class="section">
    <div class="section-title">💵 Reintegros — Sujetos a Aportes <span class="exento">(Art. 14 Ley 100/1993)</span></div>
    <table class="table">
      <tr><td>Reintegro de Salario (${r.diasMesEfectivos} días)</td><td class="num">$${fmt(r.sueldoPendiente)}</td></tr>
      ${r.auxilioPendiente > 0 ? `<tr><td>Reintegro de Auxilio Transporte</td><td class="num">$${fmt(r.auxilioPendiente)}</td></tr>` : ''}
      ${r.diasYaPagados > 0 ? `<tr><td style="color:#546e7a">Días ya pagados en nómina</td><td class="num" style="color:#546e7a">-${r.diasYaPagados} días</td></tr>` : ''}
      <tr class="subtotal"><td><strong>Subtotal Reintegros</strong></td><td class="num"><strong>$${fmt(r.totalReintegros)}</strong></td></tr>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">💰 Prestaciones Sociales — Exentas de Aportes <span class="exento">(Art. 253 CST, Art. 14 Ley 100/1993)</span></div>
    <table class="table">
      <tr>
        <td>Prima de Servicios <span style="color:#546e7a;font-size:10px">(Base × ${r.diasTrabajados} ÷ 360)</span></td>
        <td class="num">$${fmt(r.prima)}</td>
      </tr>
      <tr>
        <td>Cesantías <span style="color:#546e7a;font-size:10px">(Base × ${r.diasTrabajados} ÷ 360)</span></td>
        <td class="num">$${fmt(r.cesantias)}</td>
      </tr>
      <tr>
        <td>Intereses sobre Cesantías <span style="color:#546e7a;font-size:10px">(Cesantías × ${r.diasTrabajados} × 12% ÷ 360)</span></td>
        <td class="num">$${fmt(r.interesesCesantias)}</td>
      </tr>
      <tr>
        <td>Vacaciones Proporcionales <span style="color:#546e7a;font-size:10px">(Salario × ${r.diasTrabajados} ÷ 720)</span></td>
        <td class="num">$${fmt(r.vacaciones)}</td>
      </tr>
      <tr class="subtotal">
        <td><strong>Subtotal Prestaciones</strong></td>
        <td class="num"><strong>$${fmt(r.totalPrestaciones)}</strong></td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">💸 Deducciones <span class="exento">(Solo sobre reintegros, Ley 100/1993)</span></div>
    <table class="table">
      ${r.saludEmpleado > 0 ? `<tr><td>Salud (4% sobre reintegros)</td><td class="num deduccion">-$${fmt(r.saludEmpleado)}</td></tr>` : ''}
      ${r.pensionEmpleado > 0 ? `<tr><td>Pensión (4% sobre reintegros)</td><td class="num deduccion">-$${fmt(r.pensionEmpleado)}</td></tr>` : ''}
      ${r.deduccionExamenMedico > 0 ? `<tr><td>Examen Médico</td><td class="num deduccion">-$${fmt(r.deduccionExamenMedico)}</td></tr>` : ''}
      ${r.detalleDeducciones && r.detalleDeducciones.length > 0 ? r.detalleDeducciones.map(d => `
  <tr><td>${d.tipo}${d.descripcion && d.descripcion !== 'Sin descripción' ? ' — ' + d.descripcion : ''}</td><td class="num deduccion">-$${fmt(d.saldoPendiente)}</td></tr>
`).join('') : ''}
      <tr class="subtotal">
        <td><strong>Total Deducciones</strong></td>
        <td class="num deduccion"><strong>-$${fmt(r.totalDeducciones)}</strong></td>
      </tr>
    </table>
  </div>

  <div class="neto">
    <div class="neto-label">Total a pagar al empleado</div>
    <h2>$${fmt(r.totalLiquidacion)}</h2>
  </div>

  <div class="firmas">
    <div class="firma-box">
      <div class="firma-line">
        <p style="font-weight:bold">${emp.nombre || ''}</p>
        <p>CC No. ${emp.documento || '_________________'}</p>
        <p style="font-size:10px;color:#546e7a">Empleado</p>
      </div>
    </div>
    <div class="firma-box">
      <div class="firma-line">
        <p style="font-weight:bold">NEO Construcciones Integrales SAS</p>
        <p>NIT 901421096-1</p>
        <p style="font-size:10px;color:#546e7a">Empleador</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Documento generado el ${new Date().toLocaleString('es-CO')} | Art. 249, 253, 306, 340 y 346 del Código Sustantivo del Trabajo Colombiano</p>
    <div class="footer-grid">
      <div class="box"><div class="box-label">Revisado</div><div class="box-value">_________________</div></div>
      <div class="box"><div class="box-label">Aprobado</div><div class="box-value">_________________</div></div>
      <div class="box"><div class="box-label">Recibido (Empleado)</div><div class="box-value">_________________</div></div>
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="padding:10px 30px;background:#1565c0;color:white;border:none;border-radius:6px;cursor:pointer;font-size:16px">
      🖨️ Imprimir / Guardar PDF
    </button>
  </div>
</body>
</html>`;

    const ventana = window.open('', '_blank');
    ventana.document.write(contenido);
    ventana.document.close();
  };

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        <h1 className="dba-liquidacion-title">⚖️ Liquidación de Contrato</h1>
        <p className="dba-subtitle">Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong></p>
        {mensaje && (
          <div className={`dba-liquidacion-alert ${mensaje.includes('❌') ? 'dba-liquidacion-alert--error' : 'dba-liquidacion-alert--success'}`}>
            <span>{mensaje}</span>
            <button onClick={() => setMensaje('')} className="dba-alert-close">✕</button>
          </div>
        )}

        <div className="dba-liquidacion-historial-btn">
          <Link to="/liquidaciones-historial">📋 Ver Historial de Liquidaciones</Link>
        </div>

        <form onSubmit={liquidar} className="dba-liquidacion-form">
          <div className="dba-liquidacion-form-grid">
            <div className="dba-liquidacion-form-group">
              <label>Empleado a Liquidar</label>
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
              <label>Fecha Final</label>
              <input
                type="date"
                className="dba-input"
                value={fechaFinal}
                onChange={e => setFechaFinal(e.target.value)}
                required
              />
            </div>
            <div className="dba-liquidacion-form-group">
              <label>Motivo de Retiro</label>
              <select
                className="dba-select"
                value={motivoRetiro}
                onChange={e => setMotivoRetiro(e.target.value)}
              >
                {motivosRetiro.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
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
                {resultado?.vacacionesTomadasAuto > 0 && !vacacionesManual && (
                  <span className="dba-liquidacion-input-hint">({resultado.vacacionesTomadasAuto} auto)</span>
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
            <div className="dba-liquidacion-result-header">
              <h2>LIQUIDACIÓN DE CONTRATO</h2>
              <p>{empleadoSeleccionado.nombre} | Retiro: {fmtFecha(resultado.fechaLiquidacion)}</p>
            </div>

            {/* Info Empleado */}
            <div className="dba-liquidacion-section">
              <div className="dba-liquidacion-section-title">👤 Información del Empleado</div>
              <div className="dba-liquidacion-info-grid">
                <div className="dba-liquidacion-info-row">
                  <span className="dba-liquidacion-info-label">Nombre</span>
                  <span className="dba-liquidacion-info-value">{empleadoSeleccionado.nombre}</span>
                </div>
                <div className="dba-liquidacion-info-row">
                  <span className="dba-liquidacion-info-label">Identificación (CC)</span>
                  <span className="dba-liquidacion-info-value">{empleadoSeleccionado.documento || 'N/A'}</span>
                </div>
                <div className="dba-liquidacion-info-row">
                  <span className="dba-liquidacion-info-label">Cargo</span>
                  <span className="dba-liquidacion-info-value">{empleadoSeleccionado.cargo || 'N/A'}</span>
                </div>
                <div className="dba-liquidacion-info-row">
                  <span className="dba-liquidacion-info-label">Tipo de contrato</span>
                  <span className="dba-liquidacion-info-value">{empleadoSeleccionado.tipoContrato || 'N/A'}</span>
                </div>
                <div className="dba-liquidacion-info-row">
                  <span className="dba-liquidacion-info-label">Fecha de ingreso</span>
                  <span className="dba-liquidacion-info-value">{fmtFecha(empleadoSeleccionado.fechaIngreso) || 'N/A'}</span>
                </div>
                <div className="dba-liquidacion-info-row">
                  <span className="dba-liquidacion-info-label">Fecha de retiro</span>
                  <span className="dba-liquidacion-info-value">{fmtFecha(resultado.fechaLiquidacion)}</span>
                </div>
                <div className="dba-liquidacion-info-row">
                  <span className="dba-liquidacion-info-label">Días trabajados en el año</span>
                  <span className="dba-liquidacion-info-value dba-liquidacion-info-value--highlight">{resultado.diasTrabajados} días</span>
                </div>
                <div className="dba-liquidacion-info-row">
                  <span className="dba-liquidacion-info-label">No. Inasistencias</span>
                  <span className="dba-liquidacion-info-value dba-liquidacion-info-value--highlight">{resultado.inasistencias || 0} días</span>
                </div>
                {resultado.vacacionesTomadas > 0 && (
                  <div className="dba-liquidacion-info-row">
                    <span className="dba-liquidacion-info-label">Vacaciones tomadas</span>
                    <span className="dba-liquidacion-info-value dba-liquidacion-info-value--highlight">
                      {resultado.vacacionesTomadas} días
                      {resultado.vacacionesTomadasAuto > 0 && resultado.vacacionesTomadasManual && (
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'normal', display: 'block' }}>
                          (auto detectado: {resultado.vacacionesTomadasAuto})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <div className="dba-liquidacion-info-row dba-liquidacion-info-row--full">
                  <span className="dba-liquidacion-info-label">Motivo de retiro</span>
                  <span className="dba-liquidacion-info-value">{motivosRetiro.find(m => m.value === resultado.motivoRetiro)?.label || resultado.motivoRetiro}</span>
                </div>
              </div>
            </div>

            {/* Base de Liquidación */}
            <div className="dba-liquidacion-section">
              <div className="dba-liquidacion-section-title">📊 Base de Liquidación</div>
              <table className="dba-liquidacion-table">
                <tbody>
                  <tr><td>Sueldo Base</td><td>${fmt(resultado.salarioBase)}</td></tr>
                  <tr><td>Auxilio de Transporte</td><td>${fmt(resultado.auxilioTransporte)}</td></tr>
                  <tr className="dba-liquidacion-subtotal">
                    <td>Total Base de Liquidación</td>
                    <td>${fmt(resultado.baseLiquidacion)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Reintegros */}
            {resultado.totalReintegros > 0 && (
              <div className="dba-liquidacion-section">
                <div className="dba-liquidacion-section-title">
                  💵 Reintegros — Sujetos a Aportes <span className="dba-liquidacion-exento">(Art. 14 Ley 100/1993)</span>
                </div>
                <table className="dba-liquidacion-table">
                  <tbody>
                    <tr><td>Reintegro de Salario ({resultado.diasMesEfectivos} días)</td><td>${fmt(resultado.sueldoPendiente)}</td></tr>
                    {resultado.auxilioPendiente > 0 && (
                      <tr><td>Reintegro de Auxilio Transporte</td><td>${fmt(resultado.auxilioPendiente)}</td></tr>
                    )}
                    {resultado.diasYaPagados > 0 && (
                      <tr>
                        <td className="dba-liquidacion-muted">Días ya pagados en nómina</td>
                        <td className="dba-liquidacion-muted">-{resultado.diasYaPagados} días</td>
                      </tr>
                    )}
                    <tr className="dba-liquidacion-subtotal">
                      <td>Subtotal Reintegros</td>
                      <td>${fmt(resultado.totalReintegros)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Prestaciones Sociales */}
            <div className="dba-liquidacion-section">
              <div className="dba-liquidacion-section-title">
                💰 Prestaciones Sociales — Exentas <span className="dba-liquidacion-exento">(Art. 253 CST)</span>
              </div>
              <table className="dba-liquidacion-table">
                <tbody>
                  <tr>
                    <td>
                      Prima de Servicios
                      <span className="dba-liquidacion-formula">(Base × {resultado.diasTrabajados} ÷ 360)</span>
                    </td>
                    <td>${fmt(resultado.prima)}</td>
                  </tr>
                  <tr>
                    <td>
                      Cesantías
                      <span className="dba-liquidacion-formula">(Base × {resultado.diasTrabajados} ÷ 360)</span>
                    </td>
                    <td>${fmt(resultado.cesantias)}</td>
                  </tr>
                  <tr>
                    <td>
                      Intereses sobre Cesantías
                      <span className="dba-liquidacion-formula">(Cesantías × {resultado.diasTrabajados} × 12% ÷ 360)</span>
                    </td>
                    <td>${fmt(resultado.interesesCesantias)}</td>
                  </tr>
                  <tr>
                    <td>
                      Vacaciones Proporcionales
                      <span className="dba-liquidacion-formula">(Salario × {resultado.diasTrabajados} ÷ 720)</span>
                    </td>
                    <td>${fmt(resultado.vacaciones)}</td>
                  </tr>
                  <tr className="dba-liquidacion-subtotal">
                    <td>Subtotal Prestaciones</td>
                    <td>${fmt(resultado.totalPrestaciones)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deducciones */}
            <div className="dba-liquidacion-section">
              <div className="dba-liquidacion-section-title">
                💸 Deducciones <span className="dba-liquidacion-exento">(Solo sobre reintegros, Ley 100/1993)</span>
              </div>
              <table className="dba-liquidacion-table">
                <tbody>
                  {resultado.saludEmpleado > 0 && (
                    <tr>
                      <td>Salud (4% sobre reintegros)</td>
                      <td className="dba-liquidacion-deduccion">-${fmt(resultado.saludEmpleado)}</td>
                    </tr>
                  )}
                  {resultado.pensionEmpleado > 0 && (
                    <tr>
                      <td>Pensión (4% sobre reintegros)</td>
                      <td className="dba-liquidacion-deduccion">-${fmt(resultado.pensionEmpleado)}</td>
                    </tr>
                  )}
                  {resultado.deduccionExamenMedico > 0 && (
                    <tr>
                      <td>Examen Médico</td>
                      <td className="dba-liquidacion-deduccion">-${fmt(resultado.deduccionExamenMedico)}</td>
                    </tr>
                  )}
                  {resultado.detalleDeducciones && resultado.detalleDeducciones.length > 0 && resultado.detalleDeducciones.map((d, i) => (
                    <tr key={i}>
                      <td>
                        {d.tipo}
                        {d.descripcion && d.descripcion !== 'Sin descripción' && (
                          <span className="dba-liquidacion-formula">{d.descripcion}</span>
                        )}
                      </td>
                      <td className="dba-liquidacion-deduccion">-${fmt(d.saldoPendiente)}</td>
                    </tr>
                  ))}
                  <tr className="dba-liquidacion-subtotal">
                    <td>Total Deducciones</td>
                    <td className="dba-liquidacion-deduccion">-${fmt(resultado.totalDeducciones)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="dba-liquidacion-neto">
              <p className="dba-liquidacion-neto-label">Total a pagar al empleado</p>
              <h2>${fmt(resultado.totalLiquidacion)}</h2>
            </div>

            {/* Firmas */}
            <div className="dba-liquidacion-firmas">
              <div className="dba-liquidacion-firma-box">
                <div className="dba-liquidacion-firma-line">
                  <p className="dba-liquidacion-firma-name">{empleadoSeleccionado.nombre}</p>
                  <p className="dba-liquidacion-firma-doc">CC No. {empleadoSeleccionado.documento || '_________________'}</p>
                  <p className="dba-liquidacion-firma-role">Empleado</p>
                </div>
              </div>
              <div className="dba-liquidacion-firma-box">
                <div className="dba-liquidacion-firma-line">
                  <p className="dba-liquidacion-firma-name">NEO Construcciones Integrales SAS</p>
                  <p className="dba-liquidacion-firma-doc">NIT 901421096-1</p>
                  <p className="dba-liquidacion-firma-role">Empleador</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="dba-liquidacion-footer">
              <p>Documento generado el {new Date().toLocaleString('es-CO')} | Art. 249, 253, 306, 340 y 346 del Código Sustantivo del Trabajo Colombiano</p>
              <div className="dba-liquidacion-footer-grid">
                <div className="dba-liquidacion-footer-box">
                  <div className="dba-liquidacion-footer-label">Revisado</div>
                  <div className="dba-liquidacion-footer-value">_________________</div>
                </div>
                <div className="dba-liquidacion-footer-box">
                  <div className="dba-liquidacion-footer-label">Aprobado</div>
                  <div className="dba-liquidacion-footer-value">_________________</div>
                </div>
                <div className="dba-liquidacion-footer-box">
                  <div className="dba-liquidacion-footer-label">Recibido (Empleado)</div>
                  <div className="dba-liquidacion-footer-value">_________________</div>
                </div>
              </div>
            </div>

            {/* Botón PDF */}
            <div className="dba-liquidacion-pdf-btn">
              <button onClick={descargarPDF}>📄 Ver / Imprimir PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Liquidacion;
