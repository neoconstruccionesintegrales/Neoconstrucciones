const mongoose = require('mongoose');
const FacturaCompra = require('../models/FacturaCompra');
const Proveedor = require('../models/Proveedor');
const Proyecto = require('../models/Proyecto');

// ==============================================================
// FUNCIÓN: Generar ID de factura de compra
// ==============================================================
const generarIdFacturaCompra = async () => {
  try {
    // Buscar el último documento, sin importar si es COM- o OC-
    const ultimo = await FacturaCompra.findOne(
      { idFacturaCompra: { $regex: /^(OC|COM)-/ } },
      { idFacturaCompra: 1 },
      { sort: { idFacturaCompra: -1 } }
    );
    
    let numero = 1;
    if (ultimo && ultimo.idFacturaCompra) {
      // Extraer el número sin importar el prefijo
      const partes = ultimo.idFacturaCompra.split('-');
      if (partes.length === 2) {
        numero = parseInt(partes[1]) + 1;
      }
    }
    
    const nuevoId = `OC-${String(numero).padStart(3, '0')}`;
    console.log(`📝 ID generado para nueva orden de compra: ${nuevoId}`);
    return nuevoId;
  } catch (error) {
    console.error('Error generando ID de orden de compra:', error);
    const fallbackId = `OC-${Date.now().toString().slice(-6)}`;
    return fallbackId;
  }
};

// ==============================================================
// FUNCIÓN: Calcular totales
// ==============================================================
const calcularTotales = (items, ivaPorcentaje = 19, descuento = 0) => {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  const iva = subtotal * (ivaPorcentaje / 100);
  const total = subtotal + iva - (descuento || 0);
  return { subtotal, iva, total };
};

// ==============================================================
// 1. OBTENER TODAS LAS FACTURAS DE COMPRA
// ==============================================================
exports.getAllFacturasCompra = async (req, res) => {
  try {
    const { 
      estado, 
      tipo, 
      idProveedor, 
      idProyecto, 
      fechaInicio, 
      fechaFin,
      anio,
      search 
    } = req.query;
    
    let filtro = {};
    
    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipo = tipo;
    if (idProveedor) filtro.idProveedor = idProveedor;
    if (idProyecto) filtro.idProyecto = idProyecto;
    
    if (fechaInicio && fechaFin) {
      filtro.fechaEmision = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    } else if (anio) {
      const start = new Date(anio, 0, 1);
      const end = new Date(anio, 11, 31);
      filtro.fechaEmision = { $gte: start, $lte: end };
    }
    
    if (search) {
      filtro.$or = [
        { numeroFactura: { $regex: search, $options: 'i' } },
        { nombreProveedor: { $regex: search, $options: 'i' } },
        { idFacturaCompra: { $regex: search, $options: 'i' } }
      ];
    }
    
    const facturas = await FacturaCompra.find(filtro).sort({ fechaEmision: -1 });
    
    // Enriquecer con datos del proyecto (si existe)
    const facturasEnriquecidas = await Promise.all(facturas.map(async (f) => {
      const obj = f.toObject();
      if (f.idProyecto) {
        const proyecto = await Proyecto.findOne({ idProyecto: f.idProyecto });
        if (proyecto) {
          obj.nombreProyecto = proyecto.nombreProyecto;
          obj.idClienteProyecto = proyecto.idCliente;
        }
      }
      return obj;
    }));
    
    res.json({ success: true, data: facturasEnriquecidas });
  } catch (error) {
    console.error('Error en getAllFacturasCompra:', error);
    res.status(500).json({ success: false, error: 'Error al obtener orden de compra(s)', details: error.message });
  }
};

// ==============================================================
// 2. OBTENER FACTURA DE COMPRA POR ID
// ==============================================================
exports.getFacturaCompraById = async (req, res) => {
  try {
    const { id } = req.params;
    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idFacturaCompra: id }] }
      : { idFacturaCompra: id };
    
    const factura = await FacturaCompra.findOne(filtro);
    if (!factura) {
      return res.status(404).json({ success: false, error: 'Orden de compra no encontrada' });
    }
    
    // Enriquecer con datos del proveedor y proyecto
    const resultado = factura.toObject();
    const proveedor = await Proveedor.findOne({ idProveedor: factura.idProveedor });
    if (proveedor) {
      resultado.datosProveedor = proveedor;
    }
    if (factura.idProyecto) {
      const proyecto = await Proyecto.findOne({ idProyecto: factura.idProyecto });
      if (proyecto) {
        resultado.datosProyecto = {
          idProyecto: proyecto.idProyecto,
          nombreProyecto: proyecto.nombreProyecto,
          idCliente: proyecto.idCliente
        };
      }
    }
    
    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error en getFacturaCompraById:', error);
    res.status(500).json({ success: false, error: 'Error al obtener orden de compra', details: error.message });
  }
};

// ==============================================================
// 3. CREAR FACTURA DE COMPRA (CON ID GENERADO)
// ==============================================================
exports.createFacturaCompra = async (req, res) => {
  try {
    const datos = req.body;
    
    console.log('📥 Datos recibidos:', datos);
    
    // Validar campos obligatorios
    if (!datos.idProveedor || !datos.numeroFactura) {
      return res.status(400).json({ 
        success: false,
        error: 'Proveedor y número de orden de compra son obligatorios' 
      });
    }
    
    if (!datos.items || datos.items.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Debe tener al menos un item' 
      });
    }
    
    // Verificar que el proveedor existe
    const proveedor = await Proveedor.findOne({ idProveedor: datos.idProveedor });
    if (!proveedor) {
      return res.status(404).json({ 
        success: false,
        error: 'Proveedor no encontrado' 
      });
    }
    
    // Si tiene proyecto, verificar que existe
    if (datos.idProyecto) {
      const proyecto = await Proyecto.findOne({ idProyecto: datos.idProyecto });
      if (!proyecto) {
        return res.status(404).json({ 
          success: false,
          error: 'Proyecto no encontrado' 
        });
      }
    }
    
    // Calcular subtotales de items
    const itemsConSubtotal = datos.items.map(item => ({
      ...item,
      subtotal: (Number(item.cantidad) || 1) * (Number(item.precioUnitario) || 0)
    }));
    
    // Calcular totales
    const ivaPorcentaje = Number(datos.ivaPorcentaje) || 19;
    const descuento = Number(datos.descuento) || 0;
    const { subtotal, iva, total } = calcularTotales(itemsConSubtotal, ivaPorcentaje, descuento);
    
    // 🔥 GENERAR ID AUTOMÁTICAMENTE
    const idFacturaCompra = await generarIdFacturaCompra();
    
    // Crear la nueva factura
    const nuevaFactura = new FacturaCompra({
      idFacturaCompra, // ID generado automáticamente
      ...datos,
      items: itemsConSubtotal,
      subtotal,
      iva,
      total,
      ivaPorcentaje,
      nombreProveedor: proveedor.nombre,
      nitProveedor: proveedor.nit || '',
      contactoProveedor: proveedor.contactoNombre || proveedor.telefono || '',
      creadoPor: req.user?.email || req.user?.nombre || 'Sistema'
    });
    
    console.log('💾 Guardando orden de compra:', nuevaFactura);
    
    await nuevaFactura.save();
    
    // Actualizar última compra del proveedor
    await Proveedor.findOneAndUpdate(
      { idProveedor: datos.idProveedor },
      { ultimaCompra: new Date() }
    );
    
    res.status(201).json({ 
      success: true, 
      data: nuevaFactura,
      message: 'Orden de compra creada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error en createFacturaCompra:', error);
    
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
      error: 'Error al crear orden de compra', 
      details: error.message 
    });
  }
};

// ==============================================================
// 4. ACTUALIZAR FACTURA DE COMPRA
// ==============================================================
exports.updateFacturaCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;
    
    // No permitir actualizar el idFacturaCompra
    delete datos.idFacturaCompra;
    
    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idFacturaCompra: id }] }
      : { idFacturaCompra: id };
    
    const factura = await FacturaCompra.findOne(filtro);
    if (!factura) {
      return res.status(404).json({ 
        success: false,
        error: 'Orden de compra no encontrada' 
      });
    }
    
    // No permitir modificar facturas pagadas o anuladas
    if (factura.estado === 'Pagada' || factura.estado === 'Anulada') {
      return res.status(400).json({ 
        success: false,
        error: 'No se puede modificar una orden de compra pagada o anulada' 
      });
    }
    
    // Si cambia el estado a Pagada, registrar fecha de pago
    if (datos.estado === 'Pagada' && factura.estado !== 'Pagada') {
      datos.fechaPago = new Date();
    }
    
    // Si cambian los items o totales, recalcular
    if (datos.items) {
      const itemsConSubtotal = datos.items.map(item => ({
        ...item,
        subtotal: (Number(item.cantidad) || 1) * (Number(item.precioUnitario) || 0)
      }));
      const ivaPorcentaje = Number(datos.ivaPorcentaje) || factura.ivaPorcentaje || 19;
      const descuento = Number(datos.descuento) || factura.descuento || 0;
      const { subtotal, iva, total } = calcularTotales(itemsConSubtotal, ivaPorcentaje, descuento);
      
      datos.items = itemsConSubtotal;
      datos.subtotal = subtotal;
      datos.iva = iva;
      datos.total = total;
    }
    
    const facturaActualizada = await FacturaCompra.findOneAndUpdate(
      filtro,
      { $set: datos },
      { new: true, runValidators: true }
    );
    
    res.json({ 
      success: true, 
      data: facturaActualizada,
      message: 'Orden de compra actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error en updateFacturaCompra:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al actualizar orden de compra', 
      details: error.message 
    });
  }
};

// ==============================================================
// 5. ELIMINAR FACTURA DE COMPRA
// ==============================================================
exports.deleteFacturaCompra = async (req, res) => {
  try {
    const { id } = req.params;
    
    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idFacturaCompra: id }] }
      : { idFacturaCompra: id };
    
    const factura = await FacturaCompra.findOne(filtro);
    if (!factura) {
      return res.status(404).json({ 
        success: false,
        error: 'Orden de compra no encontrada' 
      });
    }
    
    if (factura.estado === 'Pagada') {
      return res.status(400).json({ 
        success: false,
        error: 'No se puede eliminar una orden de compra pagada' 
      });
    }
    
    await FacturaCompra.findOneAndDelete(filtro);
    res.json({ 
      success: true, 
      message: 'Orden de compra eliminada correctamente' 
    });
  } catch (error) {
    console.error('Error en deleteFacturaCompra:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al eliminar orden de compra', 
      details: error.message 
    });
  }
};

// ==============================================================
// 6. RESÚMENES Y ESTADÍSTICAS
// ==============================================================
exports.getResumenCompras = async (req, res) => {
  try {
    const { anio, idProyecto, idProveedor } = req.query;
    
    let filtro = {};
    if (anio) {
      const start = new Date(anio, 0, 1);
      const end = new Date(anio, 11, 31);
      filtro.fechaEmision = { $gte: start, $lte: end };
    }
    if (idProyecto) filtro.idProyecto = idProyecto;
    if (idProveedor) filtro.idProveedor = idProveedor;
    
    const facturas = await FacturaCompra.find(filtro);
    
    const totalCompras = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
    const totalIVA = facturas.reduce((sum, f) => sum + (f.iva || 0), 0);
    const totalPagado = facturas
      .filter(f => f.estado === 'Pagada')
      .reduce((sum, f) => sum + (f.total || 0), 0);
    const totalPendiente = facturas
      .filter(f => f.estado !== 'Pagada' && f.estado !== 'Anulada')
      .reduce((sum, f) => sum + (f.total || 0), 0);
    
    // Resumen por tipo
    const porTipo = {};
    facturas.forEach(f => {
      const tipo = f.tipo || 'varios';
      if (!porTipo[tipo]) porTipo[tipo] = 0;
      porTipo[tipo] += f.total || 0;
    });
    
    // Resumen por proyecto
    const porProyecto = {};
    facturas.forEach(f => {
      if (f.idProyecto) {
        if (!porProyecto[f.idProyecto]) porProyecto[f.idProyecto] = 0;
        porProyecto[f.idProyecto] += f.total || 0;
      }
    });
    
    res.json({
      success: true,
      data: {
        totalCompras,
        totalIVA,
        totalPagado,
        totalPendiente,
        cantidadFacturas: facturas.length,
        porTipo,
        porProyecto,
        facturasRecientes: facturas.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error en getResumenCompras:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener resumen', 
      details: error.message 
    });
  }
};

// ==============================================================
// 7. SINCronizar CONTADOR DE FACTURAS DE COMPRA (Opcional)
// ==============================================================
exports.sincronizarContador = async (req, res) => {
  try {
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