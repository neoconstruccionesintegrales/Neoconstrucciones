const Novedad = require('../models/Novedad');

// Generar ID único para novedad
const generarIdNovedad = () => `NOV-${Date.now()}`;

// ============================================
// CALCULAR DÍAS ENTRE DOS FECHAS (inclusive)
// ============================================
const calcularDias = (fechaInicio, fechaFin) => {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const diffTime = Math.abs(fin - inicio);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días
};

// ============================================
// VALIDAR SOLAPAMIENTO DE NOVEDADES
// ============================================
const validarSolapamiento = async (email, fechaInicio, fechaFin, idNovedadExcluir = null) => {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  const query = {
    email,
    estado: { $in: ['aprobada', 'pendiente'] }, // Validar con pendientes también para evitar conflictos
    $or: [
      { fechaInicio: { $lte: fin }, fechaFin: { $gte: inicio } } // Solapamiento
    ]
  };

  if (idNovedadExcluir) {
    query._id = { $ne: idNovedadExcluir };
  }

  const novedadesExistentes = await Novedad.find(query);
  return novedadesExistentes.length === 0;
};

// ============================================
// CREAR NOVEDAD
// ============================================
exports.crearNovedad = async (req, res) => {
  try {
    const { email, tipo, fechaInicio, fechaFin, descripcion, numeroIncapacidad, entidad } = req.body;
    const creadoPor = req.user?.email || 'sistema';

    // Validar campos requeridos
    if (!email || !tipo || !fechaInicio || !fechaFin) {
      return res.status(400).json({ success: false, error: 'Email, tipo, fechaInicio y fechaFin son requeridos' });
    }

    // Calcular días automáticamente
    const dias = calcularDias(fechaInicio, fechaFin);

    // Validar máximo 15 días para vacaciones
    if (tipo === 'vacaciones' && dias > 15) {
      return res.status(400).json({ 
        success: false, 
        error: `Las vacaciones no pueden exceder 15 días. Solicitud: ${dias} días` 
      });
    }

    // Validar que fechaFin no sea anterior a fechaInicio
    if (new Date(fechaFin) < new Date(fechaInicio)) {
      return res.status(400).json({ success: false, error: 'La fecha fin no puede ser anterior a la fecha inicio' });
    }

    // Validar solapamiento con otras novedades
    const sinSolapamiento = await validarSolapamiento(email, fechaInicio, fechaFin);
    if (!sinSolapamiento) {
      return res.status(400).json({ 
        success: false, 
        error: 'El empleado ya tiene una novedad registrada en esas fechas' 
      });
    }

    // Calcular valor pagado por empresa para incapacidades (días 1-2)
    let valorPagadoEmpresa = 0;
    if (tipo === 'incapacidad_eps' || tipo === 'incapacidad_arl') {
      const diasEmpresa = Math.min(dias, 2); // Máximo 2 días paga la empresa
      // Aquí deberías obtener el salario del empleado para calcular el valor
      // Por ahora lo dejamos en 0 y se calcula en la nómina
      valorPagadoEmpresa = 0; // Se calculará en la nómina con el salario actual
    }

    const idNovedad = generarIdNovedad();

    const novedad = new Novedad({
      idNovedad,
      email,
      tipo,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      dias,
      descripcion,
      numeroIncapacidad,
      entidad,
      valorPagadoEmpresa,
      creadoPor
    });

    await novedad.save();
    res.status(201).json({ success: true, data: novedad });
  } catch (error) {
    console.error('Error creando novedad:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// OBTENER TODAS LAS NOVEDADES
// ============================================
exports.getNovedades = async (req, res) => {
  try {
    const { email, estado, tipo } = req.query;
    const filtro = {};
    if (email) filtro.email = email;
    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipo = tipo;

    const novedades = await Novedad.find(filtro).sort({ createdAt: -1 });
    res.json({ success: true, data: novedades });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// APROBAR NOVEDAD
// ============================================
exports.aprobarNovedad = async (req, res) => {
  try {
    const { id } = req.params;
    const aprobadoPor = req.user?.email || 'sistema';

    const novedad = await Novedad.findById(id);
    if (!novedad) return res.status(404).json({ success: false, error: 'Novedad no encontrada' });

    if (novedad.estado !== 'pendiente') {
      return res.status(400).json({ success: false, error: 'La novedad ya fue procesada' });
    }

    novedad.estado = 'aprobada';
    novedad.aprobadoPor = aprobadoPor;
    novedad.fechaAprobacion = new Date();

    await novedad.save();
    res.json({ success: true, data: novedad });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// RECHAZAR NOVEDAD
// ============================================
exports.rechazarNovedad = async (req, res) => {
  try {
    const { id } = req.params;

    const novedad = await Novedad.findById(id);
    if (!novedad) return res.status(404).json({ success: false, error: 'Novedad no encontrada' });

    novedad.estado = 'rechazada';
    await novedad.save();
    res.json({ success: true, data: novedad });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// ELIMINAR NOVEDAD
// ============================================
exports.eliminarNovedad = async (req, res) => {
  try {
    const { id } = req.params;
    await Novedad.findByIdAndDelete(id);
    res.json({ success: true, message: 'Novedad eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
