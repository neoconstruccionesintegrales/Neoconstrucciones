const express = require('express');
const router = express.Router();
const RegistroTiempo = require('../models/RegistroTiempo');
const { authMiddleware } = require('../middleware/authMiddleware');
const { calcularHoras } = require('../utils/calcularHoras');
const Calendario = require('../models/Calendario');
const Usuario = require('../models/usuario');

const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    const rol = req.user?.rol;
    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    next();
  };
};

router.use(authMiddleware);

// Tipos de día que NO requieren marcado de entrada/salida
const TIPOS_SIN_MARCADO = ['falta_injustificada', 'licencia_no_remunerada', 'vacaciones', 
                            'incapacidad_eps', 'incapacidad_arl', 'incapacidad_soat',
                            'licencia_remunerada', 'descanso', 'festivo_no_trabajado'];

// ============================================
// POST /api/asistencia - Crear registro
// ============================================
router.post('/', verificarRol(['admin', 'gerente', 'secretaria', 'supervisor']), async (req, res) => {
  try {
    const empleado = await Usuario.findOne({ email: req.body.email });
    if (!empleado) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });

    const fechaObj = new Date(req.body.fecha);
    const anio = fechaObj.getFullYear();
    const mes = fechaObj.getMonth() + 1;
    const dia = fechaObj.getDate();
    const calendario = await Calendario.findOne({ anio, mes });
    let calendarioDia = { tipo: 'habil', esNocturno: false };
    if (calendario?.dias) {
      const dEncontrado = calendario.dias.find(d => new Date(d.fecha).getDate() === dia);
      if (dEncontrado) calendarioDia = { tipo: dEncontrado.tipo, esNocturno: dEncontrado.esNocturno };
    }

    const tipoDia = req.body.tipoDia || 'normal';
    const esTipoSinMarcado = TIPOS_SIN_MARCADO.includes(tipoDia);

    let entrada, salida;
    let calculado = null;

    // Solo calcular horas si es día normal o capacitación (requiere marcado)
    if (!esTipoSinMarcado && tipoDia !== 'permiso') {
      if (req.body.tipoRegistro === 'self' && req.body.marcaEntrada && req.body.marcaSalida) {
        const entDate = new Date(req.body.marcaEntrada);
        const salDate = new Date(req.body.marcaSalida);
        entrada = `${String(entDate.getHours()).padStart(2,'0')}:${String(entDate.getMinutes()).padStart(2,'0')}`;
        salida = `${String(salDate.getHours()).padStart(2,'0')}:${String(salDate.getMinutes()).padStart(2,'0')}`;
      } else if (req.body.horaEntradaManual && req.body.horaSalidaManual) {
        entrada = req.body.horaEntradaManual;
        salida = req.body.horaSalidaManual;
      } else {
        const turno = req.body.turnoAsignado || empleado.turnoAsignado;
        if (turno === '06-15') { entrada = '06:00'; salida = '15:00'; }
        else if (turno === '07-16') { entrada = '07:00'; salida = '16:00'; }
        else if (turno === '08-17') { entrada = '08:00'; salida = '17:00'; }
        else { entrada = '06:00'; salida = '15:00'; }
      }

      calculado = calcularHoras(
        entrada, salida, calendarioDia,
        req.body.turnoAsignado || empleado.turnoAsignado || null,
        empleado.sueldo || 0,
        req.body.marcaAlmuerzoInicio || null,
        req.body.marcaAlmuerzoFin || null,
        req.body.breaks || [],
        req.body.horasAlmuerzoManual !== undefined ? req.body.horasAlmuerzoManual : null
      );
    }

    const datos = {
      idRegistro: `REG-${Date.now()}`,
      email: req.body.email,
      registradoPor: req.user?.email || 'sistema',
      idProyecto: req.body.idProyecto || 'SIN_PROYECTO',
      fecha: fechaObj,
      horasNormales: calculado ? calculado.horasNormales : 0,
      horasExtrasDiurnas: calculado ? calculado.horasExtrasDiurnas : 0,
      horasExtrasNocturnas: calculado ? calculado.horasExtrasNocturnas : 0,
      horasExtrasDominical: calculado ? calculado.horasExtrasDominical : 0,
      horasExtrasNocturnasDominical: calculado ? calculado.horasExtrasNocturnasDominical : 0,
      recargoNocturno: calculado ? calculado.recargoNocturno : 0,
      recargoDominical: calculado ? calculado.recargoDominical : 0,
      horasDescuento: calculado ? (calculado.horasDescuento || 0) : 0,
      unidadesProducidas: req.body.unidadesProducidas || 0,
      tipoDia: tipoDia,
      extrasAprobadas: false,
      extrasAprobadasPor: null,
      extrasAprobadasFecha: null,
      extrasPendientesAprobacion: calculado ? (calculado.horasExtrasDiurnas > 0 || 
                                  calculado.horasExtrasNocturnas > 0 || 
                                  calculado.horasExtrasDominical > 0 || 
                                  calculado.horasExtrasNocturnasDominical > 0) : false,
      estado: esTipoSinMarcado ? 'validado' : 'borrador',
      notas: req.body.notas || '',
      marcaEntrada: req.body.marcaEntrada || null,
      marcaSalida: req.body.marcaSalida || null,
      marcaAlmuerzoInicio: req.body.marcaAlmuerzoInicio || null,
      marcaAlmuerzoFin: req.body.marcaAlmuerzoFin || null,
      breaks: req.body.breaks || [],
      estadoMarcado: req.body.estadoMarcado || 'sin_marcar',
      minutosCapacitacion: req.body.minutosCapacitacion || 0,
      turnoAsignado: req.body.turnoAsignado || empleado.turnoAsignado || null,
      tipoRegistro: req.body.tipoRegistro || 'supervisor',
      horaEntradaManual: req.body.horaEntradaManual || null,
      horaSalidaManual: req.body.horaSalidaManual || null
    };

    const registroExistente = await RegistroTiempo.findOne({
      email: req.body.email,
      fecha: {
        $gte: new Date(fechaObj.setHours(0,0,0,0)),
        $lte: new Date(fechaObj.setHours(23,59,59,999))
      }
    });

    if (registroExistente) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ya existe un registro para este empleado en esta fecha' 
      });
    }

    const registro = new RegistroTiempo(datos);
    await registro.save();

    res.json({ 
      success: true, 
      data: registro, 
      calculado: calculado ? {
        horasNormales: calculado.horasNormales,
        horasExtrasDiurnas: calculado.horasExtrasDiurnas,
        horasExtrasNocturnas: calculado.horasExtrasNocturnas,
        horasExtrasDominical: calculado.horasExtrasDominical,
        horasExtrasNocturnasDominical: calculado.horasExtrasNocturnasDominical,
        recargoNocturno: calculado.recargoNocturno,
        recargoDominical: calculado.recargoDominical,
        horasDescuento: calculado.horasDescuento,
        horasEfectivas: calculado.horasEfectivas,
        valores: {
          extrasDiurnas: calculado.valorExtrasDiurnas,
          extrasNocturnas: calculado.valorExtrasNocturnas,
          extrasDominical: calculado.valorExtrasDominical,
          extrasNocturnasDom: calculado.valorExtrasNocturnasDom,
          recargoNocturno: calculado.valorRecargoNocturno,
          recargoDominical: calculado.valorRecargoDominical,
          descuento: calculado.valorDescuento
        }
      } : null
    });

  } catch (error) {
    console.error('Error POST asistencia:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /api/asistencia - Todos los registros (con filtros opcionales)
// ============================================
router.get('/', async (req, res) => {
  try {
    const { fecha, email, proyecto } = req.query;
    const filtro = {};

    if (fecha) {
      const d = new Date(fecha);
      const inicio = new Date(d.setHours(0,0,0,0));
      const fin = new Date(d.setHours(23,59,59,999));
      filtro.fecha = { $gte: inicio, $lte: fin };
    }

    if (email) filtro.email = email;
    if (proyecto) filtro.idProyecto = proyecto;

    const registros = await RegistroTiempo.find(filtro).sort({ fecha: -1 });
    res.json({ success: true, data: registros });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /api/asistencia/extras/pendientes
// ============================================
router.get('/extras/pendientes', async (req, res) => {
  try {
    const registros = await RegistroTiempo.find({
      $or: [
        { horasExtrasDiurnas: { $gt: 0 } },
        { horasExtrasNocturnas: { $gt: 0 } },
        { horasExtrasDominical: { $gt: 0 } },
        { horasExtrasNocturnasDominical: { $gt: 0 } },
        { recargoNocturno: { $gt: 0 } },
        { recargoDominical: { $gt: 0 } }
      ]
    }).sort({ fecha: -1 });

    res.json({ success: true, data: registros });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /api/asistencia/proyecto/:idProyecto
// ============================================
router.get('/proyecto/:idProyecto', async (req, res) => {
  try {
    const { idProyecto } = req.params;
    const { fecha } = req.query;

    const filtro = { idProyecto };

    if (fecha) {
      const d = new Date(fecha);
      const inicio = new Date(d.setHours(0,0,0,0));
      const fin = new Date(d.setHours(23,59,59,999));
      filtro.fecha = { $gte: inicio, $lte: fin };
    }

    const registros = await RegistroTiempo.find(filtro).sort({ fecha: -1 });
    res.json({ success: true, data: registros });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PUT /api/asistencia/:id/aprobar-extras
// ============================================
router.put('/:id/aprobar-extras', verificarRol(['admin', 'gerente']), async (req, res) => {
  try {
    const reg = await RegistroTiempo.findById(req.params.id);
    if (!reg) return res.status(404).json({ success: false, error: 'Registro no encontrado' });

    reg.extrasAprobadas = true;
    reg.extrasPendientesAprobacion = false;
    reg.extrasAprobadasPor = req.user?.email || 'sistema';
    reg.extrasAprobadasFecha = new Date();
    reg.estado = 'validado';

    await reg.save();
    res.json({ success: true, data: reg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PUT /api/asistencia/:id/rechazar-extras
// ============================================
router.put('/:id/rechazar-extras', verificarRol(['admin', 'gerente']), async (req, res) => {
  try {
    const { motivoRechazo } = req.body;

    const reg = await RegistroTiempo.findById(req.params.id);
    if (!reg) return res.status(404).json({ success: false, error: 'Registro no encontrado' });

    reg.extrasAprobadas = false;
    reg.extrasPendientesAprobacion = false;
    reg.motivoRechazoExtras = motivoRechazo || '';
    reg.extrasRechazadasFecha = new Date();
    reg.extrasRechazadasPor = req.user?.email || 'sistema';
    reg.estado = 'rechazado';

    await reg.save();
    res.json({ success: true, data: reg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET /api/asistencia/:id
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const registro = await RegistroTiempo.findById(req.params.id);
    if (!registro) return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    res.json({ success: true, data: registro });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;