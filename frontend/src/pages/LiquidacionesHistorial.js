import React, { useState, useEffect, useCallback } from 'react';
import '../style/nomina.css';

const fetchConAuth = (url, opciones = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { ...opciones, headers });
};

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

function LiquidacionesHistorial() {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroAnio, setFiltroAnio] = useState('');
  const [liquidacionSeleccionada, setLiquidacionSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [errorModal, setErrorModal] = useState('');
// Detectar rol del usuario desde localStorage o default
  const userRol = localStorage.getItem('rol') || 'ADMIN';
  const cargarLiquidaciones = useCallback(async () => {
    setCargando(true);
    setErrorModal('');
    try {
      let url = 'http://localhost:5000/api/nomina/liquidaciones';
      if (filtroAnio) url += `?anio=${filtroAnio}`;
      const res = await fetchConAuth(url);
      const data = await res.json();
      if (data.success) {
        setLiquidaciones(data.data);
      } else {
        console.error('Error del servidor:', data.error);
      }
    } catch (err) {
      console.error('Error cargando liquidaciones:', err);
    } finally {
      setCargando(false);
    }
  }, [filtroAnio]);

  useEffect(() => {
    cargarLiquidaciones();
  }, [cargarLiquidaciones]);

  const verDetalle = async (id) => {
    setErrorModal('');
    try {
      const res = await fetchConAuth(`http://localhost:5000/api/nomina/liquidaciones/${id}`);
      const data = await res.json();
      if (data.success) {
        setLiquidacionSeleccionada(data.data);
      } else {
        setErrorModal(data.error || 'Error al cargar la liquidación');
      }
    } catch (err) {
      console.error('Error:', err);
      setErrorModal('Error de conexión al cargar la liquidación');
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

  const descargarPDF = (liq) => {
    const contenido = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Liquidación ${liq.nombre || ''}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 750px; margin: 0 auto; padding: 20px; color: #263238; font-size: 12px; line-height: 1.5; }
    .header { text-align: center; border-bottom: 3px solid #1565c0; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: #0d47a1; margin: 0; font-size: 20px; letter-spacing: 1px; }
    .header p { color: #546e7a; margin: 3px 0; font-size: 11px; }
    .badge { display: inline-block; padding: 4px 16px; background: #e3f2fd; color: #0d47a1; border-radius: 4px; font-size: 11px; font-weight: bold; margin-top: 8px; border: 1px solid #1565c0; }
    .section { margin-bottom: 20px; }
    .section-title { color: #1565c0; border-bottom: 2px solid #1565c0; padding-bottom: 6px; margin-bottom: 12px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 30px; }
    .info-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dotted #cfd8dc; }
    .info-row .label { color: #546e7a; flex: 1; }
    .info-row .value { font-weight: 500; text-align: right; flex: 1; padding-left: 15px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .table td { padding: 7px 10px; border-bottom: 1px solid #e3f2fd; font-size: 11px; }
    .table td.num { text-align: right; font-weight: 500; }
    .subtotal { background: #f5f9ff; font-weight: bold; color: #0d47a1; }
    .deduccion { color: #c62828; }
    .descuento-tipo { font-size: 10px; color: #888; margin-left: 4px; }
    .neto { background: #e8f5e9; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; border: 2px solid #2e7d32; }
    .neto h2 { color: #2e7d32; margin: 0; font-size: 24px; }
    .firmas { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 30px; }
    .firma-box { text-align: center; width: 220px; }
    .firma-line { border-top: 1px solid #263238; padding-top: 5px; margin-top: 50px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
    @media (max-width: 600px) { .info-grid { grid-template-columns: 1fr; } .firmas { flex-direction: column; align-items: center; gap: 20px; padding: 0; } .firma-box { width: 100%; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>NEOCONSTRUCCIONES INTEGRALES SAS</h1>
    <p>NIT: 901421096-1 | Dirección: Calle 11C No. 80b-70</p>
    <div class="badge">LIQUIDACIÓN DE CONTRATO</div>
  </div>
  
  <div class="section">
    <div class="section-title">👤 Información del Empleado</div>
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
      <div class="info-row"><span class="label">Motivo de retiro</span><span class="value">${motivosLabels[liq.motivoRetiro] || liq.motivoRetiro}</span></div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">📊 Base de Liquidación</div>
    <table class="table">
      <tr><td>Sueldo Base</td><td class="num">$${fmt(liq.salarioBase)}</td></tr>
      <tr><td>Auxilio de Transporte</td><td class="num">$${fmt(liq.auxilioTransporte)}</td></tr>
      <tr class="subtotal"><td><strong>Total Base</strong></td><td class="num"><strong>$${fmt(liq.baseLiquidacion)}</strong></td></tr>
    </table>
  </div>
  
  ${liq.totalReintegros > 0 ? `
  <div class="section">
    <div class="section-title">💵 Reintegros</div>
    <table class="table">
      <tr><td>Reintegro de Salario (${liq.diasMesEfectivos} días)</td><td class="num">$${fmt(liq.sueldoPendiente)}</td></tr>
      <tr class="subtotal"><td><strong>Subtotal Reintegros</strong></td><td class="num"><strong>$${fmt(liq.totalReintegros)}</strong></td></tr>
    </table>
  </div>` : ''}
  
  <div class="section">
    <div class="section-title">💰 Prestaciones Sociales</div>
    <table class="table">
      <tr><td>Prima de Servicios</td><td class="num">$${fmt(liq.prima)}</td></tr>
      <tr><td>Cesantías</td><td class="num">$${fmt(liq.cesantias)}</td></tr>
      <tr><td>Intereses sobre Cesantías</td><td class="num">$${fmt(liq.interesesCesantias)}</td></tr>
      <tr><td>Vacaciones Proporcionales</td><td class="num">$${fmt(liq.vacaciones)}</td></tr>
      <tr class="subtotal"><td><strong>Subtotal Prestaciones</strong></td><td class="num"><strong>$${fmt(liq.totalPrestaciones)}</strong></td></tr>
    </table>
  </div>
  
  <div class="section">
    <div class="section-title">💸 Deducciones</div>
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
    <div style="color:#546e7a;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Total a pagar al empleado</div>
    <h2>$${fmt(liq.totalLiquidacion)}</h2>
  </div>
  
  <div class="firmas">
    <div class="firma-box"><div class="firma-line"><p style="font-weight:bold">${liq.nombre || ''}</p><p>CC No. ${liq.documento || '_________________'}</p><p style="font-size:10px;color:#546e7a">Empleado</p></div></div>
    <div class="firma-box"><div class="firma-line"><p style="font-weight:bold">NEO Construcciones Integrales SAS</p><p>NIT 901421096-1</p><p style="font-size:10px;color:#546e7a">Empleador</p></div></div>
  </div>
  
  <div class="no-print" style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="padding:10px 30px;background:#1565c0;color:white;border:none;border-radius:6px;cursor:pointer;font-size:16px">🖨️ Imprimir / Guardar PDF</button>
  </div>
</body>
</html>`;

    const ventana = window.open('', '_blank');
    ventana.document.write(contenido);
    ventana.document.close();
  };

  const liquidacionesFiltradas = liquidaciones.filter(liq => {
    const termino = busqueda.toLowerCase();
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

  return (
    <div className="dba-container">
      <div className="dba-wrapper">
        <div className="dba-hist-title">
          <h1 className="dba-title">🧾 Historial de Liquidaciones</h1>
          <p className="dba-subtitle">Neoconstrucciones S.A.S — <strong>Rol: {userRol.toUpperCase()}</strong></p>
        </div>

        {/* Filtros */}
        <div className="dba-hist-toolbar">
          <div className="dba-hist-form-group">
            <label>Buscar</label>
            <input
              type="text"
              className="dba-input"
              placeholder="Nombre, documento o ID..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
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

        {/* Estados */}
        {cargando ? (
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
                  <th>ID Liquidación</th>
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
                {liquidacionesFiltradas.map(liq => (
                  <tr key={liq._id}>
                    <td>
                      <span className="dba-hist-id-badge">{liq.idLiquidacion}</span>
                    </td>
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
                        <button className="dba-hist-btn-ver" onClick={() => verDetalle(liq.idLiquidacion)}>
                          Ver
                        </button>
                        <button className="dba-hist-btn-pdf" onClick={() => descargarPDF(liq)}>
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

              {/* Info grid */}
              <div className="dba-hist-info-grid">
                <InfoBox label="ID Liquidación" value={liquidacionSeleccionada.idLiquidacion} />
                <InfoBox label="Empleado" value={liquidacionSeleccionada.nombre} />
                <InfoBox label="Documento" value={liquidacionSeleccionada.documento} />
                <InfoBox label="Fecha Retiro" value={fmtFecha(liquidacionSeleccionada.fechaLiquidacion)} />
                <InfoBox label="Días Trabajados" value={liquidacionSeleccionada.diasTrabajados + ' días'} />
                <InfoBox label="Inasistencias" value={(liquidacionSeleccionada.inasistencias || 0) + ' días'} />
                <InfoBox label="Vacaciones" value={(liquidacionSeleccionada.vacacionesTomadas || 0) + ' días'} />
                <InfoBox label="Motivo" value={motivosLabels[liquidacionSeleccionada.motivoRetiro] || liquidacionSeleccionada.motivoRetiro} />
              </div>

              {/* Resumen financiero */}
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

              {/* Botones */}
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
    </div>
  );
}

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

export default LiquidacionesHistorial;