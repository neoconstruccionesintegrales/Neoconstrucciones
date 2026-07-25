const mongoose = require('mongoose');
const Proyecto = require('../models/Proyecto');
const Cotizacion = require('../models/Cotizacion');
const Cliente = require('../models/clientes');
const Factura = require('../models/Factura');
const Contador = require('../models/Contador');

// ============================================
// 1. CREAR PROYECTO (MANUAL - desde modal)
// ============================================
exports.crearProyecto = async (req, res) => {
  try {
    const {
      idCotizacion,
      idCliente,
      idSede,
      nombreProyecto,
      fechaInicio,
      presupuestoTotal,
      seguimiento,
      tieneHitos,
      estado,
      tipoPago,
      metodoPago
    } = req.body;

    if (!nombreProyecto || nombreProyecto.trim() === '') {
      return res.status(400).json({ success: false, message: "El nombre del proyecto es obligatorio." });
    }
    if (!idCliente) {
      return res.status(400).json({ success: false, message: "Debes seleccionar un cliente." });
    }

    let cotizacionBase = null;
    if (idCotizacion && idCotizacion !== '') {
      cotizacionBase = await Cotizacion.findOne({
        idCotizacion: idCotizacion,
        estado_general: 'Aprobada'
      });
      if (!cotizacionBase) {
        return res.status(404).json({ success: false, message: "Cotizacion no encontrada o no esta aprobada." });
      }
    }

    const count = await Proyecto.countDocuments();
    const consecutivo = (count + 1).toString().padStart(3, '0');
    const idProyecto = `PRY-${consecutivo}`;

    const cliente = await Cliente.findOne({ idCliente: idCliente });

    let nombreSede = 'Principal';
    let direccionSede = cliente ? cliente.direccion : '';
    const sedeId = idSede || `${idCliente}-PRINCIPAL`;

    if (!String(sedeId).includes('PRINCIPAL') && cliente && cliente.sedes) {
      const sedeData = cliente.sedes.find(s => s.id === sedeId);
      if (sedeData) {
        nombreSede = sedeData.nombreSede;
        direccionSede = sedeData.direccion || direccionSede;
      }
    }

    const datosProyecto = {
      idProyecto,
      idCotizacion: idCotizacion || null,
      idCliente,
      idSede: sedeId,
      nombreEmp: cotizacionBase ? cotizacionBase.nombreEmp : (cliente ? cliente.nombreEmp : ''),
      nombreSede: nombreSede,
      direccionSede: direccionSede,
      nombreProyecto: nombreProyecto.trim().toUpperCase(),
      presupuestoTotal: Number(presupuestoTotal) || (cotizacionBase ? cotizacionBase.total : 0),
      anticipo: cotizacionBase ? cotizacionBase.anticipo : 0,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
      seguimiento: seguimiento || 'Iniciando proyecto...',
      porcentajeAvance: 0,
      estado: estado || 'Creado',
      tipoPago: tipoPago || 'anticipo_final',
      tieneHitos: tieneHitos || false,
      cotizacionesAdicionales: [],
      facturas: [],
      valorTotalEjecutado: 0,
      valorTotalFacturado: 0,
      creadoPor: options.creadoPor || 'Sistema',
      items: cotizacionBase ? cotizacionBase.items : []
    };

    // Generar hitos si aplica
    if (datosProyecto.tieneHitos) {
      const { generarHitosPorTipo } = require('../utils/hitosHelper');
      const tipoPagoCalc = tipoPago || 'anticipo_final';
      datosProyecto.hitos = generarHitosPorTipo(tipoPagoCalc, datosProyecto.presupuestoTotal, null);
      datosProyecto.tieneHitos = datosProyecto.hitos.length > 1;
    }

    const nuevoProyecto = new Proyecto(datosProyecto);
    await nuevoProyecto.save();

    res.status(201).json({
      success: true,
      message: `Proyecto ${idProyecto} creado exitosamente`,
      data: nuevoProyecto
    });

  } catch (error) {
    console.error("--- ERROR AL CREAR PROYECTO ---", error);
    res.status(500).json({ success: false, message: "Error al crear proyecto", error: error.message });
  }
};

// ============================================
// 2. OBTENER TODOS LOS PROYECTOS
// ============================================
exports.obtenerProyectos = async (req, res) => {
  try {
    const proyectos = await Proyecto.find().sort({ createdAt: -1 });
    res.json({ success: true, data: proyectos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener proyectos", error: error.message });
  }
};

// ============================================
// 3. OBTENER PROYECTO POR ID (con detalle completo)
// ============================================

exports.obtenerProyectoPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProyecto: id }] }
      : { idProyecto: id };

    const proyecto = await Proyecto.findOne(filtro).lean();

    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    // Traer cotizacion base
    let cotizacionBase = null;
    if (proyecto.idCotizacion) {
      cotizacionBase = await Cotizacion.findOne({
        idCotizacion: proyecto.idCotizacion
      }).lean();
    }

    // NUEVO: Popular cotizaciones adicionales con datos completos
    let cotizacionesAdicionalesCompletas = [];
    if (proyecto.cotizacionesAdicionales && proyecto.cotizacionesAdicionales.length > 0) {
      const idsCotizaciones = proyecto.cotizacionesAdicionales.map(c => c.idCotizacion);
      
      const cotizacionesDB = await Cotizacion.find({
        idCotizacion: { $in: idsCotizaciones }
      }).lean();

      // Merge: datos del proyecto + datos reales de la BD
      cotizacionesAdicionalesCompletas = proyecto.cotizacionesAdicionales.map(cotRef => {
        const datosReales = cotizacionesDB.find(c => c.idCotizacion === cotRef.idCotizacion);
        return {
          ...cotRef,
          valor: datosReales?.total || cotRef.valor || 0,
          total: datosReales?.total || cotRef.total || 0,
          descripcion: datosReales?.notas || datosReales?.notasLegales || cotRef.descripcion || '',
          notas: datosReales?.notas || '',
          estado: datosReales?.estado_general || cotRef.estado || 'Pendiente',
          fecha: datosReales?.fecha || datosReales?.createdAt || cotRef.fecha || cotRef.fechaAgregado,
          items: datosReales?.items || [],
          subtotal: datosReales?.subtotal || 0,
          iva: datosReales?.iva || 0,
          metodoPago: datosReales?.metodoPago || '',
          tipoPago: datosReales?.tipoPago || '',
          esCotizacionAdicional: true,
          historialVersiones: datosReales?.historialVersiones || []
        };
      });
    }

    // Traer TODAS las facturas del proyecto desde la colección Factura
    const todasLasFacturasDB = await Factura.find({ 
      idProyecto: proyecto.idProyecto 
    }).sort({ fechaEmision: -1 }).lean();

    // Traer facturas de cotizaciones adicionales por idCotizacionAdicional
    const idsCotAdicionales = proyecto.cotizacionesAdicionales
      ?.map(c => c.idCotizacion)
      .filter(Boolean) || [];

    let facturasAdicionales = [];
    if (idsCotAdicionales.length > 0) {
      facturasAdicionales = await Factura.find({
        idCotizacionAdicional: { $in: idsCotAdicionales }
      }).sort({ fechaEmision: -1 }).lean();
    }

    // Mergear TODO en un solo array con formato unificado
    const facturasUnificadas = [
      ...todasLasFacturasDB.map(f => ({
        idFactura: f.idFactura,
        valor: f.netoACobrar || f.subtotal || 0,
        fecha: f.fechaEmision,
        estado: f.estado,
        concepto: f.esFacturaAdicional 
          ? `Adicional - ${f.idCotizacionAdicional}` 
          : (f.activaProyecto ? `Anticipo - ${f.idFactura}` : `Factura ${f.idFactura}`),
        metodoPago: f.metodoPago,
        iva: f.iva || 0,
        retencion: f.retencion || 0,
        netoACobrar: f.netoACobrar || 0,
        totalConIva: f.totalConIva || 0,
        esFacturaAdicional: f.esFacturaAdicional || false,
        idCotizacionAdicional: f.idCotizacionAdicional || null
      }))
    ];

    res.json({
      success: true,
      data: {
        ...proyecto,
        cotizacionBaseDetalle: cotizacionBase,
        cotizacionesAdicionales: cotizacionesAdicionalesCompletas,
        facturasIndependientes: todasLasFacturasDB,
        facturasAdicionales: facturasAdicionales,
        todasLasFacturas: facturasUnificadas,
        facturas: facturasUnificadas  // Reemplazar array embebido con datos reales
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener proyecto", error: error.message });
  }
};

// ============================================
// 4. ACTUALIZAR PROYECTO
// ============================================
exports.actualizarProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const camposPermitidos = [
      'nombreProyecto', 'seguimiento', 'porcentajeAvance',
      'fechaInicio', 'fechaFin', 'estado', 'presupuestoTotal',
      'tieneHitos', 'hitos', 'anticipo', 'tipoPago'
    ];
    const actualizaciones = {};

    camposPermitidos.forEach(campo => {
      if (req.body[campo] !== undefined) {
        actualizaciones[campo] = req.body[campo];
      }
    });

    if (req.body.hitos && Array.isArray(req.body.hitos)) {
      const pesoTotal = req.body.hitos.reduce((acc, h) => acc + (h.porcentajePeso || 0), 0);
      if (pesoTotal > 0) {
        const avance = req.body.hitos.reduce((acc, h) => {
          return acc + (h.completado ? (h.porcentajePeso || 0) : 0);
        }, 0);
        actualizaciones.porcentajeAvance = Math.min(100, Math.round((avance / pesoTotal) * 100));
      }
    }

    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProyecto: id }] }
      : { idProyecto: id };

    const actualizado = await Proyecto.findOneAndUpdate(filtro, actualizaciones, { new: true });
    if (!actualizado) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    res.json({ success: true, message: "Proyecto actualizado", data: actualizado });
  } catch (error) {
    console.error("--- ERROR AL ACTUALIZAR PROYECTO ---", error);
    res.status(500).json({ success: false, message: "Error al actualizar", error: error.message });
  }
};

// ============================================
// 5. ELIMINAR PROYECTO
// ============================================
exports.eliminarProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProyecto: id }] }
      : { idProyecto: id };

    const proyecto = await Proyecto.findOne(filtro);
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    // Validar facturas pagadas del proyecto principal
    const facturasPagadasProyecto = await Factura.find({
      idProyecto: proyecto.idProyecto,
      estado: 'Pagada'
    });

    // Validar facturas pagadas de cotizaciones adicionales
    let facturasPagadasAdicionales = [];
    if (idsCotAdicionales.length > 0) {
      facturasPagadasAdicionales = await Factura.find({
        idCotizacionAdicional: { $in: idsCotAdicionales },
        estado: 'Pagada'
      });
    }

    const totalFacturasPagadas = facturasPagadasProyecto.length + facturasPagadasAdicionales.length;
    if (totalFacturasPagadas > 0) {
      const detalles = [];
      facturasPagadasProyecto.forEach(f => detalles.push(`${f.idFactura} (proyecto)`));
      facturasPagadasAdicionales.forEach(f => detalles.push(`${f.idFactura} (cot. adicional)`));
      return res.status(403).json({
        success: false,
        message: `No se puede eliminar: el proyecto tiene ${totalFacturasPagadas} factura(s) pagada(s).`,
        facturasPagadas: detalles
      });
    }

    // Eliminar facturas no pagadas asociadas
    await Factura.deleteMany({ idProyecto: proyecto.idProyecto, estado: { $ne: 'Pagada' } });

    // Eliminar cotizaciones adicionales asociadas
    if (idsCotAdicionales.length > 0) {
      await Cotizacion.deleteMany({ idCotizacion: { $in: idsCotAdicionales }, estado_general: { $ne: 'Aprobada' } });
    }

    // Eliminar proyecto
    await Proyecto.findOneAndDelete(filtro);

    res.json({
      success: true,
      message: "Proyecto y datos asociados eliminados correctamente"
    });

  } catch (error) {
    console.error("--- ERROR AL ELIMINAR PROYECTO ---", error);
    res.status(500).json({ success: false, message: "Error al eliminar", error: error.message });
  }
};

// ============================================
// 6. AGREGAR COTIZACION ADICIONAL A PROYECTO
// ============================================

exports.agregarCotizacionAdicional = async (req, res) => {
  try {
    const { id } = req.params;
    const { idCotizacion, valor, descripcion, items, total, estado, notas, tipoPago, metodoPago } = req.body;

    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProyecto: id }] }
      : { idProyecto: id };

    const proyecto = await Proyecto.findOne(filtro);
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    // Guardar datos enriquecidos para mostrar en detalle
    proyecto.cotizacionesAdicionales.push({
      idCotizacion,
      valor: Number(valor) || Number(total) || 0,
      total: Number(total) || Number(valor) || 0,
      descripcion: descripcion || notas || '',
      notas: notas || '',
      fechaAgregado: new Date(),
      fecha: new Date(),
      estado: estado || 'Pendiente',
      tipoPago: tipoPago || 'anticipo_final',
      metodoPago: metodoPago || 'Transferencia Bancaria'
    });

    await proyecto.save();
    res.json({ success: true, message: "Cotizacion adicional agregada", data: proyecto });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message });
  }
};

// ============================================
// 7. CREAR FACTURA INDEPENDIENTE PARA PROYECTO
// ============================================

exports.crearFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      metodoPago,
      items,
      subtotal,
      notas,
      notasLegales,
      notasAdicionales,
      fechaEmision,
      fechaVencimiento,
      idCotizacion
    } = req.body;

    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProyecto: id }] }
      : { idProyecto: id };

    const proyecto = await Proyecto.findOne(filtro);
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    const cliente = await Cliente.findOne({ idCliente: proyecto.idCliente });

    // Generar ID de factura con contador
    const siguienteNumero = await Contador.obtenerSiguiente('facturas');
    const idFactura = `FAC-${String(siguienteNumero).padStart(3, '0')}`;

    // Datos de sede
    let nombreSede = proyecto.nombreSede || 'Principal';
    let direccionSede = proyecto.direccionSede || '';
    let correoCliente = '';
    let contactoCliente = '';
    let nitCliente = '';

    if (cliente) {
      nitCliente = cliente.nit || '';
      correoCliente = cliente.correo || '';
      contactoCliente = cliente.telefono || cliente.celular || '';
      if (String(proyecto.idSede).includes('PRINCIPAL')) {
        direccionSede = cliente.direccion || '';
      } else if (cliente.sedes) {
        const sedeData = cliente.sedes.find(s => s.id === proyecto.idSede);
        if (sedeData) {
          nombreSede = sedeData.nombreSede || nombreSede;
          direccionSede = sedeData.direccion || direccionSede;
          correoCliente = sedeData.correoEnc || correoCliente;
          contactoCliente = sedeData.celular || contactoCliente;
        }
      }
    }

    // Preparar items
    const itemsFactura = (items || []).map(item => ({
      idServicio: item.idServicio || '',
      nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
      descripcion: item.descripcion || '',
      cantidad: item.cantidad || 1,
      precioUnitario: item.precioUnitario || 0,
      unidad: item.unidad || 'und',
      subtotal: item.subtotal || 0
    }));

    const subtotalCalc = Number(subtotal) || proyecto.presupuestoTotal || 0;

    // Verificar si es factura de cotizacion adicional
    const esFacturaAdicional = !!idCotizacion;

    // Calcular nota de pagos pendientes
    let notaPagosPendientes = '';
    if (esFacturaAdicional) {
      const cotizacionAdic = await Cotizacion.findOne({ idCotizacion: idCotizacion });
      if (cotizacionAdic) {
        const facturasExistentes = await Factura.countDocuments({ idCotizacionAdicional: idCotizacion });
        const totalEsperado = cotizacionAdic.tipoPago === 'unico' ? 1 : 
                             cotizacionAdic.tipoPago === 'anticipo_final' ? 2 : 3;
        const faltantes = totalEsperado - facturasExistentes - 1; // -1 porque estamos creando una ahora
        if (faltantes > 0) {
          notaPagosPendientes = `Faltan ${faltantes} pago(s) para completar factura`;
        }
      }
    }

    // Crear factura con TODOS los campos, activaProyecto = false
    const facturaData = {
      idFactura,
      idProyecto: proyecto.idProyecto,
      idCotizacion: idCotizacion || proyecto.idCotizacion,
      idCliente: proyecto.idCliente,
      nombreEmpresa: proyecto.nombreEmp || (cliente ? cliente.nombreEmp : ''),
      nombreSede,
      direccionSede,
      nitCliente,
      contactoCliente,
      correoCliente,
      nombreProyecto: proyecto.nombreProyecto,
      datosEmisor: {
        razonSocial: 'Neoconstrucciones Integrales SAS',
        nit: '901.421.096-1',
        direccion: 'Calle 11c #80B 70',
        celular: '3017223223',
        correoElectronico: 'neoconstruccionesintegrales@gmail.com'
      },
      metodoPago: metodoPago || 'Transferencia Bancaria',
      fechaEmision: fechaEmision ? new Date(fechaEmision) : new Date(),
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      items: itemsFactura,
      subtotal: subtotalCalc,
      anticipoPorcentaje: 40,
      saldoPorcentaje: 60,
      ivaPorcentaje: 19,
      retencionPorcentaje: 2,
      resupuestoTotalProyecto: proyecto.presupuestoTotal || 0, 
      notas: notas || notaPagosPendientes || '',
      notasLegales: notasLegales || '',
      notasAdicionales: notasAdicionales || '',
      estado: 'Pendiente de Anticipo',
      esFacturaAdicional,
      idCotizacionAdicional: idCotizacion || null,
      activaProyecto: false, // NO activa proyecto porque ya esta activo
      creadoPor: req.user ? req.user.email : 'Sistema'
    };

    const nuevaFactura = new Factura(facturaData);
    await nuevaFactura.save();

    // Agregar referencia al proyecto
    proyecto.facturas.push({
  idFactura: nuevaFactura.idFactura,
  valor: nuevaFactura.netoACobrar,
  fecha: nuevaFactura.fechaEmision,
  estado: nuevaFactura.estado,
  concepto: esFacturaAdicional ? `Factura Adicional - ${idCotizacion}` : `Factura ${idFactura}`,
  metodoPago: nuevaFactura.metodoPago,
  iva: nuevaFactura.iva,
  retencion: nuevaFactura.retencion,
  netoACobrar: nuevaFactura.netoACobrar,
  esFacturaAdicional,
  idCotizacionAdicional: idCotizacion || null,
  //Items para generar facturas de saldo
  items: itemsFactura.map(item => ({
    idServicio: item.idServicio || '',
    nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
    descripcion: item.descripcion || '',
    cantidad: item.cantidad || 1,
    precioUnitario: item.precioUnitario || 0,
    unidad: item.unidad || 'und',
    subtotal: item.subtotal || 0
  }))
});

    await proyecto.save();

    res.status(201).json({
      success: true,
      message: `Factura ${idFactura} creada exitosamente`,
      data: nuevaFactura
    });

  } catch (error) {
    console.error("Error al crear factura:", error);
    res.status(500).json({ success: false, message: "Error al crear factura", error: error.message });
  }
};

// ============================================
// 8. OBTENER FACTURAS DE UN PROYECTO
// ============================================

exports.obtenerFacturasProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const facturas = await Factura.find({ idProyecto: id }).sort({ fechaEmision: -1 });
    res.json({ success: true, data: facturas });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message });
  }
};

// ============================================
// 9. OBTENER TODAS LAS FACTURAS
// ============================================
exports.obtenerTodasFacturas = async (req, res) => {
  try {
    const facturas = await Factura.find().sort({ fechaEmision: -1 });
    res.json({ success: true, data: facturas });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message });
  }
};

// ============================================
// 10. OBTENER FACTURA POR ID
// ============================================
exports.obtenerFacturaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const factura = await Factura.findOne({
      $or: [{ _id: id }, { idFactura: id }]
    });
    if (!factura) {
      return res.status(404).json({ success: false, message: "Factura no encontrada" });
    }
    res.json({ success: true, data: factura });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message });
  }
};

// ============================================
// 11. ACTUALIZAR ESTADO DE FACTURA
// ============================================
exports.actualizarEstadoFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const factura = await Factura.findOne({ idFactura: id });
    if (!factura) {
      return res.status(404).json({ success: false, message: "Factura no encontrada" });
    }

    // Estado hitos
    let hitoCompletado = null;
    let siguienteHito = null;

    const estadosValidos = ['Pendiente de Anticipo', 'Anticipo ya Pagado', 'Pendiente de Saldo',  'Pendiente de 2da Etapa',  'Pagada', 'Anulada', 'Vencido'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado no valido" });
    }

    // Guardar estado anterior para logica posterior
    const estadoAnterior = factura.estado;

    // ==========================================================
    // NUEVO: Si es ANULADA, liberar hitos y validar
    // ==========================================================
    if (estado === 'Anulada') {
      if (estadoAnterior === 'Pagada') {
        return res.status(403).json({ 
          success: false, 
          message: "No se puede anular una factura pagada. Use nota crédito." 
        });
      }

      console.log(`[ANULAR-VIA-ESTADO] Anulando ${id}, proyecto: ${factura.idProyecto}`);

      if (factura.idProyecto) {
        const db = mongoose.connection.db;
        const proyectosCollection = db.collection('proyectos');

        // A. Liberar hitos cubiertos por saldo
        const resultSaldo = await proyectosCollection.updateOne(
          { idProyecto: factura.idProyecto },
          {
            $set: {
              "hitos.$[elem].cubiertoPorSaldo": false,
              "hitos.$[elem].idFacturaSaldo": null,
              "hitos.$[elem].facturaGenerada": false,
              "hitos.$[elem].completado": false,
              "hitos.$[elem].fechaCompletado": null,
              "hitos.$[elem].idFactura": null
            }
          },
          { arrayFilters: [{ "elem.idFacturaSaldo": id }] }
        );
        console.log('[ANULAR-VIA-ESTADO] Hitos liberados por idFacturaSaldo:', resultSaldo.modifiedCount);

        // B. Liberar hitos con factura normal
        const resultNormal = await proyectosCollection.updateOne(
          { idProyecto: factura.idProyecto },
          {
            $set: {
              "hitos.$[elem].facturaGenerada": false,
              "hitos.$[elem].completado": false,
              "hitos.$[elem].fechaCompletado": null,
              "hitos.$[elem].idFactura": null,
              "hitos.$[elem].cubiertoPorSaldo": false,
              "hitos.$[elem].idFacturaSaldo": null
            }
          },
          { arrayFilters: [{ "elem.idFactura": id }] }
        );
        console.log('[ANULAR-VIA-ESTADO] Hitos liberados por idFactura:', resultNormal.modifiedCount);

        // C. Actualizar estado en array embebido del proyecto
        await proyectosCollection.updateOne(
          { idProyecto: factura.idProyecto, "facturas.idFactura": id },
          { $set: { "facturas.$.estado": "Anulada" } }
        );
      }

      factura.estado = 'Anulada';
      await factura.save();

      return res.json({ 
        success: true, 
        message: `Factura ${id} anulada. Hitos liberados y habilitados para nueva facturación.`,
        data: factura
      });
    }
    // ==========================================================
    // FIN BLOQUE ANULACION
    // ==========================================================

    // Transicion de estado normal (anticipo, pagada, etc.)
    if (estado === 'Anticipo ya Pagado' && factura.estado === 'Pendiente de Anticipo') {
      factura.marcarAnticipoPagado();
    } else if (estado === 'Pagada') {
      factura.marcarPagada();
    } else if (estado === 'Vencido') {
      factura.marcarVencido();
    } else {
      factura.estado = estado;
    }

    await factura.save();

    // Si se marca como Pagada, procesar hitos
    if (estado === 'Pagada' && estadoAnterior !== 'Pagada' && factura.idProyecto) {
      const proyecto = await Proyecto.findOne({ idProyecto: factura.idProyecto });
      
      if (proyecto && proyecto.hitos) {
        let hitosModificados = false;

        // CASO 1: Factura de saldo con hitos cubiertos
        if (factura.hitosCubiertos?.length > 0) {
          factura.hitosCubiertos.forEach(idHito => {
            const h = proyecto.hitos.find(h => h.idHito === idHito);
            if (h && !h.completado) {
              h.completado = true;
              h.fechaCompletado = new Date();
              hitosModificados = true;
            }
          });
          if (hitosModificados) {
            console.log(`Hitos ${factura.hitosCubiertos.join(', ')} completados por pago de factura de saldo ${factura.idFactura}`);
          }
        }
        // CASO 2: Factura normal de hito
        else {
          const hito = proyecto.obtenerHitoPorFactura(factura.idFactura);
          if (hito && !hito.completado) {
            const resultado = proyecto.completarHito(hito.idHito, factura.idFactura);
            if (resultado.success) {
              hitoCompletado = resultado.hito;
              siguienteHito = proyecto.obtenerSiguienteHitoPendiente();
              hitosModificados = true;
              console.log(`Hito ${hito.idHito} completado automaticamente por pago de factura ${factura.idFactura}`);
            }
          }
        }

        if (hitosModificados) {
          proyecto.markModified('hitos');
          await proyecto.save();
        }
      }
    }
    
    // Activar proyecto SOLO si la factura tiene activaProyecto = true
    const esFacturaAdicional = factura.esFacturaAdicional === true;
    
    if ((estado === 'Pagada' || estado === 'Anticipo ya Pagado') && 
        factura.activaProyecto === true && 
        !esFacturaAdicional) {
      
      const proyecto = await Proyecto.findOne({ idProyecto: factura.idProyecto });
      if (proyecto && proyecto.estado !== 'Iniciado') {
        proyecto.estado = 'Iniciado';
        proyecto.fechaActivacion = new Date();
        await proyecto.save();
        console.log('Proyecto activado:', proyecto.idProyecto);
      }

      if (factura.idCotizacion) {
        const cotizacion = await Cotizacion.findOne({ idCotizacion: factura.idCotizacion });
        if (cotizacion) {
          cotizacion.proyectoActivo = true;
          await cotizacion.save();
          console.log('Cotizacion actualizada - proyectoActivo: true');
        }
      }
    }

       // ==========================================================
    // VERIFICAR SI PROYECTO DEBE FINALIZAR (ambas condiciones)
    // ==========================================================
    if ((estado === 'Pagada' || estado === 'Anticipo ya Pagado') && 
        factura.idProyecto && 
        !esFacturaAdicional) {
      
      const proyecto = await Proyecto.findOne({ idProyecto: factura.idProyecto });
      
      if (proyecto && proyecto.estado !== 'Finalizado') {
        
        // CONDICION 1: Consultar COLECCION REAL de facturas (no el array embebido)
        const facturasBaseReales = await Factura.find({
          idProyecto: factura.idProyecto,
          esFacturaAdicional: { $ne: true },
          idCotizacionAdicional: null
        });
        
        const facturasPendientes = facturasBaseReales.filter(
          f => f.estado !== 'Pagada' && f.estado !== 'Anulada'
        );
        const todasFacturasPagadas = facturasPendientes.length === 0;
        
        // CONDICION 2: Avance al 100%
        const avanceCompleto = proyecto.porcentajeAvance === 100;
        
        console.log(`[FINALIZAR] Proyecto ${proyecto.idProyecto} - Facturas reales pendientes: ${facturasPendientes.length}, Avance: ${proyecto.porcentajeAvance}%`);
        
        if (todasFacturasPagadas && avanceCompleto) {
          proyecto.estado = 'Finalizado';
          proyecto.fechaFin = new Date();
          proyecto.seguimiento = 'Proyecto finalizado. Todos los hitos completados y facturas pagadas.';
          await proyecto.save();
          console.log(`[FINALIZAR] Proyecto ${proyecto.idProyecto} FINALIZADO automaticamente`);
        }
      }
    }

    // NUEVO: Si es factura adicional y se marca como Pagada...
    if (esFacturaAdicional && estado === 'Pagada') {
      // ... (tu codigo existente)
    }

    // Actualizar factura en el array del proyecto
    await Proyecto.updateOne(
      {
        idProyecto: factura.idProyecto,
        "facturas.idFactura": factura.idFactura
      },
      {
        $set: {
          "facturas.$.estado": estado,
          ...(estado === 'Pagada' || estado === 'Anticipo ya Pagado' ? {
            estado: factura.activaProyecto ? 'Iniciado' : undefined
          } : {})
        }
      }
    );

    res.json({ 
      success: true, 
      message: "Estado actualizado", 
      data: factura,
      ...(hitoCompletado ? {
        hitoCompletado: hitoCompletado,
        siguienteHito: siguienteHito,
        mensajeHito: `Hito ${hitoCompletado.nombre} completado. ${siguienteHito ? 'Siguiente: ' + siguienteHito.nombre : 'Todos los hitos completados.'}`
      } : {})
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message || "Error" });
  }
};

// ============================================
// 12. ELIMINAR FACTURA
// ============================================

exports.eliminarFactura = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar primero, luego validar, luego eliminar
    const factura = await Factura.findOne({ idFactura: id });

    if (!factura) {
      return res.status(404).json({ success: false, message: "Factura no encontrada" });
    }

    if (factura.estado === 'Pagada') {
      return res.status(403).json({ success: false, message: "No se puede eliminar una factura pagada" });
    }

    // Eliminar referencia del proyecto
    await Proyecto.updateOne(
      { idProyecto: factura.idProyecto },
      { $pull: { facturas: { idFactura: factura.idFactura } } }
    );

    // Eliminar la factura
    await Factura.findOneAndDelete({ idFactura: id });

    res.json({ success: true, message: "Factura eliminada" });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error", error: error.message });
  }
};

// ============================================
// 12.1 ANULAR FACTURA
// ============================================

exports.anularFactura = async (req, res) => {
  try {
    const { idFactura } = req.params;
    
    const factura = await Factura.findOne({ idFactura });
    if (!factura) {
      return res.status(404).json({ success: false, message: "Factura no encontrada" });
    }

    if (factura.estado === 'Pagada') {
      return res.status(403).json({ 
        success: false, 
        message: "No se puede anular una factura pagada. Use nota crédito." 
      });
    }

    console.log(`[ANULAR] Procesando ${idFactura}, proyecto: ${factura.idProyecto}`);

    if (factura.idProyecto) {
      // ==========================================================
      // PASO 1: Liberar hitos que esta factura de SALDO cubría
      // ==========================================================
      const resultadoSaldo = await Proyecto.updateOne(
        { idProyecto: factura.idProyecto },
        {
          $set: {
            "hitos.$[elem].cubiertoPorSaldo": false,
            "hitos.$[elem].idFacturaSaldo": null,
            "hitos.$[elem].facturaGenerada": false,
            "hitos.$[elem].completado": false,
            "hitos.$[elem].fechaCompletado": null,
            "hitos.$[elem].idFactura": null
          }
        },
        {
          arrayFilters: [{ "elem.idFacturaSaldo": idFactura }]
        }
      );
      console.log(`[ANULAR] Hitos liberados por idFacturaSaldo (${idFactura}):`, resultadoSaldo.modifiedCount);

      // ==========================================================
      // PASO 2: Liberar hitos con factura NORMAL asignada
      // ==========================================================
      const resultadoNormal = await Proyecto.updateOne(
        { idProyecto: factura.idProyecto },
        {
          $set: {
            "hitos.$[elem].facturaGenerada": false,
            "hitos.$[elem].completado": false,
            "hitos.$[elem].fechaCompletado": null,
            "hitos.$[elem].idFactura": null,
            "hitos.$[elem].cubiertoPorSaldo": false,
            "hitos.$[elem].idFacturaSaldo": null
          }
        },
        {
          arrayFilters: [{ "elem.idFactura": idFactura }]
        }
      );
      console.log(`[ANULAR] Hitos liberados por idFactura (${idFactura}):`, resultadoNormal.modifiedCount);

      // ==========================================================
      // PASO 3: Actualizar estado de la factura en array del proyecto
      // ==========================================================
      const resultadoFactura = await Proyecto.updateOne(
        { idProyecto: factura.idProyecto, "facturas.idFactura": idFactura },
        { $set: { "facturas.$.estado": "Anulada" } }
      );
      console.log(`[ANULAR] Estado actualizado en proyecto.facturas:`, resultadoFactura.modifiedCount);
    }

    // ==========================================================
    // PASO 4: Anular la factura en su colección
    // ==========================================================
    factura.estado = 'Anulada';
    await factura.save();
    console.log(`[ANULAR] Factura ${idFactura} anulada correctamente`);

    res.json({ 
      success: true, 
      message: `Factura ${idFactura} anulada. Hitos liberados y habilitados para nueva facturación.` 
    });

  } catch (error) {
    console.error("[ANULAR] ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ============================================
// 13. OBTENER COTIZACIONES APROBADAS
// ============================================

exports.obtenerCotizacionesAprobadas = async (req, res) => {
  try {
    const cotizaciones = await Cotizacion.find({
      estado_general: 'Aprobada',
      esCotizacionAdicional: { $ne: true }
    }).select('idCotizacion idCliente idSede total nombreEmp estado_general')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: cotizaciones.length, data: cotizaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener cotizaciones", error: error.message });
  }
};

// ============================================
// 14. CREAR COTIZACION ADICIONAL (desde proyecto)
// ============================================

exports.crearCotizacionAdicional = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, tipoPago, metodoPago, notas, notasLegales } = req.body;

    const proyecto = await Proyecto.findOne({ idProyecto: id });
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    // Generar ID
    const count = await Cotizacion.countDocuments({ esCotizacionAdicional: true });
    const consecutivo = (count + 1).toString().padStart(3, '0');
    const idCotizacion = `COT-ADIC-${consecutivo}`;

    // Calcular totales
    const subtotal = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    const iva = subtotal * 0.19;
    const total = subtotal + iva;
    const anticipo = tipoPago === 'unico' ? total : total * 0.40;

    const cotizacion = new Cotizacion({
      idCotizacion,
      idCliente: proyecto.idCliente,
      idSede: proyecto.idSede,
      idProyectoOrigen: proyecto.idProyecto,
      esCotizacionAdicional: true,
      nombreEmp: proyecto.nombreEmp,
      correoCliente: proyecto.correoClienteSede,
      contactoCliente: proyecto.contactoCliente,
      items,
      subtotal,
      iva,
      total,
      anticipo,
      tipoPago: tipoPago || 'anticipo_final',
      metodoPago: metodoPago || 'Transferencia Bancaria',
      estado_general: 'Pendiente',
      notas: notas || '',
      notasLegales: notasLegales || ''
    });

    await cotizacion.save();

    // Agregar referencia al proyecto con datos enriquecidos
    proyecto.cotizacionesAdicionales.push({
      idCotizacion: cotizacion.idCotizacion,
      valor: total,
      total: total,
      descripcion: notas || `Cotizacion adicional ${idCotizacion}`,
      notas: notas || '',
      fechaAgregado: new Date(),
      fecha: new Date(),
      estado: 'Pendiente',
      tipoPago: tipoPago || 'anticipo_final',
      metodoPago: metodoPago || 'Transferencia Bancaria'
    });

    await proyecto.save();

    res.status(201).json({
      success: true,
      message: "Cotizacion adicional creada",
      data: cotizacion
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 15. APROBAR COTIZACION ADICIONAL Solo genera la primera factura (anticipo o unica)
// ============================================

exports.aprobarCotizacionAdicional = async (req, res) => {
  try {
    const { idProyecto, idCotizacion } = req.params;
    const { metodoPago, tipoPago: tipoPagoBody } = req.body;

    const proyecto = await Proyecto.findOne({ idProyecto });
    const cotizacion = await Cotizacion.findOne({
      idCotizacion,
      idProyectoOrigen: idProyecto,
      esCotizacionAdicional: true
    });

    if (!proyecto || !cotizacion) {
      return res.status(404).json({ success: false, message: "No encontrado" });
    }

    if (!['Borrador', 'Pendiente'].includes(cotizacion.estado_general)) {
      return res.status(400).json({ success: false, message: "Estado no valido para aprobar" });
    }

    // Generar facturas segun tipo de pago
    const facturasGeneradas = [];
    const tipoPago = tipoPagoBody || cotizacion.tipoPago || 'anticipo_final';
    const metodoPagoFinal = metodoPago || cotizacion.metodoPago || 'Transferencia Bancaria';

    // Solo generar factura de anticipo o unica
    const porcentajePrimera = tipoPago === 'unico' ? 100 : 40;
    const f1 = await generarFacturaAdicional(cotizacion, proyecto, porcentajePrimera, metodoPagoFinal, false,{ creadoPor: req.user?.email || 'Sistema' });
    facturasGeneradas.push(f1);

    //Calcular cuántas facturas faltan para la nota
    const totalFacturasEsperadas = tipoPago === 'unico' ? 1 : 
                                    tipoPago === 'anticipo_final' ? 2 : 3;
    const faltantes = totalFacturasEsperadas - 1;

    // Actualizar cotizacion
    cotizacion.estado_general = 'Aprobada';
    cotizacion.fechaAprobacion = new Date();
    cotizacion.aprobadaPor = req.user?.email || 'Sistema';
    cotizacion.facturasGeneradas = facturasGeneradas.map(f => ({
      idFactura: f.idFactura,
      valor: f.totalConIva,
      estado: f.estado,
      fecha: f.fechaEmision
    }));
    await cotizacion.save();

    // Actualizar proyecto: NO crear nuevo proyecto, SOLO agregar a presupuesto
    proyecto.presupuestoTotal += cotizacion.total;
    proyecto.anticipo += cotizacion.anticipo;

    facturasGeneradas.forEach(f => {
      proyecto.facturas.push({
        idFactura: f.idFactura,
        valor: f.netoACobrar,
        fecha: f.fechaEmision,
        estado: f.estado,
        concepto: `Adicional - ${cotizacion.idCotizacion}`,
        metodoPago: f.metodoPago,
        iva: f.iva,
        retencion: f.retencion,
        netoACobrar: f.netoACobrar,
        esFacturaAdicional: true,
        idCotizacionAdicional: cotizacion.idCotizacion,
        items: f.items || []
      });
    });

    // Actualizar la referencia de cotizacion adicional en el proyecto
    const idxRef = proyecto.cotizacionesAdicionales.findIndex(c => c.idCotizacion === idCotizacion);
    if (idxRef !== -1) {
      proyecto.cotizacionesAdicionales[idxRef].estado = 'Aprobada';
    }

    await proyecto.save();

    res.json({
      success: true,
      message: "Cotizacion adicional aprobada. Facturas generadas. NO se creo nuevo proyecto.",
      data: { cotizacion, facturas: facturasGeneradas }
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 16. AGREGAR SEGUIMIENTO
// ============================================

exports.agregarSeguimiento = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, descripcion, porcentajeAvance, evidencias } = req.body;
    const proyecto = await Proyecto.findOne({ idProyecto: id });
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }
    proyecto.agregarSeguimiento({
      tipo,
      descripcion,
      porcentajeAvance,
      evidencias,
      creadoPor: req.user?.email || 'Sistema'
    });
     // Actualizar porcentaje de avance del proyecto
    if (porcentajeAvance !== undefined) {
      proyecto.porcentajeAvance = porcentajeAvance;
    }
    await proyecto.save();

      // ==========================================================
    // VERIFICAR SI PROYECTO DEBE FINALIZAR (después de seguimiento)
    // ==========================================================
    if (proyecto.porcentajeAvance === 100 && proyecto.estado !== 'Finalizado') {
      
      // CONDICION 1: Consultar COLECCION REAL de facturas
      const facturasBaseReales = await Factura.find({
        idProyecto: proyecto.idProyecto,
        esFacturaAdicional: { $ne: true },
        idCotizacionAdicional: null
      });
      
      const facturasPendientes = facturasBaseReales.filter(
        f => f.estado !== 'Pagada' && f.estado !== 'Anulada'
      );
      const todasFacturasPagadas = facturasPendientes.length === 0;
      
      console.log(`[FINALIZAR-SEGUIMIENTO] Proyecto ${proyecto.idProyecto} - Facturas reales pendientes: ${facturasPendientes.length}, Avance: ${proyecto.porcentajeAvance}%`);
      
      if (todasFacturasPagadas) {
        proyecto.estado = 'Finalizado';
        proyecto.fechaFin = new Date();
        proyecto.seguimiento = 'Proyecto finalizado. Todos los hitos completados y facturas pagadas.';
        await proyecto.save();
        console.log(`[FINALIZAR-SEGUIMIENTO] Proyecto ${proyecto.idProyecto} FINALIZADO automaticamente por seguimiento al 100%`);
      }
    }
    
    res.json({
      success: true,
      message: "Seguimiento agregado",
      data: proyecto.seguimientos[proyecto.seguimientos.length - 1]
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 17. OBTENER COTIZACIONES ADICIONALES
// ============================================

exports.obtenerCotizacionesAdicionales = async (req, res) => {
  try {
    const { id } = req.params;
    const proyecto = await Proyecto.findOne({ idProyecto: id });
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    const ids = proyecto.cotizacionesAdicionales.map(c => c.idCotizacion);
    const cotizaciones = await Cotizacion.find({ idCotizacion: { $in: ids } })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: cotizaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 18. OBTENER SEGUIMIENTOS
// ============================================

exports.obtenerSeguimientos = async (req, res) => {
  try {
    const { id } = req.params;
    const proyecto = await Proyecto.findOne({ idProyecto: id });
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }
    res.json({
      success: true,
      data: proyecto.seguimientos.sort((a, b) => b.fecha - a.fecha)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 19. CREAR FACTURA INDEPENDIENTE (sin proyecto)
// ============================================

exports.crearFacturaIndependiente = async (req, res) => {
  try {
    const {
      idCliente,
      idSede,
      nombreEmpresa,
      nombreSede,
      direccionSede,
      nitCliente,
      contactoCliente,
      correoCliente,
      metodoPago,
      items,
      subtotal,
      notas,
      notasLegales,
      fechaEmision,
      fechaVencimiento
    } = req.body;

    if (!idCliente) {
      return res.status(400).json({ success: false, message: "Debes seleccionar un cliente." });
    }

    // Generar ID de factura con contador
    const siguienteNumero = await Contador.obtenerSiguiente('facturas');
    const idFactura = `FAC-${String(siguienteNumero).padStart(3, '0')}`;

    // Preparar items
    const itemsFactura = (items || []).map(item => ({
      idServicio: item.idServicio || '',
      nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
      descripcion: item.descripcion || '',
      cantidad: item.cantidad || 1,
      precioUnitario: item.precioUnitario || 0,
      unidad: item.unidad || 'und',
      subtotal: item.subtotal || 0
    }));

    const subtotalCalc = Number(subtotal) || 0;

    // Crear factura independiente
    const facturaData = {
      idFactura,
      idProyecto: null, // Sin proyecto
      idCotizacion: null,
      idCliente,
      nombreEmpresa: nombreEmpresa || '',
      nombreSede: nombreSede || 'Principal',
      direccionSede: direccionSede || '',
      nitCliente: nitCliente || '',
      contactoCliente: contactoCliente || '',
      correoCliente: correoCliente || '',
      nombreProyecto: 'Factura Independiente',
      datosEmisor: {
        razonSocial: 'Neoconstrucciones Integrales SAS',
        nit: '901.421.096-1',
        direccion: 'Calle 11c #80B 70',
        celular: '3017223223',
        correoElectronico: 'neoconstruccionesintegrales@gmail.com'
      },
      metodoPago: metodoPago || 'Transferencia Bancaria',
      fechaEmision: fechaEmision ? new Date(fechaEmision) : new Date(),
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      items: itemsFactura,
      subtotal: subtotalCalc,
      anticipoPorcentaje: 100,
      saldoPorcentaje: 0,
      ivaPorcentaje: 19,
      retencionPorcentaje: 2,
      resupuestoTotalProyecto: proyecto.presupuestoTotal || 0, 
      notas: notas || '',
      notasLegales: notasLegales || '',
      estado: 'Pendiente de Anticipo',
      esFacturaAdicional: false,
      idCotizacionAdicional: null,
      activaProyecto: false,
      creadoPor: req.user ? req.user.email : 'Sistema'
    };

    const nuevaFactura = new Factura(facturaData);
    await nuevaFactura.save();

    res.status(201).json({
      success: true,
      message: `Factura independiente ${idFactura} creada exitosamente`,
      data: nuevaFactura
    });

  } catch (error) {
    console.error("Error al crear factura independiente:", error);
    res.status(500).json({ success: false, message: "Error al crear factura independiente", error: error.message });
  }
};

// ============================================
// HELPER: Generar factura desde cotizacion adicional
// ============================================

async function generarFacturaAdicional(cotizacion, proyecto, porcentaje, metodoPago, esPendiente = false, options = {}) {
  const siguienteNumero = await Contador.obtenerSiguiente('facturas');
  const idFactura = `FAC-${String(siguienteNumero).padStart(3, '0')}`;

  // Usar items de options o calcular proporcional
  const itemsFactura = options.items 
    ? options.items.map(item => ({
        ...item,
        subtotal: Math.round(item.subtotal || 0)
      }))
    : cotizacion.items.map(item => ({
        ...item,
        subtotal: Math.round((item.subtotal * porcentaje) / 100)
      }));

  // Calcular totales desde los items
  const subtotal = itemsFactura.reduce((acc, item) => acc + (item.subtotal || 0), 0);
  const iva = Math.round(subtotal * 0.19);
  const retencion = Math.round(subtotal * 0.02);
  const totalConIva = subtotal + iva;
  const netoACobrar = totalConIva ;

  // Buscar cliente para obtener datos reales de sede
  const cliente = await Cliente.findOne({ idCliente: proyecto.idCliente });
  
  let nombreEmpresa = proyecto.nombreEmp || '';
  let nombreSede = proyecto.nombreSede || 'Principal';
  let direccionSede = proyecto.direccionSede || '';
  let nitCliente = '';
  let contactoCliente = '';
  let correoCliente = '';

  if (cliente) {
    nombreEmpresa = cliente.nombreEmp || nombreEmpresa;
    nitCliente = cliente.nit || '';

    const esPrincipal = String(proyecto.idSede).includes('PRINCIPAL');
    
    if (esPrincipal) {
      nombreSede = 'Sede Principal (Administrativa)';
      direccionSede = cliente.direccion || '';
      contactoCliente = cliente.telefono || cliente.celular || '';
      correoCliente = cliente.correo || '';
    } else if (cliente.sedes && Array.isArray(cliente.sedes)) {
      const sedeData = cliente.sedes.find(s => s.id === proyecto.idSede);
      if (sedeData) {
        nombreSede = sedeData.nombreSede || nombreSede;
        direccionSede = sedeData.direccion || '';
        nitCliente = sedeData.nitEncargado || nitCliente;
        contactoCliente = sedeData.celular || '';
        correoCliente = sedeData.correoEnc || '';
      }
    }
  }

  // Nota de pagos pendientes
  const totalFacturasEsperadas = cotizacion.tipoPago === 'unico' ? 1 : 
                                  cotizacion.tipoPago === 'anticipo_final' ? 2 : 3;
  const facturasExistentes = cotizacion.facturasGeneradas?.length || 0;
  const faltantes = totalFacturasEsperadas - facturasExistentes - 1;
  
  let notaPagos = '';
  if (faltantes > 0) {
    notaPagos = `Faltan ${faltantes} pago(s) para completar factura`;
  }

  const factura = new Factura({
    idFactura,
    idProyecto: proyecto.idProyecto,
    idCotizacion: cotizacion.idCotizacion,
    idCotizacionAdicional: cotizacion.idCotizacion,
    idCliente: proyecto.idCliente,
    nombreEmpresa: nombreEmpresa,
    nombreSede: nombreSede,
    direccionSede: direccionSede,
    nitCliente: nitCliente,
    correoCliente: correoCliente,
    contactoCliente: contactoCliente,
    nombreProyecto: proyecto.nombreProyecto,
    datosEmisor: {
      razonSocial: 'Neoconstrucciones Integrales SAS',
      nit: '901.421.096-1',
      direccion: 'Calle 11c #80B 70',
      celular: '3017223223',
      correoElectronico: 'neoconstruccionesintegrales@gmail.com'
    },
    metodoPago: metodoPago,
    fechaEmision: new Date(),
    items: itemsFactura,
    subtotal,
    iva,
    retencion,
    totalConIva,
    netoACobrar,
    anticipoRequerido: porcentaje === 40 ? subtotal : 0,
    anticipoPorcentaje: porcentaje,
    saldoRestante: Math.max(0, cotizacion.total - subtotal),
    saldoPorcentaje: Math.max(0, 100 - porcentaje),
    ivaPorcentaje: 19,
    retencionPorcentaje: 2,
    notas: options.notas || cotizacion.notas || '',
    notasLegales: cotizacion.notasLegales || '',
    estado: options.estado || 'Pendiente de Anticipo',
    esFacturaAdicional: true,
    activaProyecto: false,
    creadoPor: options.creadoPor || 'Sistema'
  });

  await factura.save();
  return factura;
}

// ============================================
// 20. GENERAR SIGUIENTE FACTURA DE COTIZACION ADICIONAL - CORREGIDO
// ============================================
exports.generarSiguienteFacturaAdicional = async (req, res) => {
  try {
    const { idProyecto, idCotizacion } = req.params;
    const { metodoPago, porcentaje, items } = req.body;

    const proyecto = await Proyecto.findOne({ idProyecto });
    const cotizacion = await Cotizacion.findOne({
      idCotizacion,
      idProyectoOrigen: idProyecto,
      esCotizacionAdicional: true
    });

    if (!proyecto || !cotizacion) {
      return res.status(404).json({ success: false, message: "Proyecto o cotizacion no encontrada" });
    }

    if (cotizacion.estado_general !== 'Aprobada') {
      return res.status(400).json({ success: false, message: "La cotizacion adicional no esta aprobada" });
    }

    // Calcular total ya facturado de TODAS las facturas de esta cotización
    const facturasPrevias = await Factura.find({
      idCotizacionAdicional: idCotizacion,
      estado: { $ne: 'Anulada' }
    });

    const totalFacturado = facturasPrevias.reduce((acc, f) => acc + (f.subtotal || 0), 0);
    const porcentajeYaFacturado = (totalFacturado / cotizacion.subtotal) * 100;

    // Validar porcentaje
    const porcentajeFactura = Number(porcentaje) || Math.min(60, 100 - porcentajeYaFacturado);
    
    if (porcentajeFactura <= 0 || porcentajeFactura > 100) {
      return res.status(400).json({ success: false, message: "Porcentaje invalido (1-100)" });
    }

    // Verificar que no exceda el total de la cotización
    if (porcentajeYaFacturado + porcentajeFactura > 100) {
      return res.status(400).json({
        success: false,
        message: `El porcentaje (${porcentajeFactura}%) excede lo pendiente (${Math.round(100 - porcentajeYaFacturado)}%)`
      });
    }

    // Generar factura
    const metodoPagoFinal = metodoPago || cotizacion.metodoPago || 'Transferencia Bancaria';
    
    // Determinar estado según el porcentaje
    const estadoNuevo = porcentajeYaFacturado === 0 ? 'Pendiente de Anticipo' : 'Pendiente de Saldo';
    
    const nuevaFactura = await generarFacturaAdicional(
      cotizacion,
      proyecto,
      porcentajeFactura,
      metodoPagoFinal,
      false,
      {
        estado: estadoNuevo,
        items: items,
        notas: `Factura ${porcentajeFactura}% de cotizacion adicional ${idCotizacion}`,
        creadoPor: req.user?.email || 'Sistema'
      }
    );

    // Actualizar cotizacion con referencia de factura generada
    if (!cotizacion.facturasGeneradas) cotizacion.facturasGeneradas = [];
    cotizacion.facturasGeneradas.push({
      idFactura: nuevaFactura.idFactura,
      valor: nuevaFactura.totalConIva,
      estado: nuevaFactura.estado,
      fecha: nuevaFactura.fechaEmision,
      porcentaje: porcentajeFactura
    });
    await cotizacion.save();

    // ✅ SOLO UN proyecto.facturas.push - CON items
    proyecto.facturas.push({
      idFactura: nuevaFactura.idFactura,
      valor: nuevaFactura.totalConIva,
      fecha: nuevaFactura.fechaEmision,
      estado: nuevaFactura.estado,
      concepto: `Adicional - ${idCotizacion} (${porcentajeFactura}%)`,
      metodoPago: nuevaFactura.metodoPago,
      iva: nuevaFactura.iva,
      retencion: nuevaFactura.retencion,
      netoACobrar: nuevaFactura.netoACobrar,
      esFacturaAdicional: true,
      idCotizacionAdicional: idCotizacion,
      // ✅ NUEVO: Items de la factura para poder generar siguientes
      items: nuevaFactura.items || []
    });
    await proyecto.save();

    res.status(201).json({
      success: true,
      message: `Factura ${nuevaFactura.idFactura} generada (${porcentajeFactura}%)`,
      data: nuevaFactura
    });
  } catch (error) {
    console.error("Error generando siguiente factura:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// ACTUALIZAR COTIZACION ADICIONAL (versionamiento)
// ============================================
exports.actualizarCotizacionAdicional = async (req, res) => {
  try {
    const { idProyecto, idCotizacion } = req.params;
    const { idCotizacionNueva, valor, descripcion, notas, estado } = req.body;

    const proyecto = await Proyecto.findOne({ idProyecto });
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    const idx = proyecto.cotizacionesAdicionales.findIndex(c => c.idCotizacion === idCotizacion);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Cotizacion adicional no encontrada en el proyecto" });
    }

    proyecto.cotizacionesAdicionales[idx] = {
      ...proyecto.cotizacionesAdicionales[idx],
      idCotizacion: idCotizacionNueva || idCotizacion,
      valor: valor || proyecto.cotizacionesAdicionales[idx].valor,
      total: valor || proyecto.cotizacionesAdicionales[idx].total,
      descripcion: descripcion || proyecto.cotizacionesAdicionales[idx].descripcion,
      notas: notas || proyecto.cotizacionesAdicionales[idx].notas,
      estado: estado || proyecto.cotizacionesAdicionales[idx].estado,
      fecha: new Date()
    };

    await proyecto.save();
    res.json({ success: true, message: "Cotizacion adicional actualizada", data: proyecto.cotizacionesAdicionales[idx] });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 21. COMPLETAR HITO DE PROYECTO
// ============================================
exports.completarHito = async (req, res) => {
  try {
    const { id, idHito } = req.params;

    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProyecto: id }] }
      : { idProyecto: id };

    const proyecto = await Proyecto.findOne(filtro);
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    if (!proyecto.hitos || proyecto.hitos.length === 0) {
      return res.status(400).json({ success: false, message: "El proyecto no tiene hitos" });
    }

    // Verificar si se puede completar el hito
    const puede = proyecto.puedeGenerarFacturaHito(idHito);
    if (!puede.puede) {
      return res.status(400).json({ success: false, message: puede.razon });
    }

    // Completar el hito
    const resultado = proyecto.completarHito(idHito);
    if (!resultado.success) {
      return res.status(400).json({ success: false, message: resultado.message });
    }

    await proyecto.save();

    res.json({
      success: true,
      message: `Hito ${idHito} completado exitosamente`,
      data: {
        hito: resultado.hito,
        siguienteHito: proyecto.obtenerSiguienteHitoPendiente()
      }
    });

  } catch (error) {
    console.error("Error completando hito:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 22. GENERAR FACTURA DESDE HITO
// ============================================
exports.generarFacturaDesdeHito = async (req, res) => {
  try {
    const { id, idHito } = req.params;
    const { metodoPago, notas } = req.body;

    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProyecto: id }] }
      : { idProyecto: id };

    const proyecto = await Proyecto.findOne(filtro);
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    // Verificar si se puede generar factura para este hito
    const puede = proyecto.puedeGenerarFacturaHito(idHito);
    if (!puede.puede) {
      return res.status(400).json({ success: false, message: puede.razon });
    }

    const hito = proyecto.hitos.find(h => h.idHito === idHito);
    if (!hito) {
      return res.status(404).json({ success: false, message: "Hito no encontrado" });
    }

    // Verificar que no tenga ya factura
    if (hito.facturaGenerada && hito.idFactura) {
      return res.status(400).json({ 
        success: false, 
        message: "Este hito ya tiene una factura generada",
        idFacturaExistente: hito.idFactura
      });
    }

    const cliente = await Cliente.findOne({ idCliente: proyecto.idCliente });

    // Generar ID de factura
    const siguienteNumero = await Contador.obtenerSiguiente('facturas');
    const idFactura = `FAC-${String(siguienteNumero).padStart(3, '0')}`;

    // Datos de sede
    let nombreSede = proyecto.nombreSede || 'Principal';
    let direccionSede = proyecto.direccionSede || '';
    let correoCliente = '';
    let contactoCliente = '';
    let nitCliente = '';

    if (cliente) {
      nitCliente = cliente.nit || '';
      correoCliente = cliente.correo || '';
      contactoCliente = cliente.telefono || cliente.celular || '';
      if (String(proyecto.idSede).includes('PRINCIPAL')) {
        direccionSede = cliente.direccion || '';
      } else if (cliente.sedes) {
        const sedeData = cliente.sedes.find(s => s.id === proyecto.idSede);
        if (sedeData) {
          nombreSede = sedeData.nombreSede || nombreSede;
          direccionSede = sedeData.direccion || direccionSede;
          correoCliente = sedeData.correoEnc || correoCliente;
          contactoCliente = sedeData.celular || contactoCliente;
        }
      }
    }

// El hito.montoEstimado YA INCLUYE IVA
// La factura espera subtotal SIN IVA (el pre-save calcula IVA y totalConIva)
const montoConIva = hito.montoEstimado;
const subtotalSinIva = Math.round(montoConIva / 1.19);

// Factor proporcional del hito sobre el total del proyecto (ambos con IVA)
const factor = hito.montoEstimado / proyecto.presupuestoTotal;

let itemsFactura = (proyecto.items || []).map(item => {
    const subtotalOriginal = item.subtotal || 0;
    const subtotalItem = Math.round(subtotalOriginal * factor);
    const precioUnitarioOriginal = item.precioUnitario || 0;
    
    // Calcular cantidad proporcional manteniendo el precio unitario real
    const cantidadItem = precioUnitarioOriginal > 0 
        ? Math.round(subtotalItem / precioUnitarioOriginal) 
        : 1;
    
    return {
        idServicio: item.idServicio || '',
        nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
        descripcion: `${item.descripcion || item.nombreServicio || 'Servicio'} - ${hito.nombre}`,
        cantidad: cantidadItem,  // ✅ Proporcional al hito: 20, 10, 10, 10
        precioUnitario: precioUnitarioOriginal,  // ✅ FIJO: $26.650
        unidad: item.unidad || 'mt',
        subtotal: subtotalItem  // ✅ Proporcional al hito
    };
});

// Ajustar el último ítem para que la suma exacta sea subtotalSinIva
const sumaItems = itemsFactura.reduce((acc, item) => acc + item.subtotal, 0);
if (itemsFactura.length > 0 && sumaItems !== subtotalSinIva) {
    const diferencia = subtotalSinIva - sumaItems;
    itemsFactura[itemsFactura.length - 1].subtotal += diferencia;
    const lastItem = itemsFactura[itemsFactura.length - 1];
    lastItem.precioUnitario = lastItem.cantidad > 0 
        ? Math.round(lastItem.subtotal / lastItem.cantidad) 
        : lastItem.subtotal;
}

// Si no hay items, crear uno genérico
if (itemsFactura.length === 0) {
    itemsFactura.push({
        idServicio: `HITO_${idHito}`,
        nombreServicio: `${hito.nombre} - ${proyecto.nombreProyecto}`,
        descripcion: hito.descripcion || `Etapa ${hito.numeroHito} del proyecto`,
        cantidad: 1,
        precioUnitario: subtotalSinIva,
        unidad: 'und',
        subtotal: subtotalSinIva
    });
}
 // Determinar si es el primer hito (solo el primero activa el proyecto)
    const esPrimerHito = hito.numeroHito === 1 || hito === proyecto.hitos[0];
    
    // Estado inicial: el primer hito es "Pendiente de Anticipo", los demas "Pendiente de Saldo"
    const estadoInicial = esPrimerHito ? 'Pendiente de Anticipo' : 'Pendiente de Saldo';
    
    // Nota para la factura
    const notaFactura = notas || `${hito.nombre} - Proyecto: ${proyecto.nombreProyecto}`;
    const subtotalHito = montoConIva; 

const facturaData = {
      idFactura,
      idProyecto: proyecto.idProyecto,
      idCotizacion: proyecto.idCotizacion,
      idCliente: proyecto.idCliente,
      nombreEmpresa: proyecto.nombreEmp || (cliente ? cliente.nombreEmp : ''),
      nombreSede,
      direccionSede,
      nitCliente,
      contactoCliente,
      correoCliente,
      nombreProyecto: proyecto.nombreProyecto,
      datosEmisor: {
        razonSocial: 'Neoconstrucciones Integrales SAS',
        nit: '901.421.096-1',
        direccion: 'Calle 11c No.80B-70',
        celular: '3017223223',
        correoElectronico: 'neoconstruccionesintegrales@gmail.com'
      },
      metodoPago: metodoPago || 'Transferencia Bancaria',
      fechaEmision: new Date(),
      items: itemsFactura,
      subtotal: subtotalSinIva,
      anticipoRequerido: 0,
    anticipoPorcentaje: 0,
    saldoRestante: 0,
    saldoPorcentaje: 0,
    ivaPorcentaje: 19,  // El pre-save calculará IVA sobre subtotalSinIva
    retencionPorcentaje: 2,
    presupuestoTotalProyecto: proyecto.presupuestoTotal || 0, 
    notas: notaFactura,
    estado: estadoInicial,
    activaProyecto: esPrimerHito, // Solo el primer hito activa el proyecto
      creadoPor: req.user ? req.user.email : 'Sistema'
    };

    const nuevaFactura = new Factura(facturaData);
    await nuevaFactura.save();

    // Marcar hito como facturado
    // proyecto.marcarHitoFacturado(idHito, idFactura);
    // Solo marcar que el hito tiene factura generada (NO completado)
    const hitoFacturar = proyecto.hitos.find(h => h.idHito === idHito);
    if (hitoFacturar) {
      hitoFacturar.facturaGenerada = true;
      hitoFacturar.idFactura = idFactura;
    }

    // Agregar referencia al proyecto
    proyecto.facturas.push({
      idFactura: nuevaFactura.idFactura,
      valor: nuevaFactura.netoACobrar || subtotalHito || 0,
      fecha: nuevaFactura.fechaEmision,
      estado: nuevaFactura.estado,
      concepto: `${hito.nombre} (${hito.porcentajePeso}%) - Hito ${hito.numeroHito}`,
      metodoPago: nuevaFactura.metodoPago,
      iva: nuevaFactura.iva || 0,
      retencion: nuevaFactura.retencion || 0,
      netoACobrar: nuevaFactura.netoACobrar || 0,
      esFacturaAdicional: false,
      idCotizacionAdicional: null,
      idHito: idHito,
      numeroHito: hito.numeroHito,
      items: itemsFactura
    });

    await proyecto.save();

    res.status(201).json({
      success: true,
      message: `Factura ${idFactura} generada para hito ${hito.nombre} (${hito.porcentajePeso}%)`,
      data: {
        factura: nuevaFactura,
        hito: hito,
        siguienteHito: proyecto.obtenerSiguienteHitoPendiente()
      }
    });

  } catch (error) {
    console.error("Error generando factura desde hito:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 23. GENERAR FACTURA DE SALDO DEL PROYECTO BASE
// ============================================
exports.generarFacturaSaldoProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      metodoPago, 
      items, 
      subtotal, 
      notas,
      notasLegales,
      notasAdicionales, 
      fechaEmision,
      fechaVencimiento,
      porcentajeSaldo,   
      hitosCubiertos     
    } = req.body;

    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idProyecto: id }] }
      : { idProyecto: id };

    const proyecto = await Proyecto.findOne(filtro);
    if (!proyecto) {
      return res.status(404).json({ success: false, message: "Proyecto no encontrado" });
    }

    // 1. Calcular cuánto ya se facturó del proyecto base (solo facturas pagadas o anticipo pagado)
    const facturasBase = proyecto.facturas?.filter(
      f => !f.esFacturaAdicional && !f.idCotizacionAdicional &&
           (f.estado === 'Pagada' || f.estado === 'Anticipo ya Pagado')
    ) || [];
    
    const totalFacturadoBase = facturasBase.reduce((sum, f) => sum + (f.valor || 0), 0);
    const presupuestoBase = proyecto.presupuestoTotal || 0;
    const saldoDisponible = presupuestoBase - totalFacturadoBase;
    const porcentajeDisponible = Math.round((saldoDisponible / presupuestoBase) * 100);

    // 2. Validar que el porcentaje solicitado no exceda el disponible
    if (!porcentajeSaldo || porcentajeSaldo <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Debe especificar un porcentaje válido para la factura de saldo" 
      });
    }
    
    if (porcentajeSaldo > porcentajeDisponible + 1) { // +1 tolerancia por redondeo
      return res.status(400).json({ 
        success: false, 
        message: `El porcentaje solicitado (${porcentajeSaldo}%) excede el saldo disponible (${porcentajeDisponible}%)` 
      });
    }

    // 3. Validar que la última factura base esté pagada
    const ultimaFacturaBase = facturasBase[facturasBase.length - 1];
    if (ultimaFacturaBase && 
        ultimaFacturaBase.estado !== 'Pagada' && 
        ultimaFacturaBase.estado !== 'Anticipo ya Pagado') {
      return res.status(400).json({
        success: false,
        message: `Debe pagar la factura ${ultimaFacturaBase.idFactura} antes de generar el saldo`
      });
    }

    // 4. Validar que los hitos cubiertos estén pendientes (no facturados, no completados, no cubiertos)
    if (hitosCubiertos && hitosCubiertos.length > 0) {
      const hitosInvalidos = hitosCubiertos.filter(idHito => {
        const h = proyecto.hitos.find(h => h.idHito === idHito);
        return !h || h.facturaGenerada || h.completado || h.cubiertoPorSaldo;
      });
      
      if (hitosInvalidos.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Algunos hitos ya están facturados, completados o cubiertos por saldo',
          hitosInvalidos 
        });
      }
    }

    // 5. Calcular subtotal proporcional al porcentaje elegido (NO al 100% del saldo)
    const subtotalSaldo = Math.round((presupuestoBase * porcentajeSaldo) / 100 / 1.19);

    // 6. Generar ID de factura
    const siguienteNumero = await Contador.obtenerSiguiente('facturas');
    const idFactura = `FAC-${String(siguienteNumero).padStart(3, '0')}`;

    // 7. Cliente y sede
    const cliente = await Cliente.findOne({ idCliente: proyecto.idCliente });

    let nombreSede = proyecto.nombreSede || 'Principal';
    let direccionSede = proyecto.direccionSede || '';
    let nitCliente = '';
    let contactoCliente = '';
    let correoCliente = '';

    if (cliente) {
      nitCliente = cliente.nit || '';
      correoCliente = cliente.correo || '';
      contactoCliente = cliente.telefono || cliente.celular || '';
      if (String(proyecto.idSede).includes('PRINCIPAL')) {
        nombreSede = 'Sede Principal (Administrativa)';
        direccionSede = cliente.direccion || '';
      } else if (cliente.sedes) {
        const sedeData = cliente.sedes.find(s => s.id === proyecto.idSede);
        if (sedeData) {
          nombreSede = sedeData.nombreSede || nombreSede;
          direccionSede = sedeData.direccion || direccionSede;
          correoCliente = sedeData.correoEnc || correoCliente;
          contactoCliente = sedeData.celular || contactoCliente;
          nitCliente = sedeData.nitEncargado || nitCliente;
        }
      }
    }

    // 8. Items: usar los del body (ya recalculados por el frontend) o recalcular
    const itemsSaldo = (items || []).length > 0 
      ? items.map(item => ({
          idServicio: item.idServicio || '',
          nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
          descripcion: item.descripcion || '',
          cantidad: item.cantidad || 1,
          precioUnitario: item.precioUnitario || 0,
          unidad: item.unidad || 'und',
          subtotal: item.subtotal || 0
        }))
      : (proyecto.items || []).map(item => ({
          idServicio: item.idServicio || '',
          nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
          descripcion: `Saldo (${porcentajeSaldo}%) - ${item.descripcion || ''}`,
          cantidad: item.cantidad || 1,
          precioUnitario: Math.round((item.precioUnitario || 0) * porcentajeSaldo / 100),
          unidad: item.unidad || 'und',
          subtotal: Math.round((item.subtotal || 0) * porcentajeSaldo / 100)
        }));

    // 9. Crear la factura
    const facturaData = {
      idFactura,
      idProyecto: proyecto.idProyecto,
      idCotizacion: proyecto.idCotizacion,
      idCliente: proyecto.idCliente,
      nombreEmpresa: proyecto.nombreEmp || (cliente ? cliente.nombreEmp : ''),
      nombreSede,
      direccionSede,
      nitCliente,
      contactoCliente,
      correoCliente,
      nombreProyecto: proyecto.nombreProyecto,
      datosEmisor: {
        razonSocial: 'Neoconstrucciones Integrales SAS',
        nit: '901.421.096-1',
        direccion: 'Calle 11c #80B 70',
        celular: '3017223223',
        correoElectronico: 'neoconstruccionesintegrales@gmail.com'
      },
      metodoPago: metodoPago || 'Transferencia Bancaria',
      fechaEmision: fechaEmision ? new Date(fechaEmision) : new Date(),
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      items: itemsSaldo,
      subtotal: subtotalSaldo,
      anticipoPorcentaje: 0,      // ← Saldo: no hay anticipo
      saldoPorcentaje: 100,      // ← Todo es saldo del valor restante
      ivaPorcentaje: 19,
      retencionPorcentaje: 2,
      resupuestoTotalProyecto: proyecto.presupuestoTotal || 0,
      notas: notas || `Factura de saldo (${porcentajeSaldo}%) - Proyecto: ${proyecto.nombreProyecto}`,
      notasLegales: notasLegales || 'Terminos: Pago a 30 dias. IVA incluido.',
      notasAdicionales: notasAdicionales || '',
      estado: 'Pendiente de Saldo',
      esFacturaAdicional: false,
      idCotizacionAdicional: null,
      porcentajeSaldo: porcentajeSaldo,  // ← Guardar para referencia
      hitosCubiertos: hitosCubiertos || [], // ← Guardar hitos cubiertos
      activaProyecto: false,
      creadoPor: req.user ? req.user.email : 'Sistema'
    };

    const nuevaFactura = new Factura(facturaData);
    await nuevaFactura.save();

         // 10. MARCAR HITOS como cubiertos por saldo (DB + documento en memoria)
    if (hitosCubiertos && hitosCubiertos.length > 0) {
      // Actualizar en base de datos
      await Proyecto.updateOne(
        { idProyecto: proyecto.idProyecto },
        {
          $set: {
            "hitos.$[elem].cubiertoPorSaldo": true,
            "hitos.$[elem].idFacturaSaldo": idFactura,
            "hitos.$[elem].facturaGenerada": true
          }
        },
        {
          arrayFilters: [{ "elem.idHito": { $in: hitosCubiertos } }]
        }
      );

      // Actualizar el documento en memoria para que proyecto.save() no lo sobrescriba
      hitosCubiertos.forEach(idHito => {
        const h = proyecto.hitos.find(h => h.idHito === idHito);
        if (h) {
          h.cubiertoPorSaldo = true;
          h.idFacturaSaldo = idFactura;
          h.facturaGenerada = true;
        }
      });
    }

    // 11. Agregar referencia al proyecto
    proyecto.facturas.push({
      idFactura: nuevaFactura.idFactura,
      valor: nuevaFactura.netoACobrar || subtotalSaldo,
      fecha: nuevaFactura.fechaEmision,
      estado: nuevaFactura.estado,
      concepto: `Saldo del Proyecto (${porcentajeSaldo}%)`,
      metodoPago: nuevaFactura.metodoPago,
      iva: nuevaFactura.iva || 0,
      retencion: nuevaFactura.retencion || 0,
      netoACobrar: nuevaFactura.netoACobrar || 0,
      esFacturaAdicional: false,
      idCotizacionAdicional: null,
      items: itemsSaldo,
      porcentajeSaldo: porcentajeSaldo,
      hitosCubiertos: hitosCubiertos || []
    });

    await proyecto.save();

    res.status(201).json({
      success: true,
      message: `Factura de saldo ${idFactura} generada (${porcentajeSaldo}%)`,
      data: {
        idFactura,
        porcentajeSaldo,
        hitosCubiertos: hitosCubiertos || [],
        saldoRestante: porcentajeDisponible - porcentajeSaldo
      }
    });

  } catch (error) {
    console.error("Error generando factura de saldo:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Enpoint revision de empleado /obra labor
exports.finalizarProyecto = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Actualizar proyecto
    const proyecto = await Proyecto.findByIdAndUpdate(id, {
      estado: 'finalizado',
      fechaFin: new Date()
    }, { new: true });
    
    // Empleados obra/labor asignados a este proyecto
    const empleados = await Usuario.find({ 
      proyectoAsignado: id,
      tipoContrato: 'obra_labor',
      estadoLaboral: 'activo'
    });
    
    // Registrar en historial y desasignar
    for (const emp of empleados) {
      emp.historialAsignaciones.push({
        idProyecto: id,
        fechaInicio: emp.fechaIngreso, // o fecha de asignación si la tienes
        fechaFin: new Date()
      });
      emp.proyectoAsignado = null;
      emp.estadoLaboral = 'retirado'; // o 'disponible' si quieres reasignar
      await emp.save();
    }
    
    res.json({ 
      success: true, 
      data: proyecto,
      empleadosAfectados: empleados.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};