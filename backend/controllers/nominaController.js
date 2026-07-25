const Nomina = require('../models/Nomina');
const Usuario = require('../models/usuario');
const RegistroTiempo = require('../models/RegistroTiempo');
const Novedad = require('../models/Novedad');
const Proyecto = require('../models/Proyecto');
const DescuentoEmpleado = require('../models/DescuentoEmpleado');
const Liquidacion = require('../models/Liquidacion');

// ✅ HELPER CENTRALIZADO - Constantes Colombia 2026
const { 
  calcularAuxilioTransporte, 
  SMLV, 
  AUXILIO_TRANSPORTE, 
  TOPE_AUXILIO 
} = require('../utils/nominaHelpers');

const FACTOR_HORAS_MES = 240;

// Helper: redondear a pesos colombianos (sin decimales)
const rd = (v) => Math.round(v || 0);

const generarIdNomina = (anio, mes, quincena) => `NOM-${anio}-${String(mes).padStart(2,'0')}-${quincena}Q`;

// Helper: generar array de fechas entre inicio y fin
function getFechasPeriodo(inicio, fin) {
  const fechas = [];
  const actual = new Date(inicio);
  const finDate = new Date(fin);
  while (actual <= finDate) {
    fechas.push(new Date(actual));
    actual.setDate(actual.getDate() + 1);
  }
  return fechas;
}

// Helper: verificar si una fecha es domingo
function esDomingo(fecha) {
  return fecha.getDay() === 0;
}

// ============================================
// CALCULAR NÓMINA
// ============================================
exports.calcularNomina = async (req, res) => {
  try {
    const { anio, mes, quincena, fechaInicio, fechaFin, fechaPago } = req.body;
    const creadoPor = req.user?.email || 'sistema';

    const idNomina = generarIdNomina(anio, mes, quincena);

    // Verificar si ya existe
    const existe = await Nomina.findOne({ idNomina });
    if (existe) {
      return res.status(400).json({ success: false, error: 'Ya existe nómina para este período' });
    }

    // Parsear fecha YYYY-MM-DD como LOCAL (evita bug UTC)
    const parseFechaLocal = (str) => {
      if (!str) return null;
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0); // 12:00 mediodía, hora servidor
    };

    const inicio = parseFechaLocal(fechaInicio);
    const fin = parseFechaLocal(fechaFin);
    const fechasPeriodo = getFechasPeriodo(inicio, fin);

    // Traer empleados activos
    const empleados = await Usuario.find({ 
      estadoLaboral: 'activo',
      rol: { $in: ['admin', 'residente', 'contabilidad', 'comercial', 'supervisor', 'oficial', 'ayudante'] }
    });

    const empleadosNomina = [];
    let totalNomina = 0, totalAportes = 0, totalCosto = 0;
    const distribucionMap = {};

    for (const emp of empleados) {
      const salarioBase = rd(emp.sueldo || 0);
      const valorHora = rd(emp.valorHora || (salarioBase / FACTOR_HORAS_MES));
      const recibeAuxilio = emp.recibeAuxilioTransporte && salarioBase <= TOPE_AUXILIO;

      // Determinar tipo
      const esPlanta = emp.tipoEmpleado === 'planta' || emp.esAdministrativo === true || 
                       ['admin', 'gerente', 'secretaria', 'contabilidad'].includes(emp.rol);
      const esResidente = emp.tipoEmpleado === 'residente' || emp.rol === 'residente';
      const esObraLabor = emp.tipoContrato === 'obra_labor' && !esPlanta && !esResidente;

      let diasTrabajados = 0, diasNoTrabajados = 0, diasFalta = 0, diasLicenciaNoRem = 0;
      let horasNormales = 0, horasExtrasDiurnas = 0, horasExtrasNocturnas = 0;
      let horasExtrasDominical = 0, horasExtrasNocturnasDominical = 0;
      let recargoNocturno = 0, recargoDominical = 0;
      let salarioProporcional = 0, auxilioTransporte = 0;
      let distribucionProyectos = [];
      let proyectoHoras = {};

      // ============================================================
      // === BUSCAR NOVEDADES APROBADAS DEL PERÍODO
      // ============================================================
      const novedades = await Novedad.find({
        email: emp.email,
        estado: 'aprobada',
        fechaInicio: { $lte: fin },
        fechaFin: { $gte: inicio }
      });

      let diasVacaciones = 0, diasLicencia = 0, diasIncapacidad = 0;
      let incapacidadPagadaEmpresa = 0, licenciaRemunerada = 0, vacacionesPagadas = 0;

      for (const nov of novedades) {
        const inicioNovedad = new Date(nov.fechaInicio);
        const finNovedad = new Date(nov.fechaFin);
        const inicioEfectivo = inicioNovedad < inicio ? inicio : inicioNovedad;
        const finEfectivo = finNovedad > fin ? fin : finNovedad;
        const diasEnPeriodo = Math.ceil((finEfectivo - inicioEfectivo) / (1000 * 60 * 60 * 24)) + 1;

        if (nov.tipo === 'incapacidad_eps' || nov.tipo === 'incapacidad_arl') {
          diasIncapacidad += diasEnPeriodo;
          incapacidadPagadaEmpresa += rd(nov.valorPagadoEmpresa || 0);
        } else if (nov.tipo === 'licencia_remunerada') {
          diasLicencia += diasEnPeriodo;
          licenciaRemunerada += rd((salarioBase / 30) * diasEnPeriodo);
        } else if (nov.tipo === 'vacaciones') {
          diasVacaciones += diasEnPeriodo;
          vacacionesPagadas += rd((salarioBase / 30) * diasEnPeriodo);
        }
      }

      const diasNovedad = diasVacaciones + diasLicencia + diasIncapacidad;

      // ============================================================
      // === BUSCAR REGISTROS DE ASISTENCIA DEL PERÍODO (TODOS)
      // ============================================================
      const registrosAsistencia = await RegistroTiempo.find({
        email: emp.email,
        fecha: { $gte: inicio, $lte: fin }
      });

      const registrosPorFecha = {};
      for (const reg of registrosAsistencia) {
        const fechaKey = new Date(reg.fecha).toISOString().split('T')[0];
        registrosPorFecha[fechaKey] = reg;
      }

      // Contar faltas/licencias no rem desde registros de asistencia
      let diasFaltaAsistencia = 0;
      let diasLicenciaNoRemAsistencia = 0;

      for (const fechaDia of fechasPeriodo) {
        const fechaKey = fechaDia.toISOString().split('T')[0];
        const reg = registrosPorFecha[fechaKey];
        if (reg) {
          if (reg.tipoDia === 'falta_injustificada') diasFaltaAsistencia += 1;
          else if (reg.tipoDia === 'licencia_no_remunerada') diasLicenciaNoRemAsistencia += 1;
        }
      }

      // ============================================================
      // === PLANTA O RESIDENTE (salario fijo)
      // ============================================================
      if (esPlanta || esResidente) {
        const diasPeriodo = 15; // quincena

        // Total días a descontar = novedades + faltas + licencias no rem
        const totalDiasDescuento = diasNovedad + diasFaltaAsistencia + diasLicenciaNoRemAsistencia;
        const diasEfectivos = Math.max(0, diasPeriodo - totalDiasDescuento);

        diasTrabajados = diasEfectivos;
        diasNoTrabajados = totalDiasDescuento;
        diasFalta = diasFaltaAsistencia;
        diasLicenciaNoRem = diasLicenciaNoRemAsistencia;
        horasNormales = diasEfectivos * 8; // 8 horas diarias

        // Salario proporcional: solo días efectivamente trabajados
        salarioProporcional = rd((salarioBase / 30) * diasEfectivos);
        auxilioTransporte = recibeAuxilio ? calcularAuxilioTransporte(salarioBase, diasEfectivos) : 0;

        if (esResidente && emp.proyectoAsignado) {
          proyectoHoras[emp.proyectoAsignado] = horasNormales;
        }

      // ============================================================
      // === OBRA/LABOR (por días trabajados)
      // ============================================================
      } else {
        // Filtrar solo registros con trabajo real (normal o capacitacion con horas)
        const registrosTrabajo = registrosAsistencia.filter(reg => 
          reg.tipoDia === 'normal' || reg.tipoDia === 'capacitacion' ||
          (reg.horasNormales > 0)
        );

        for (const reg of registrosTrabajo) {
          if (reg.tipoDia === 'normal' && reg.horasNormales > 0) diasTrabajados += 1;

          horasNormales += reg.horasNormales || 0;
          horasExtrasDiurnas += reg.horasExtrasDiurnas || 0;
          horasExtrasNocturnas += reg.horasExtrasNocturnas || 0;
          horasExtrasDominical += reg.horasExtrasDominical || 0;
          horasExtrasNocturnasDominical += reg.horasExtrasNocturnasDominical || 0;
          recargoNocturno += reg.recargoNocturno || 0;
          recargoDominical += reg.recargoDominical || 0;

          if (reg.idProyecto) {
            proyectoHoras[reg.idProyecto] = (proyectoHoras[reg.idProyecto] || 0) + 
              (reg.horasNormales || 0) + (reg.horasExtrasDiurnas || 0);
          }
        }

        // Contar faltas: días laborables SIN registro o con falta_injustificada/licencia_no_remunerada
        const diasLaborables = fechasPeriodo.filter(f => !esDomingo(f));

        for (const fechaDia of diasLaborables) {
          const fechaKey = fechaDia.toISOString().split('T')[0];
          const reg = registrosPorFecha[fechaKey];

          if (!reg) {
            // No hay registro = falta injustificada
            diasFalta += 1;
          } else if (reg.tipoDia === 'falta_injustificada') {
            diasFalta += 1;
          } else if (reg.tipoDia === 'licencia_no_remunerada') {
            diasLicenciaNoRem += 1;
          }
        }

        // Si tiene días de novedad (incapacidad/licencia/vacaciones) y no trabajó,
        // esos días ya están cubiertos por la novedad
        diasTrabajados = Math.max(diasTrabajados, diasLicencia + diasVacaciones);

        // Días NO trabajados = faltas + licencia no remunerada
        diasNoTrabajados = diasFalta + diasLicenciaNoRem;

        // Días efectivos para pago = días trabajados (sin contar faltas)
        const diasEfectivos = Math.max(0, diasTrabajados - diasFalta - diasLicenciaNoRem);

        salarioProporcional = rd((salarioBase / 30) * diasEfectivos);
        auxilioTransporte = recibeAuxilio ? calcularAuxilioTransporte(salarioBase, diasEfectivos) : 0;
      }

      // ============================================================
      // === VALORES MONETARIOS (extras y recargos) - TODO REDONDEADO
      // ============================================================
      const vExtrasDiurnas = rd(horasExtrasDiurnas * valorHora * 1.25);
      const vExtrasNocturnas = rd(horasExtrasNocturnas * valorHora * 1.75);
      const vExtrasDominical = rd(horasExtrasDominical * valorHora * 2.0);
      const vExtrasNocturnasDom = rd(horasExtrasNocturnasDominical * valorHora * 2.5);
      const vRecargoNocturno = rd(recargoNocturno * valorHora * 0.35);
      const vRecargoDominical = rd(recargoDominical * valorHora * 0.75);

      const totalDevengado = rd(
        salarioProporcional + auxilioTransporte + 
        vExtrasDiurnas + vExtrasNocturnas + vExtrasDominical + vExtrasNocturnasDom +
        vRecargoNocturno + vRecargoDominical + 
        incapacidadPagadaEmpresa + licenciaRemunerada + vacacionesPagadas
      );

      // ============================================================
      // === DESCUENTOS ACTIVOS DEL EMPLEADO
      // ============================================================
      const descuentosActivos = await DescuentoEmpleado.find({
        email: emp.email,
        estado: 'activo'
      });

      const descuentosPendientes = descuentosActivos.filter(d => d.cuotasPagadas < d.cuotas);

      let otrosDescuentos = 0;
      const detalleDescuentos = [];

      for (const desc of descuentosPendientes) {
        // Validar condiciones especiales
        if (desc.condicion?.requiereFalta && diasFaltaAsistencia === 0) continue;
        if (desc.condicion?.idProyecto && !proyectoHoras[desc.condicion.idProyecto]) continue;

        const cuota = desc.getCuotaActual();
        if (cuota > 0) {
          otrosDescuentos += cuota;
          detalleDescuentos.push({
            idDescuento: desc._id,
            tipo: desc.tipo,
            descripcion: desc.descripcion,
            valor: cuota,
            cuotaNumero: desc.cuotasPagadas + 1,
            cuotaTotal: desc.cuotas
          });
        }
      }

      // ============================================================
      // === DEDUCCIONES (salud, pensión, descuentos)
      // ============================================================
      const saludEmpleado = rd(totalDevengado * 0.04);
      const pensionEmpleado = rd(totalDevengado * 0.04);
      const totalDeducciones = rd(saludEmpleado + pensionEmpleado + otrosDescuentos);
      const netoAPagar = rd(totalDevengado - totalDeducciones);

      // ============================================================
      // === APORTES EMPLEADOR
      // ============================================================
      const saludEmpleador = rd(totalDevengado * 0.085);
      const pensionEmpleador = rd(totalDevengado * 0.12);
      const arl = rd(totalDevengado * 0.0696);
      const cajaCompensacion = rd(totalDevengado * 0.04);
      const icbf = rd(totalDevengado * 0.03);
      const sena = rd(totalDevengado * 0.02);
      const totalAportesEmp = rd(saludEmpleador + pensionEmpleador + arl + cajaCompensacion + icbf + sena);
      const costoTotalEmpleador = rd(totalDevengado + totalAportesEmp);

      // ============================================================
      // === DISTRIBUCIÓN POR PROYECTO
      // ============================================================
      if (esPlanta) {
        const proyectosActivos = await Proyecto.find({ estado: { $in: ['activo', 'en_proceso'] } });
        const numProyectos = proyectosActivos.length || 1;
        const costoPorProyecto = rd(costoTotalEmpleador / numProyectos);

        distribucionProyectos = proyectosActivos.map(p => ({
          idProyecto: p._id.toString(),
          horas: rd(horasNormales / numProyectos),
          costo: costoPorProyecto
        }));

        if (proyectosActivos.length === 0) {
          distribucionProyectos = [{ idProyecto: 'ADMIN', horas: horasNormales, costo: costoTotalEmpleador }];
        }

      } else if (esResidente && Object.keys(proyectoHoras).length > 0) {
        const idProyecto = Object.keys(proyectoHoras)[0];
        distribucionProyectos = [{ idProyecto, horas: horasNormales, costo: costoTotalEmpleador }];

      } else {
        const totalHoras = Object.values(proyectoHoras).reduce((a, b) => a + b, 0) || 1;
        distribucionProyectos = Object.entries(proyectoHoras).map(([idProyecto, horas]) => ({
          idProyecto,
          horas,
          costo: rd(costoTotalEmpleador * (horas / totalHoras))
        }));

        if (distribucionProyectos.length === 0) {
          distribucionProyectos = [{ idProyecto: 'ADMIN', horas: horasNormales, costo: costoTotalEmpleador }];
        }
      }

      // Acumular distribución global
      for (const dist of distribucionProyectos) {
        distribucionMap[dist.idProyecto] = (distribucionMap[dist.idProyecto] || 0) + dist.costo;
      }

      // Guardar empleado en nómina
      empleadosNomina.push({
        email: emp.email,
        nombre: emp.nombre || emp.email,
        cargo: emp.cargo || 'N/A',
        salarioBase,
        valorHora,
        diasTrabajados,
        diasNoTrabajados,
        diasFalta,
        diasLicenciaNoRem,
        horasNormales,
        horasExtrasDiurnas,
        horasExtrasNocturnas,
        horasExtrasDominical,
        horasExtrasNocturnasDominical,
        valorExtrasDiurnas: vExtrasDiurnas,
        valorExtrasNocturnas: vExtrasNocturnas,
        valorExtrasDominical: vExtrasDominical,
        valorExtrasNocturnasDominical: vExtrasNocturnasDom,
        recargoNocturno: vRecargoNocturno,
        recargoDominical: vRecargoDominical,
        auxilioTransporte,
        subsidioFamiliar: 0,
        incapacidadPagadaEmpresa,
        licenciaRemunerada,
        vacacionesPagadas,
        bonificaciones: 0,
        totalDevengado,
        saludEmpleado,
        pensionEmpleado,
        fondoSolidaridad: 0,
        retencionFuente: 0,
        otrosDescuentos,
        detalleDescuentos,
        totalDeducciones,
        netoAPagar,
        saludEmpleador,
        pensionEmpleador,
        arl,
        cajaCompensacion,
        icbf,
        sena,
        totalAportes: totalAportesEmp,
        costoTotalEmpleador,
        distribucionProyectos
      });

      totalNomina += netoAPagar;
      totalAportes += totalAportesEmp;
      totalCosto += costoTotalEmpleador;
    }

    // Distribución global
    const distribucionGlobal = Object.entries(distribucionMap).map(([idProyecto, totalCostoProy]) => ({
      idProyecto,
      totalCosto: totalCostoProy,
      porcentaje: totalCosto > 0 ? rd((totalCostoProy / totalCosto) * 100) : 0
    }));

    const nomina = new Nomina({
      idNomina,
      anio,
      mes,
      quincena,
      fechaInicio: inicio,
      fechaFin: fin,
      fechaPago: fechaPago ? new Date(fechaPago) : null,
      tipo: 'quincenal',
      estado: 'calculada',
      empleados: empleadosNomina,
      totalNomina: rd(totalNomina),
      totalAportes: rd(totalAportes),
      totalCosto: rd(totalCosto),
      distribucionGlobal,
      creadoPor
    });

    await nomina.save();

    // Actualizar descuentos aplicados (después de guardar la nómina)
    for (const emp of empleadosNomina) {
      if (emp.detalleDescuentos?.length > 0) {
        for (const det of emp.detalleDescuentos) {
          await DescuentoEmpleado.findByIdAndUpdate(det.idDescuento, {
            $inc: { cuotasPagadas: 1 },
            $push: {
              historialPagos: {
                idNomina: nomina.idNomina,
                fechaPago: new Date(),
                valor: det.valor,
                cuotaNumero: det.cuotaNumero
              }
            }
          });

          // Verificar si se completó
          const desc = await DescuentoEmpleado.findById(det.idDescuento);
          if (desc && desc.cuotasPagadas >= desc.cuotas) {
            desc.estado = 'completado';
            desc.fechaFin = new Date();
            await desc.save();
          }
        }
      }
    }

    res.json({ success: true, data: nomina });
  } catch (error) {
    console.error('Error calculando nómina:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// APROBAR NÓMINA
// ============================================
exports.aprobarNomina = async (req, res) => {
  try {
    const { id } = req.params;
    const aprobadoPor = req.user?.email || 'sistema';

    const nomina = await Nomina.findOne({ idNomina: id });
    if (!nomina) return res.status(404).json({ success: false, error: 'Nómina no encontrada' });

    nomina.estado = 'aprobada';
    nomina.aprobadoPor = aprobadoPor;
    nomina.fechaAprobacion = new Date();

    await nomina.save();
    res.json({ success: true, data: nomina });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// PAGAR NÓMINA
// ============================================
exports.pagarNomina = async (req, res) => {
  try {
    const { id } = req.params;
    const pagadoPor = req.user?.email || 'sistema';

    const nomina = await Nomina.findOne({ idNomina: id });
    if (!nomina) return res.status(404).json({ success: false, error: 'Nómina no encontrada' });

    if (nomina.estado !== 'aprobada') {
      return res.status(400).json({ success: false, error: 'La nómina debe estar aprobada antes de pagar' });
    }

    nomina.estado = 'pagada';
    nomina.pagadoPor = pagadoPor;
    nomina.fechaPagoReal = new Date();

    await nomina.save();
    res.json({ success: true, data: nomina });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// OBTENER NÓMINAS
// ============================================
exports.getNominas = async (req, res) => {
  try {
    const { anio, mes } = req.query;
    const filtro = {};
    if (anio) filtro.anio = Number(anio);
    if (mes) filtro.mes = Number(mes);

    const nominas = await Nomina.find(filtro).sort({ createdAt: -1 });
    res.json({ success: true, data: nominas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// OBTENER NÓMINA POR ID
// ============================================
exports.getNominaById = async (req, res) => {
  try {
    const nomina = await Nomina.findOne({ idNomina: req.params.id });
    if (!nomina) return res.status(404).json({ success: false, error: 'No encontrada' });
    res.json({ success: true, data: nomina });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// VERIFICAR INASISTENCIAS (para liquidación)
// ============================================
exports.verificarInasistencias = async (req, res) => {
  try {
    const { email, fechaFinal } = req.query;
    if (!email || !fechaFinal) {
      return res.status(400).json({ success: false, error: 'Email y fechaFinal requeridos' });
    }

    // Parsear fecha YYYY-MM-DD como LOCAL (medianoche)
    const [yy, mm, dd] = fechaFinal.split('-').map(Number);
    const fechaFin = new Date(yy, mm - 1, dd, 12, 0, 0);
    const anioLiquidar = fechaFin.getFullYear();
    
    // Rango de búsqueda: inicio del año hasta fin del día de fechaFinal
    const inicioBusqueda = new Date(Date.UTC(anioLiquidar, 0, 1));
    const finBusqueda = new Date(Date.UTC(yy, mm - 1, dd + 1));

    console.log('=== VERIFICAR INASISTENCIAS ===');
    console.log('Email:', email);
    console.log('Fecha final (raw):', fechaFinal);
    console.log('Año a liquidar:', anioLiquidar);
    console.log('Inicio búsqueda:', inicioBusqueda.toISOString());
    console.log('Fin búsqueda:', finBusqueda.toISOString());

    const registrosFaltas = await RegistroTiempo.find({
      email: email.trim().toLowerCase(),
      fecha: { $gte: inicioBusqueda, $lt: finBusqueda },
      tipoDia: { $in: ['falta_injustificada', 'licencia_no_remunerada'] }
    }).lean();

    console.log('Registros encontrados:', registrosFaltas.length);
    if (registrosFaltas.length > 0) {
      console.log('Detalle:', registrosFaltas.map(r => ({ 
        fecha: r.fecha, 
        tipoDia: r.tipoDia,
        estado: r.estado 
      })));
    }

    res.json({
      success: true,
      inasistencias: registrosFaltas.length,
      detalle: registrosFaltas.map(r => ({
        fecha: r.fecha,
        tipo: r.tipoDia
      }))
    });
  } catch (error) {
    console.error('Error verificando inasistencias:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// VERIFICAR VACACIONES TOMADAS (para liquidación)
// ============================================
exports.verificarVacaciones = async (req, res) => {
  try {
    const { email, fechaFinal } = req.query;
    if (!email || !fechaFinal) {
      return res.status(400).json({ success: false, error: 'Email y fechaFinal requeridos' });
    }

    const [yy, mm, dd] = fechaFinal.split('-').map(Number);
    const fechaFin = new Date(yy, mm - 1, dd, 12, 0, 0);
    const anioLiquidar = fechaFin.getFullYear();
    
    const inicioAnio = new Date(anioLiquidar, 0, 1, 12, 0, 0);
    const msDia = 1000 * 60 * 60 * 24;

    console.log('=== VERIFICAR VACACIONES ===');
    console.log('Email:', email);
    console.log('Fecha final:', fechaFinal);
    console.log('Año:', anioLiquidar);

    const novedadesVacaciones = await Novedad.find({
      email: email.trim().toLowerCase(),
      estado: 'aprobada',
      tipo: 'vacaciones',
      fechaInicio: { $lte: fechaFin },
      fechaFin: { $gte: inicioAnio }
    }).lean();

    let diasVacacionesTomadas = 0;
    const detalle = [];

    for (const nov of novedadesVacaciones) {
      const inicioNov = new Date(nov.fechaInicio) < inicioAnio ? inicioAnio : new Date(nov.fechaInicio);
      const finNov = new Date(nov.fechaFin) > fechaFin ? fechaFin : new Date(nov.fechaFin);
      const diasNov = Math.max(0, Math.round((finNov - inicioNov) / msDia) + 1);
      diasVacacionesTomadas += diasNov;
      
      detalle.push({
        fechaInicio: nov.fechaInicio,
        fechaFin: nov.fechaFin,
        dias: diasNov
      });
    }

    console.log('Vacaciones encontradas:', diasVacacionesTomadas, 'días');
    console.log('Detalle:', detalle);

    res.json({
      success: true,
      vacacionesTomadas: diasVacacionesTomadas,
      detalle
    });
  } catch (error) {
    console.error('Error verificando vacaciones:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// LIQUIDAR CONTRATO (VERSIÓN LEGAL COLOMBIA)
// ============================================
exports.liquidarContrato = async (req, res) => {
  try {
    const { email, fechaFinal, motivoRetiro, inasistencias, vacacionesTomadas } = req.body;

    const emp = await Usuario.findOne({ email });
    if (!emp) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });

    // Labels para tipos de descuento
    const tipoLabels = {
      prestamo: 'Préstamo',
      falta_penalizacion: 'Penalización por falta',
      danos_perdidas: 'Daños o pérdidas',
      uniformes_epp: 'Uniformes / EPP',
      sancion_disciplinaria: 'Sanción disciplinaria',
      aporte_voluntario: 'Aporte voluntario',
      examen_medico: 'Examen Médico',
      otro: 'Otro'
    };

    // Parsear fechas LOCAL (medianoche Colombia)
    const parseFechaLocal = (str) => {
      if (!str) return null;
      if (str instanceof Date) return str;
      const partes = String(str).trim().split('/');
      if (partes.length === 3) {
        const [dd, mm, yy] = partes.map(Number);
        return new Date(yy, mm - 1, dd, 12, 0, 0);
      }
      const [yy, mm, dd] = str.split('-').map(Number);
      if (yy && mm && dd) return new Date(yy, mm - 1, dd, 12, 0, 0);
      const fecha = new Date(str);
      return isNaN(fecha.getTime()) ? null : fecha;
    };

    const fechaIngreso = parseFechaLocal(emp.fechaIngreso);
    const fechaFin = fechaFinal ? parseFechaLocal(fechaFinal) : new Date();
    const fin = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate(), 12, 0, 0);

    // Año a liquidar
    const anioLiquidar = fin.getFullYear();
    const inicioAnio = new Date(anioLiquidar, 0, 1, 12, 0, 0);

    // Días trabajados en el año
    const inicioEfectivo = fechaIngreso > inicioAnio ? fechaIngreso : inicioAnio;
    const msDia = 1000 * 60 * 60 * 24;
    const diasTrabajadosAnio = Math.max(0, Math.round((fin - inicioEfectivo) / msDia) + 1);

    // === INASISTENCIAS AUTOMÁTICAS ===
    let inasistenciasCalculado = 0;
    try {
      const inicioBusqueda = new Date(Date.UTC(anioLiquidar, 0, 1));
      const finBusqueda = new Date(Date.UTC(fin.getFullYear(), fin.getMonth(), fin.getDate() + 1));

      const registrosFaltas = await RegistroTiempo.find({
        email: emp.email,
        fecha: { $gte: inicioBusqueda, $lt: finBusqueda },
        tipoDia: { $in: ['falta_injustificada', 'licencia_no_remunerada'] }
      }).lean();
      
      inasistenciasCalculado = registrosFaltas.length;
    } catch (e) {
      console.error('Error cargando registros de asistencia:', e.message);
    }

    const diasInasistencias = (inasistencias !== undefined && inasistencias !== null && String(inasistencias).trim() !== '') 
      ? Number(inasistencias) 
      : inasistenciasCalculado;

    const diasTrabajadosReales = Math.max(0, diasTrabajadosAnio - diasInasistencias);

    // === VACACIONES TOMADAS (consultar novedades aprobadas) ===
    let diasVacacionesTomadasAuto = 0;
    try {
      const novedadesVacaciones = await Novedad.find({
        email: emp.email,
        estado: 'aprobada',
        tipo: 'vacaciones',
        fechaInicio: { $lte: fin },
        fechaFin: { $gte: inicioEfectivo }
      }).lean();

      for (const nov of novedadesVacaciones) {
        const inicioNov = new Date(nov.fechaInicio) < inicioEfectivo ? inicioEfectivo : new Date(nov.fechaInicio);
        const finNov = new Date(nov.fechaFin) > fin ? fin : new Date(nov.fechaFin);
        const diasNov = Math.max(0, Math.round((finNov - inicioNov) / msDia) + 1);
        diasVacacionesTomadasAuto += diasNov;
      }

      console.log('Vacaciones tomadas encontradas:', diasVacacionesTomadasAuto, 'días');
      if (novedadesVacaciones.length > 0) {
        console.log('Detalle:', novedadesVacaciones.map(n => ({
          inicio: n.fechaInicio,
          fin: n.fechaFin,
          dias: Math.round((new Date(n.fechaFin) - new Date(n.fechaInicio)) / msDia) + 1
        })));
      }
    } catch (e) {
      console.error('Error consultando vacaciones tomadas:', e.message);
    }

      // ✅ CORREGIDO: Determinar si el usuario envió valor manual
    const esVacacionesManual = (vacacionesTomadas !== undefined && vacacionesTomadas !== null && String(vacacionesTomadas).trim() !== '' && Number(vacacionesTomadas) >= 0);
    
    const diasVacacionesTomadas = esVacacionesManual
      ? Number(vacacionesTomadas)
      : diasVacacionesTomadasAuto;

    // === VALIDAR NÓMINA EXISTENTE DEL MES ===
    const mesActual = fin.getMonth() + 1;
    const nominasMes = await Nomina.find({
      'empleados.email': email,
      anio: anioLiquidar,
      mes: mesActual,
      estado: { $in: ['aprobada', 'pagada'] }
    }).sort({ fechaInicio: -1 });

    const nominaExistente = nominasMes.length > 0 ? nominasMes[0] : null;
    const tieneNominaPagada = nominaExistente !== null;

    // Días del mes ya pagados (si hay nómina)
    let diasYaPagados = 0;
    let sueldoYaPagado = 0;
    if (nominaExistente) {
      const empNom = nominaExistente.empleados.find(e => e.email === email);
      if (empNom) {
        diasYaPagados = empNom.diasTrabajados || 0;
        sueldoYaPagado = empNom.salarioProporcional || 0;
      }
    }

    // Días del mes actual (para reintegro)
    const inicioMesActual = new Date(fin.getFullYear(), fin.getMonth(), 1, 12, 0, 0);
    const diasMesActualBruto = Math.max(0, Math.round((fin - inicioMesActual) / msDia) + 1);
    const diasMesEfectivos = Math.max(0, diasMesActualBruto - diasYaPagados);

    // Salario y auxilio
    const salarioBase = rd(emp.sueldo || 0);
    const recibeAuxilio = emp.recibeAuxilioTransporte && salarioBase <= TOPE_AUXILIO;
    const auxilioTransporte = recibeAuxilio ? AUXILIO_TRANSPORTE : 0;

    // Base de liquidación (sin promedio de extras)
    const baseLiquidacion = salarioBase + auxilioTransporte;

    // === REINTEGROS ===
    const sueldoPendiente = rd((salarioBase / 30) * diasMesEfectivos);
    const auxilioPendiente = recibeAuxilio ? calcularAuxilioTransporte(salarioBase, diasMesEfectivos) : 0;
    const totalReintegros = sueldoPendiente + auxilioPendiente;

    // === PRESTACIONES SOCIALES ===
    const diasBasePrestaciones = Math.max(0, diasTrabajadosReales - diasVacacionesTomadas);

    const prima = rd((baseLiquidacion * diasBasePrestaciones) / 360);
    const cesantias = rd((baseLiquidacion * diasBasePrestaciones) / 360);
    const interesesCesantias = rd((cesantias * diasBasePrestaciones * 0.12) / 360);
    const vacaciones = rd((salarioBase * diasBasePrestaciones) / 720);
    const totalPrestaciones = rd(prima + cesantias + interesesCesantias + vacaciones);

    // === DEDUCCIONES SOLO SOBRE REINTEGROS (LEY 100/1993) ===
    const saludEmpleado = rd(totalReintegros * 0.04);
    const pensionEmpleado = rd(totalReintegros * 0.04);

    // Descuentos activos del empleado
    const descuentosActivos = await DescuentoEmpleado.find({
      email: emp.email,
      estado: 'activo'
    });

    let deduccionExamenMedico = 0;
    let otrasDeducciones = 0;
    const detalleDeducciones = [];

    for (const desc of descuentosActivos) {
      const cuotaActual = desc.getCuotaActual ? desc.getCuotaActual() : (desc.valorTotal / desc.cuotas);
      const saldoPendiente = rd(desc.valorTotal - (desc.cuotasPagadas * cuotaActual));

      if (desc.tipo === 'examen_medico' || (desc.descripcion && desc.descripcion.toLowerCase().includes('examen medico'))) {
        deduccionExamenMedico += saldoPendiente;
      } else {
        otrasDeducciones += saldoPendiente;
      }

      detalleDeducciones.push({
        tipo: tipoLabels[desc.tipo] || desc.tipo,
        descripcion: desc.descripcion || 'Sin descripción',
        valorTotal: desc.valorTotal,
        cuotasPagadas: desc.cuotasPagadas,
        cuotasTotal: desc.cuotas,
        saldoPendiente
      });
    }

    const totalDeducciones = rd(saludEmpleado + pensionEmpleado + deduccionExamenMedico + otrasDeducciones);

    // === INDEMNIZACIÓN ===
    let indemnizacion = 0;
    const motivo = (motivoRetiro || '').toLowerCase();
    if (motivo === 'despido_sin_justa_causa' || motivo === 'despido sin justa causa') {
      const diasTotales = Math.ceil((fin - fechaIngreso) / msDia) + 1;
      const anosServicio = diasTotales / 365;
      indemnizacion = rd(salarioBase * anosServicio * 0.5);
    }

    // === TOTAL ===
    const totalLiquidacion = rd(totalPrestaciones + totalReintegros + indemnizacion - totalDeducciones);
    
    // === GUARDAR LIQUIDACIÓN EN BASE DE DATOS ===
    const idLiquidacion = `LIQ-${email.split('@')[0].toUpperCase()}-${Date.now()}`;
    
    const esInasistenciasManual = (inasistencias !== undefined && inasistencias !== null && String(inasistencias).trim() !== '');
    
    const liquidacionDoc = new Liquidacion({
      idLiquidacion,
      email: emp.email,
      nombre: emp.nombre,
      documento: emp.documento,
      cargo: emp.cargo,
      tipoContrato: emp.tipoContrato,
      fechaIngreso: fechaIngreso,
      fechaLiquidacion: fechaFin,
      motivoRetiro: motivoRetiro || 'renuncia_voluntaria',
      diasTrabajados: diasTrabajadosReales,
      diasTrabajadosBrutos: diasTrabajadosAnio,
      diasMesActual: diasMesActualBruto,
      diasMesEfectivos,
      diasYaPagados,
      inasistencias: diasInasistencias,
      inasistenciasCalculado,
      inasistenciasManual: esInasistenciasManual,
      vacacionesTomadas: diasVacacionesTomadas,
      vacacionesTomadasAuto: diasVacacionesTomadasAuto,
      vacacionesTomadasManual: esVacacionesManual,
      salarioBase,
      auxilioTransporte,
      baseLiquidacion,
      sueldoPendiente,
      auxilioPendiente,
      totalReintegros,
      prima,
      cesantias,
      interesesCesantias,
      vacaciones,
      totalPrestaciones,
      indemnizacion,
      saludEmpleado,
      pensionEmpleado,
      deduccionExamenMedico,
      otrasDeducciones,
      totalDeducciones,
      detalleDeducciones,
      tieneNominaPagada,
      nominaReferencia: nominaExistente ? nominaExistente.idNomina : null,
      totalLiquidacion,
      generadoPor: req.user?.email || 'sistema'
    });
    
    await liquidacionDoc.save();
    console.log('✅ Liquidación guardada en BD:', idLiquidacion);
    // Marcar como retirado
    emp.estadoLaboral = 'retirado';
    emp.fechaFinContrato = fechaFin;
    emp.motivoRetiro = motivoRetiro || 'renuncia_voluntaria';
    await emp.save();

    res.json({
      success: true,
      data: {
        email,
        nombre: emp.nombre,
        documento: emp.documento,
        cargo: emp.cargo,
        tipoContrato: emp.tipoContrato,
        fechaIngreso: emp.fechaIngreso,
        fechaLiquidacion: fechaFinal,
        fechaInicioMes: `${anioLiquidar}-${String(fin.getMonth() + 1).padStart(2, '0')}-01`,

        diasTrabajados: diasTrabajadosReales,
        diasTrabajadosBrutos: diasTrabajadosAnio,
        diasMesActual: diasMesActualBruto,
        diasMesEfectivos,
        diasYaPagados,
        inasistencias: diasInasistencias,
        inasistenciasCalculado,
        inasistenciasManual: (inasistencias !== undefined && inasistencias !== null && String(inasistencias).trim() !== ''),
        vacacionesTomadas: diasVacacionesTomadas,
        vacacionesTomadasAuto: diasVacacionesTomadasAuto,
        vacacionesTomadasManual: esVacacionesManual, 
        motivoRetiro: motivoRetiro || 'renuncia_voluntaria',

        salarioBase,
        auxilioTransporte,
        baseLiquidacion,

        // Reintegros (sujetos a aportes)
        sueldoPendiente,
        auxilioPendiente,
        totalReintegros,

        // Prestaciones sociales (exentas de aportes)
        prima,
        cesantias,
        interesesCesantias,
        vacaciones,
        totalPrestaciones,

        indemnizacion,

        // Deducciones legales
        saludEmpleado,
        pensionEmpleado,
        deduccionExamenMedico,
        otrasDeducciones,
        totalDeducciones,

        detalleDeducciones,

        // Info nómina
        tieneNominaPagada,
        nominaReferencia: nominaExistente ? nominaExistente.idNomina : null,

        totalLiquidacion
      }   
    });
  } catch (error) {
    console.error('Error liquidando contrato:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// REPORTE PARA CONTADOR (Excel/JSON)
// ============================================
exports.reporteContador = async (req, res) => {
  try {
    const { idNomina } = req.params;
    const nomina = await Nomina.findOne({ idNomina });
    if (!nomina) return res.status(404).json({ success: false, error: 'Nómina no encontrada' });

    const filas = nomina.empleados.map(emp => ({
      idNomina: nomina.idNomina,
      periodo: `${nomina.anio}-${String(nomina.mes).padStart(2,'0')} Q${nomina.quincena}`,
      email: emp.email,
      nombre: emp.nombre || emp.email,
      salarioBase: emp.salarioBase,
      diasTrabajados: emp.diasTrabajados,
      diasNoTrabajados: emp.diasNoTrabajados,
      diasFalta: emp.diasFalta || 0,
      totalDevengado: emp.totalDevengado,
      saludEmpleado: emp.saludEmpleado,
      pensionEmpleado: emp.pensionEmpleado,
      otrosDescuentos: emp.otrosDescuentos || 0,
      totalDeducciones: emp.totalDeducciones,
      netoAPagar: emp.netoAPagar,
      saludEmpleador: emp.saludEmpleador,
      pensionEmpleador: emp.pensionEmpleador,
      arl: emp.arl,
      cajaCompensacion: emp.cajaCompensacion,
      icbf: emp.icbf,
      sena: emp.sena,
      totalAportes: emp.totalAportes,
      costoTotalEmpleador: emp.costoTotalEmpleador
    }));

    res.json({ success: true, data: filas, resumen: {
      totalNomina: nomina.totalNomina,
      totalAportes: nomina.totalAportes,
      totalCosto: nomina.totalCosto
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// LIQUIDAR PRIMA SEMESTRAL
// ============================================
exports.liquidarPrima = async (req, res) => {
  try {
    const { anio, semestre, fechaPago } = req.body;
    const creadoPor = req.user?.email || 'sistema';

    // Validar semestre
    if (![1, 2].includes(Number(semestre))) {
      return res.status(400).json({ success: false, error: 'Semestre debe ser 1 o 2' });
    }

    const idNomina = `PRIMA-${anio}-S${semestre}`;
    const existe = await Nomina.findOne({ idNomina });
    if (existe) {
      return res.status(400).json({ success: false, error: 'Ya existe prima para este semestre' });
    }

    // Determinar rango de fechas del semestre
    const inicioSemestre = new Date(anio, semestre === 1 ? 0 : 6, 1);
    const finSemestre = new Date(anio, semestre === 1 ? 5 : 11, semestre === 1 ? 30 : 31);

    // Traer empleados activos o retirados durante el semestre
    const empleados = await Usuario.find({
      $or: [
        { estadoLaboral: 'activo' },
        { 
          estadoLaboral: 'retirado',
          fechaFinContrato: { $gte: inicioSemestre }
        }
      ],
      fechaIngreso: { $lte: finSemestre }
    });

    const empleadosNomina = [];
    let totalNomina = 0, totalAportes = 0, totalCosto = 0;

    for (const emp of empleados) {
      const salarioBase = rd(emp.sueldo || 0);
      const recibeAuxilio = emp.recibeAuxilioTransporte && salarioBase <= TOPE_AUXILIO;
      const auxilioTransporte = recibeAuxilio ? AUXILIO_TRANSPORTE : 0;
      const baseLiquidacion = salarioBase + auxilioTransporte;

      // Calcular días trabajados efectivos en el semestre
      const fechaIngreso = new Date(emp.fechaIngreso);
      const fechaFin = emp.estadoLaboral === 'retirado' && emp.fechaFinContrato 
        ? new Date(emp.fechaFinContrato) 
        : finSemestre;

      const inicioEfectivo = fechaIngreso > inicioSemestre ? fechaIngreso : inicioSemestre;
      const finEfectivo = fechaFin < finSemestre ? fechaFin : finSemestre;

      // Días trabajados = días calendario reales (incluye incapacidades, licencias, vacaciones)
      // Excluir: licencias no remuneradas, suspensiones
      const diasTrabajados = Math.max(0, Math.ceil((finEfectivo - inicioEfectivo) / (1000 * 60 * 60 * 24)) + 1);

      // Calcular días no laborados (licencias no rem, suspensiones)
      const novedadesNoRem = await Novedad.find({
        email: emp.email,
        estado: 'aprobada',
        tipo: { $in: ['licencia_no_remunerada', 'suspension'] },
        fechaInicio: { $lte: finEfectivo },
        fechaFin: { $gte: inicioEfectivo }
      });

      let diasNoRem = 0;
      for (const nov of novedadesNoRem) {
        const inicioNov = new Date(nov.fechaInicio) < inicioEfectivo ? inicioEfectivo : new Date(nov.fechaInicio);
        const finNov = new Date(nov.fechaFin) > finEfectivo ? finEfectivo : new Date(nov.fechaFin);
        diasNoRem += Math.ceil((finNov - inicioNov) / (1000 * 60 * 60 * 24)) + 1;
      }

      const diasEfectivos = Math.max(0, diasTrabajados - diasNoRem);

      // Fórmula prima: (base × días) / 360
      const primaBruta = rd((baseLiquidacion * diasEfectivos) / 360);

      // Deducciones de ley sobre prima (salud 4%, pensión 4%)
      const saludEmpleado = rd(primaBruta * 0.04);
      const pensionEmpleado = rd(primaBruta * 0.04);
      const totalDeducciones = rd(saludEmpleado + pensionEmpleado);
      const netoAPagar = rd(primaBruta - totalDeducciones);

      // Aportes empleador sobre prima
      const saludEmpleador = rd(primaBruta * 0.085);
      const pensionEmpleador = rd(primaBruta * 0.12);
      const arl = rd(primaBruta * 0.0696);
      const cajaCompensacion = rd(primaBruta * 0.04);
      const icbf = rd(primaBruta * 0.03);
      const sena = rd(primaBruta * 0.02);
      const totalAportesEmp = rd(saludEmpleador + pensionEmpleador + arl + cajaCompensacion + icbf + sena);
      const costoTotalEmpleador = rd(primaBruta + totalAportesEmp);

      // Distribución por proyecto (igual que nómina normal)
      let distribucionProyectos = [];
      if (emp.proyectoAsignado) {
        distribucionProyectos = [{ idProyecto: emp.proyectoAsignado, horas: 0, costo: costoTotalEmpleador }];
      } else {
        distribucionProyectos = [{ idProyecto: 'ADMIN', horas: 0, costo: costoTotalEmpleador }];
      }

      empleadosNomina.push({
        email: emp.email,
        nombre: emp.nombre || emp.email,
        cargo: emp.cargo || 'N/A',
        salarioBase,
        valorHora: 0,
        diasTrabajados: diasEfectivos,
        diasNoTrabajados: diasNoRem,
        diasFalta: 0,
        diasLicenciaNoRem: diasNoRem,
        horasNormales: 0,
        horasExtrasDiurnas: 0,
        horasExtrasNocturnas: 0,
        horasExtrasDominical: 0,
        horasExtrasNocturnasDominical: 0,
        valorExtrasDiurnas: 0,
        valorExtrasNocturnas: 0,
        valorExtrasDominical: 0,
        valorExtrasNocturnasDominical: 0,
        recargoNocturno: 0,
        recargoDominical: 0,
        auxilioTransporte: 0, // ya está en base
        subsidioFamiliar: 0,
        incapacidadPagadaEmpresa: 0,
        licenciaRemunerada: 0,
        vacacionesPagadas: 0,
        bonificaciones: 0,
        totalDevengado: primaBruta,
        saludEmpleado,
        pensionEmpleado,
        fondoSolidaridad: 0,
        retencionFuente: 0,
        otrosDescuentos: 0,
        detalleDescuentos: [],
        totalDeducciones,
        netoAPagar,
        saludEmpleador,
        pensionEmpleador,
        arl,
        cajaCompensacion,
        icbf,
        sena,
        totalAportes: totalAportesEmp,
        costoTotalEmpleador,
        distribucionProyectos
      });

      totalNomina += netoAPagar;
      totalAportes += totalAportesEmp;
      totalCosto += costoTotalEmpleador;
    }

    // Distribución global
    const distribucionMap = {};
    for (const emp of empleadosNomina) {
      for (const dist of emp.distribucionProyectos) {
        distribucionMap[dist.idProyecto] = (distribucionMap[dist.idProyecto] || 0) + dist.costo;
      }
    }
    const distribucionGlobal = Object.entries(distribucionMap).map(([idProyecto, totalCostoProy]) => ({
      idProyecto,
      totalCosto: totalCostoProy,
      porcentaje: totalCosto > 0 ? rd((totalCostoProy / totalCosto) * 100) : 0
    }));

    const nomina = new Nomina({
      idNomina,
      anio,
      mes: semestre === 1 ? 6 : 12,
      quincena: 0,
      fechaInicio: inicioSemestre,
      fechaFin: finSemestre,
      fechaPago: fechaPago ? new Date(fechaPago) : null,
      tipo: 'prima_semestral',
      estado: 'calculada',
      semestre: Number(semestre),
      diasBasePrima: 360,
      empleados: empleadosNomina,
      totalNomina: rd(totalNomina),
      totalAportes: rd(totalAportes),
      totalCosto: rd(totalCosto),
      distribucionGlobal,
      creadoPor
    });

    await nomina.save();

    res.json({ 
      success: true, 
      data: nomina,
      resumen: {
        empleadosProcesados: empleadosNomina.length,
        totalPrimaBruta: empleadosNomina.reduce((s, e) => s + e.totalDevengado, 0),
        totalDeducciones: empleadosNomina.reduce((s, e) => s + e.totalDeducciones, 0),
        totalNeto: totalNomina
      }
    });
  } catch (error) {
    console.error('Error liquidando prima:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// GENERAR PLANILLA DE CESANTÍAS A FONDO (VERSIÓN CORREGIDA)
// ============================================
exports.generarCesantiasFondo = async (req, res) => {
  try {
    const { anio } = req.body;
    const creadoPor = req.user?.email || 'sistema';

    if (!anio || anio < 2020 || anio > 2030) {
      return res.status(400).json({ success: false, error: "Año inválido" });
    }

    // Fechas del año a liquidar
    const inicioAnio = new Date(anio, 0, 1);
    const finAnio = new Date(anio, 11, 31, 23, 59, 59);

    // Auxilio de transporte por año (Colombia)
    const AUXILIO_POR_ANIO = {
      2022: 117172,
      2023: 140606,
      2024: 162000,
      2025: 200000,  // ajustar según decreto real
      2026: AUXILIO_TRANSPORTE  // ✅ USAR CONSTANTE DEL HELPER
    };
    const auxilioTransporteAnio = AUXILIO_POR_ANIO[anio] || AUXILIO_TRANSPORTE;

    // Helper: parsear DD/MM/YYYY o DD/M/YYYY a Date
    const parseFecha = (str) => {
      if (!str) return null;
      if (str instanceof Date) return str;
      const partes = String(str).trim().split('/');
      if (partes.length === 3) {
        const [d, m, y] = partes.map(Number);
        return new Date(y, m - 1, d);
      }
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };

    // Helper: normalizar fecha a medianoche (sin horas)
    const normalizarFecha = (fecha) => {
      return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    };

    // Traer candidatos: planta o residente, activos o retirados en el año
    const candidatos = await Usuario.find({
      $or: [
        { estadoLaboral: 'activo', tipoEmpleado: { $in: ['planta', 'residente'] } },
        {
          estadoLaboral: 'retirado',
          tipoEmpleado: { $in: ['planta', 'residente'] },
          fechaFinContrato: { $gte: inicioAnio }
        }
      ]
    });

    const filas = [];
    let totalConsignar = 0;

    for (const emp of candidatos) {
      // ❌ EXCLUIR: Colpensiones no tiene fondo de cesantías privado
      const fondoPension = (emp.fondoPension || '').toUpperCase().trim();
      if (fondoPension === 'COLPENSIONES') {
        continue;
      }

      const fechaIngresoRaw = parseFecha(emp.fechaIngreso);
      const fechaFinContratoRaw = parseFecha(emp.fechaFinContrato);

      // ❌ EXCLUIR: sin fecha de ingreso válida
      if (!fechaIngresoRaw) continue;

      const fechaIngreso = normalizarFecha(fechaIngresoRaw);

      // ❌ EXCLUIR: ingresó DESPUÉS de que terminó el año
      if (fechaIngreso > finAnio) continue;

      // ❌ EXCLUIR: se retiró ANTES de que empezara el año
      if (emp.estadoLaboral === 'retirado' && fechaFinContratoRaw) {
        const fechaFin = normalizarFecha(fechaFinContratoRaw);
        if (fechaFin < inicioAnio) continue;
      }

      const salarioBase = rd(emp.sueldo || 0);
      const recibeAuxilio = emp.recibeAuxilioTransporte && salarioBase <= TOPE_AUXILIO;
      const auxilioTransporte = recibeAuxilio ? auxilioTransporteAnio : 0;
      const baseLiquidacion = salarioBase + auxilioTransporte;

      // Calcular días trabajados en el año (solapamiento real)
      const fechaFin = (emp.estadoLaboral === 'retirado' && fechaFinContratoRaw)
        ? normalizarFecha(fechaFinContratoRaw)
        : normalizarFecha(finAnio);

      const inicioEfectivo = fechaIngreso > inicioAnio ? fechaIngreso : inicioAnio;
      const finEfectivo = fechaFin < finAnio ? fechaFin : normalizarFecha(finAnio);

      const msDia = 1000 * 60 * 60 * 24;
      // Días inclusive: redondear la diferencia y sumar 1
      const diffMs = finEfectivo.getTime() - inicioEfectivo.getTime();
      const diasTrabajados = Math.max(0, Math.round(diffMs / msDia) + 1);

      // ❌ EXCLUIR: si no trabajó ni un día en el año
      if (diasTrabajados <= 0) continue;

      // Cesantías = (base × días) / 360
      const cesantias = rd((baseLiquidacion * diasTrabajados) / 360);

      // Intereses = (cesantías × días × 12%) / 360
      const intereses = rd((cesantias * diasTrabajados * 0.12) / 360);

      const total = rd(cesantias + intereses);
      totalConsignar += total;

      filas.push({
        email: emp.email,
        nombre: emp.nombre || emp.email,
        documento: emp.documento || 'N/A',
        tipoEmpleado: emp.tipoEmpleado,
        cargo: emp.cargo || emp.rol || 'N/A',
        fondoCesantias: fondoPension || 'PORVENIR',
        numeroCuenta: emp.numeroCuentaFondo || '',
        salarioBase,
        auxilioTransporte,
        baseLiquidacion,
        diasTrabajados,
        cesantias,
        intereses,
        total,
        fechaIngreso: emp.fechaIngreso,
        fechaRetiro: emp.fechaFinContrato || null,
        estado: emp.estadoLaboral
      });
    }

    const idConsignacion = `CES-${anio}-${Date.now()}`;

    res.json({
      success: true,
      data: {
        idConsignacion,
        anio,
        fechaGeneracion: new Date(),
        totalEmpleados: filas.length,
        totalConsignar: rd(totalConsignar),
        empleados: filas
      }
    });
  } catch (error) {
    console.error('Error generando cesantías fondo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// ============================================
// LISTAR LIQUIDACIONES
// ============================================
exports.getLiquidaciones = async (req, res) => {
  try {
    const { email, anio } = req.query;
    const filtro = { estado: 'activa' };
    
    if (email) filtro.email = email;
    if (anio) {
      const inicio = new Date(anio, 0, 1);
      const fin = new Date(anio, 11, 31, 23, 59, 59);
      filtro.fechaLiquidacion = { $gte: inicio, $lte: fin };
    }
    
    const liquidaciones = await Liquidacion.find(filtro)
      .sort({ fechaLiquidacion: -1 })
      .lean();
      
    res.json({ success: true, data: liquidaciones });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// OBTENER LIQUIDACIÓN POR ID
// ============================================
exports.getLiquidacionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar solo por idLiquidacion (string), no por _id (ObjectId)
    // para evitar el error de cast cuando el ID es un string personalizado
    const liquidacion = await Liquidacion.findOne({ idLiquidacion: id }).lean();
    
    if (!liquidacion) {
      return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });
    }
    
    res.json({ success: true, data: liquidacion });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// OBTENER LIQUIDACIONES POR EMPLEADO
// ============================================
exports.getLiquidacionesEmpleado = async (req, res) => {
  try {
    const { email } = req.params;
    const liquidaciones = await Liquidacion.find({ 
      email: email.trim().toLowerCase(),
      estado: 'activa'
    }).sort({ fechaLiquidacion: -1 }).lean();
    
    res.json({ success: true, data: liquidaciones });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// ============================================
// EXPORTAR LIQUIDACIONES A EXCEL
// ============================================
exports.exportarLiquidacionesExcel = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { anio } = req.query;
    
    const filtro = { estado: 'activa' };
    if (anio) {
      const inicio = new Date(anio, 0, 1);
      const fin = new Date(anio, 11, 31, 23, 59, 59);
      filtro.fechaLiquidacion = { $gte: inicio, $lte: fin };
    }
    
    const liquidaciones = await Liquidacion.find(filtro)
      .sort({ fechaLiquidacion: -1 })
      .lean();

    // Preparar datos para Excel
    const datos = liquidaciones.map(liq => ({
      'ID Liquidación': liq.idLiquidacion,
      'Empleado': liq.nombre || 'N/A',
      'Email': liq.email,
      'Documento': liq.documento || 'N/A',
      'Cargo': liq.cargo || 'N/A',
      'Tipo Contrato': liq.tipoContrato || 'N/A',
      'Fecha Ingreso': liq.fechaIngreso ? new Date(liq.fechaIngreso).toLocaleDateString('es-CO') : 'N/A',
      'Fecha Retiro': liq.fechaLiquidacion ? new Date(liq.fechaLiquidacion).toLocaleDateString('es-CO') : 'N/A',
      'Motivo Retiro': liq.motivoRetiro || 'N/A',
      'Días Trabajados': liq.diasTrabajados || 0,
      'Inasistencias': liq.inasistencias || 0,
      'Vacaciones Tomadas': liq.vacacionesTomadas || 0,
      'Salario Base': liq.salarioBase || 0,
      'Auxilio Transporte': liq.auxilioTransporte || 0,
      'Base Liquidación': liq.baseLiquidacion || 0,
      'Reintegros': liq.totalReintegros || 0,
      'Prima': liq.prima || 0,
      'Cesantías': liq.cesantias || 0,
      'Intereses Cesantías': liq.interesesCesantias || 0,
      'Vacaciones Proporcionales': liq.vacaciones || 0,
      'Total Prestaciones': liq.totalPrestaciones || 0,
      'Salud (4%)': liq.saludEmpleado || 0,
      'Pensión (4%)': liq.pensionEmpleado || 0,
      'Otras Deducciones': liq.otrasDeducciones || 0,
      'Total Deducciones': liq.totalDeducciones || 0,
      'Indemnización': liq.indemnizacion || 0,
      'TOTAL A PAGAR': liq.totalLiquidacion || 0,
      'Generado Por': liq.generadoPor || 'sistema',
      'Fecha Generación': liq.fechaGeneracion ? new Date(liq.fechaGeneracion).toLocaleDateString('es-CO') : 'N/A'
    }));

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 25 }, // ID
      { wch: 25 }, // Empleado
      { wch: 30 }, // Email
      { wch: 15 }, // Documento
      { wch: 20 }, // Cargo
      { wch: 15 }, // Tipo Contrato
      { wch: 15 }, // Fecha Ingreso
      { wch: 15 }, // Fecha Retiro
      { wch: 20 }, // Motivo
      { wch: 12 }, // Días
      { wch: 12 }, // Inasistencias
      { wch: 12 }, // Vacaciones
      { wch: 15 }, // Salario
      { wch: 15 }, // Auxilio
      { wch: 15 }, // Base
      { wch: 15 }, // Reintegros
      { wch: 15 }, // Prima
      { wch: 15 }, // Cesantías
      { wch: 15 }, // Intereses
      { wch: 15 }, // Vacaciones
      { wch: 15 }, // Total Prestaciones
      { wch: 15 }, // Salud
      { wch: 15 }, // Pensión
      { wch: 15 }, // Otras deducciones
      { wch: 15 }, // Total deducciones
      { wch: 15 }, // Indemnización
      { wch: 18 }, // TOTAL
      { wch: 20 }, // Generado Por
      { wch: 15 }  // Fecha Generación
    ];
    ws['!cols'] = colWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Liquidaciones');

    // Generar buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Liquidaciones_${anio || 'Todas'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buf);

  } catch (error) {
    console.error('Error exportando a Excel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};