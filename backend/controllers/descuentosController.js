const DescuentoEmpleado = require('../models/DescuentoEmpleado');

// Helper de respuesta
const r = (success, data, error) => ({ success, data, error });

// ============================================
// CREAR DESCUENTO
// ============================================
exports.crearDescuento = async (req, res) => {
  try {
    const { email, tipo, descripcion, valorTotal, valorCuota, cuotas, condicion } = req.body;
    const creadoPor = req.user?.email || 'sistema';

    // Validaciones
    if (valorCuota * cuotas > valorTotal * 1.01) {
      return res.status(400).json(r(false, null, 'El valor total de cuotas excede el valor del descuento'));
    }

    const descuento = new DescuentoEmpleado({
      email,
      tipo,
      descripcion,
      valorTotal,
      valorCuota,
      cuotas,
      cuotasPagadas: 0,
      estado: 'activo',
      creadoPor,
      condicion: condicion || {}
    });

    await descuento.save();
    res.status(201).json(r(true, descuento));
  } catch (error) {
    res.status(500).json(r(false, null, error.message));
  }
};

// ============================================
// LISTAR DESCUENTOS (con filtros)
// ============================================
exports.listarDescuentos = async (req, res) => {
  try {
    const { email, tipo, estado, page = 1, limit = 20 } = req.query;
    const filtro = {};
    if (email) filtro.email = email;
    if (tipo) filtro.tipo = tipo;
    if (estado) filtro.estado = estado;

    const skip = (Number(page) - 1) * Number(limit);

    const [descuentos, total] = await Promise.all([
      DescuentoEmpleado.find(filtro)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      DescuentoEmpleado.countDocuments(filtro)
    ]);

    res.json(r(true, {
      descuentos,
      paginacion: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }));
  } catch (error) {
    res.status(500).json(r(false, null, error.message));
  }
};

// ============================================
// OBTENER DESCUENTO POR ID
// ============================================
exports.getDescuentoById = async (req, res) => {
  try {
    const descuento = await DescuentoEmpleado.findById(req.params.id);
    if (!descuento) return res.status(404).json(r(false, null, 'Descuento no encontrado'));
    res.json(r(true, descuento));
  } catch (error) {
    res.status(500).json(r(false, null, error.message));
  }
};

// ============================================
// ACTUALIZAR DESCUENTO (solo si no tiene pagos)
// ============================================
exports.actualizarDescuento = async (req, res) => {
  try {
    const { descripcion, valorCuota, estado } = req.body;
    const descuento = await DescuentoEmpleado.findById(req.params.id);

    if (!descuento) return res.status(404).json(r(false, null, 'Descuento no encontrado'));
    if (descuento.historialPagos?.length > 0) {
      return res.status(400).json(r(false, null, 'No se puede editar un descuento con pagos registrados'));
    }

    if (descripcion !== undefined) descuento.descripcion = descripcion;
    if (valorCuota !== undefined) descuento.valorCuota = valorCuota;
    if (estado !== undefined) descuento.estado = estado;

    await descuento.save();
    res.json(r(true, descuento));
  } catch (error) {
    res.status(500).json(r(false, null, error.message));
  }
};

// ============================================
// APROBAR DESCUENTO
// ============================================
exports.aprobarDescuento = async (req, res) => {
  try {
    const aprobadoPor = req.user?.email || 'sistema';
    const descuento = await DescuentoEmpleado.findById(req.params.id);

    if (!descuento) return res.status(404).json(r(false, null, 'Descuento no encontrado'));
    if (descuento.estado !== 'activo') {
      return res.status(400).json(r(false, null, 'Solo descuentos activos pueden aprobarse'));
    }

    descuento.aprobadoPor = aprobadoPor;
    descuento.fechaAprobacion = new Date();
    await descuento.save();

    res.json(r(true, descuento));
  } catch (error) {
    res.status(500).json(r(false, null, error.message));
  }
};

// ============================================
// CANCELAR DESCUENTO
// ============================================
exports.cancelarDescuento = async (req, res) => {
  try {
    const descuento = await DescuentoEmpleado.findById(req.params.id);
    if (!descuento) return res.status(404).json(r(false, null, 'Descuento no encontrado'));

    descuento.estado = 'cancelado';
    await descuento.save();
    res.json(r(true, descuento));
  } catch (error) {
    res.status(500).json(r(false, null, error.message));
  }
};

// ============================================
// PAUSAR / REANUDAR DESCUENTO
// ============================================
exports.cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body; // 'activo' o 'pausado'
    const descuento = await DescuentoEmpleado.findById(req.params.id);
    if (!descuento) return res.status(404).json(r(false, null, 'Descuento no encontrado'));

    if (!['activo', 'pausado'].includes(estado)) {
      return res.status(400).json(r(false, null, 'Estado inválido. Use activo o pausado'));
    }

    descuento.estado = estado;
    await descuento.save();
    res.json(r(true, descuento));
  } catch (error) {
    res.status(500).json(r(false, null, error.message));
  }
};

// ============================================
// RESUMEN DE DESCUENTOS POR EMPLEADO
// ============================================
exports.resumenEmpleado = async (req, res) => {
  try {
    const { email } = req.params;
    const activos = await DescuentoEmpleado.find({ email, estado: 'activo' });

    const resumen = {
      totalDescuentos: activos.length,
      totalPendiente: activos.reduce((sum, d) => sum + d.saldoPendiente, 0),
      totalCuotaMensual: activos.reduce((sum, d) => sum + d.getCuotaActual(), 0),
      descuentos: activos.map(d => ({
        id: d._id,
        tipo: d.tipo,
        descripcion: d.descripcion,
        cuotasRestantes: d.cuotasRestantes,
        valorCuota: d.valorCuota,
        saldoPendiente: d.saldoPendiente
      }))
    };

    res.json(r(true, resumen));
  } catch (error) {
    res.status(500).json(r(false, null, error.message));
  }
};
