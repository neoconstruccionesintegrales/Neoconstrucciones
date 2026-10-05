// controllers/porveedorController.js
const mongoose = require('mongoose');
const Proveedor = require('../models/Proveedor');
const FacturaCompra = require('../models/FacturaCompra');

// ==============================================================
// FUNCIÓN: Generar ID de proveedor
// ==============================================================
const generarIdProveedor = async () => {
  try {
    // Buscar el último proveedor por idProveedor
    const ultimo = await Proveedor.findOne(
      { idProveedor: { $regex: /^PROV-/ } },
      { idProveedor: 1 },
      { sort: { idProveedor: -1 } }
    );
    
    let numero = 1;
    if (ultimo && ultimo.idProveedor) {
      const partes = ultimo.idProveedor.split('-');
      if (partes.length === 2) {
        numero = parseInt(partes[1]) + 1;
      }
    }
    
    // Generar ID con 4 dígitos (PROV-0001, PROV-0002, ...)
    const nuevoId = `PROV-${String(numero).padStart(4, '0')}`;
    console.log(`📝 ID generado para nuevo proveedor: ${nuevoId}`);
    return nuevoId;
  } catch (error) {
    console.error('Error generando ID:', error);
    // Fallback: usar timestamp
    const fallbackId = `PROV-${Date.now().toString().slice(-6)}`;
    console.log(`⚠️ Usando ID de fallback: ${fallbackId}`);
    return fallbackId;
  }
};

// ==============================================================
// 1. OBTENER TODOS LOS PROVEEDORES
// ==============================================================
exports.getAllProveedores = async (req, res) => {
  try {
    const { estado, tipo, search } = req.query;
    
    let filtro = {};
    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipo = tipo;
    if (search) {
      filtro.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { nit: { $regex: search, $options: 'i' } },
        { idProveedor: { $regex: search, $options: 'i' } }
      ];
    }
    
    const proveedores = await Proveedor.find(filtro).sort({ nombre: 1 });
    res.json({ success: true, data: proveedores });
  } catch (error) {
    console.error('Error en getAllProveedores:', error);
    res.status(500).json({ success: false, error: 'Error al obtener proveedores', details: error.message });
  }
};

// ==============================================================
// 2. OBTENER PROVEEDOR POR ID
// ==============================================================
exports.getProveedorById = async (req, res) => {
  try {
    const { id } = req.params;
    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProveedor: id }] }
      : { idProveedor: id };
    
    const proveedor = await Proveedor.findOne(filtro);
    if (!proveedor) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }
    
    // Obtener estadísticas de compras
    const facturas = await FacturaCompra.find({ idProveedor: proveedor.idProveedor });
    const totalCompras = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
    const comprasPagadas = facturas.filter(f => f.estado === 'Pagada');
    const totalPagado = comprasPagadas.reduce((sum, f) => sum + (f.total || 0), 0);
    const comprasPendientes = facturas.filter(f => f.estado !== 'Pagada' && f.estado !== 'Anulada');
    const totalPendiente = comprasPendientes.reduce((sum, f) => sum + (f.total || 0), 0);
    
    res.json({
      success: true,
      data: {
        ...proveedor.toObject(),
        estadisticas: {
          totalCompras,
          totalPagado,
          totalPendiente,
          cantidadFacturas: facturas.length,
          ultimaCompra: facturas.length > 0 ? facturas[facturas.length - 1].fechaEmision : null
        }
      }
    });
  } catch (error) {
    console.error('Error en getProveedorById:', error);
    res.status(500).json({ success: false, error: 'Error al obtener proveedor', details: error.message });
  }
};

// ==============================================================
// 3. CREAR PROVEEDOR (CON ID GENERADO EN EL CONTROLADOR)
// ==============================================================
exports.createProveedor = async (req, res) => {
  try {
    const datos = req.body;
    
    console.log('📥 Datos recibidos:', datos);
    
    // Validar campos obligatorios
    if (!datos.nombre || !datos.nit) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nombre y NIT son obligatorios' 
      });
    }
    
    // Verificar que el NIT no esté duplicado
    const existente = await Proveedor.findOne({ nit: datos.nit });
    if (existente) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ya existe un proveedor con este NIT' 
      });
    }
    
    // 🔥 GENERAR ID AUTOMÁTICAMENTE
    const idProveedor = await generarIdProveedor();
    
    // Crear el nuevo proveedor con el ID generado
    const nuevoProveedor = new Proveedor({
      ...datos,
      idProveedor, // ID generado automáticamente
      creadoPor: req.user?.email || req.user?.nombre || 'Sistema',
      fechaRegistro: new Date()
    });
    
    console.log('💾 Guardando proveedor:', nuevoProveedor);
    
    await nuevoProveedor.save();
    
    res.status(201).json({ 
      success: true, 
      data: nuevoProveedor,
      message: 'Proveedor creado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error en createProveedor:', error);
    
    // Error de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        error: 'Error de validación',
        detalles: errores 
      });
    }
    
    // Error de duplicado (MongoDB)
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ 
        success: false, 
        error: `El ${campo} ya está registrado. Por favor verifica.` 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Error al crear proveedor', 
      details: error.message 
    });
  }
};

// ==============================================================
// 4. ACTUALIZAR PROVEEDOR
// ==============================================================
exports.updateProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;
    
    // No permitir actualizar el idProveedor
    delete datos.idProveedor;
    
    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProveedor: id }] }
      : { idProveedor: id };
    
    // Verificar que el NIT no esté duplicado en otro proveedor
    if (datos.nit) {
      const proveedorActual = await Proveedor.findOne(filtro);
      if (proveedorActual) {
        const existente = await Proveedor.findOne({ 
          nit: datos.nit,
          _id: { $ne: proveedorActual._id }
        });
        if (existente) {
          return res.status(400).json({ 
            success: false, 
            error: 'Ya existe otro proveedor con este NIT' 
          });
        }
      }
    }
    
    const proveedor = await Proveedor.findOneAndUpdate(
      filtro,
      { $set: datos },
      { new: true, runValidators: true }
    );
    
    if (!proveedor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Proveedor no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      data: proveedor,
      message: 'Proveedor actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error en updateProveedor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al actualizar proveedor', 
      details: error.message 
    });
  }
};

// ==============================================================
// 5. ELIMINAR PROVEEDOR
// ==============================================================
exports.deleteProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProveedor: id }] }
      : { idProveedor: id };
    
    // Verificar que no tenga facturas asociadas
    const proveedor = await Proveedor.findOne(filtro);
    if (!proveedor) {
      return res.status(404).json({ 
        success: false, 
        error: 'Proveedor no encontrado' 
      });
    }
    
    const facturas = await FacturaCompra.findOne({ idProveedor: proveedor.idProveedor });
    if (facturas) {
      return res.status(400).json({ 
        success: false,
        error: 'No se puede eliminar el proveedor porque tiene facturas asociadas' 
      });
    }
    
    await Proveedor.findOneAndDelete(filtro);
    
    res.json({ 
      success: true, 
      message: 'Proveedor eliminado correctamente' 
    });
  } catch (error) {
    console.error('Error en deleteProveedor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al eliminar proveedor', 
      details: error.message 
    });
  }
};

// ==============================================================
// 6. OBTENER PROVEEDORES ACTIVOS (Para dropdowns)
// ==============================================================
exports.getProveedoresActivos = async (req, res) => {
  try {
    const proveedores = await Proveedor.find({ estado: 'Activo' })
      .select('idProveedor nombre nit tipo')
      .sort({ nombre: 1 });
    
    res.json({ 
      success: true, 
      data: proveedores 
    });
  } catch (error) {
    console.error('Error en getProveedoresActivos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener proveedores activos' 
    });
  }
};

// ==============================================================
// 7. SINCronizar CONTADOR DE PROVEEDORES (Opcional)
// ==============================================================
exports.sincronizarContador = async (req, res) => {
  try {
    // Solo para mantener compatibilidad con la ruta
    res.json({ 
      success: true, 
      message: 'Contador sincronizado correctamente' 
    });
  } catch (error) {
    console.error('Error en sincronizarContador:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al sincronizar contador', 
      details: error.message 
    });
  }
};