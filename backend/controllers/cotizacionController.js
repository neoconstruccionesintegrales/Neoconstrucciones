const mongoose = require('mongoose');
const Cotizacion = require('../models/Cotizacion');
const Cliente = require('../models/clientes');
const Proyecto = require('../models/Proyecto');
const Factura = require('../models/Factura');
const Contador = require('../models/Contador');

// ===========================================
// 1. GUARDAR NUEVA COTIZACION (con versionamiento)
// ===========================================
exports.saveCotizacion = async (req, res) => {
  try {
    console.log("DATOS RECIBIDOS EN BACKEND:", JSON.stringify(req.body, null, 2));
    const {
      idCliente,
      idSede,
      version_id,
      idCotizacionBase,
      estado_general,
      idAnterior,
      anticipo,
      items,
      subtotal,
      iva,
      total,
      esCotizacionAdicional,
      idProyectoOrigen,
      ...otrosDatos
    } = req.body;

    if (!idCliente || !idSede) {
      return res.status(400).json({ error: "Faltan campos obligatorios: idCliente o idSede" });
    }

    // Logica de vencimiento
    const vIdEntrada = Number(version_id) || 1;
    const diasValidez = 15 + ((vIdEntrada - 1) * 3);
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + diasValidez);

    // Logica de ID
    let finalId;
    let vId;
    const cleanClient = idCliente.toString().split('-').pop();
    const cleanSede = idSede.toString().split('-').pop();
    const esVersion = idCotizacionBase && idCotizacionBase !== 'undefined' && idCotizacionBase !== '';

    const cliente = await Cliente.findOne({ idCliente: idCliente });

    if (esVersion) {
      const idBaseLimpio = idCotizacionBase.toString().split('-V')[0];
      const count = await Cotizacion.countDocuments({
        idCotizacion: { $regex: `^${idBaseLimpio}-V` }
      });
      vId = count + 1;
      finalId = `${idBaseLimpio}-V${vId}`;
    } else {
      const count = await Cotizacion.countDocuments({
        idCliente,
        idSede,
        $or: [{ version_id: 1 }, { version_id: { $exists: false } }]
      });
      const consecutivo = (count + 1).toString().padStart(3, '0');
      finalId = `COT-${cleanClient}-${cleanSede}-${consecutivo}`;
      vId = 1;
    }

    // Validacion de seguridad para el ID
    if (!finalId || finalId.includes('undefined') || finalId.includes('null')) {
      console.error("ERROR CRITICO: Se intento generar un ID invalido:", finalId);
      return res.status(500).json({
        error: "Error interno",
        details: "No se pudo generar un ID valido para la cotizacion. Verifica los datos de entrada."
      });
    }

    // Si es cotizacion adicional, marcar estado como Pendiente
    const esAdicional = esCotizacionAdicional === true || esCotizacionAdicional === 'true';
    const estadoFinal = esAdicional ? 'Pendiente' : (estado_general || 'Pendiente');

    // Guardar nueva cotizacion
    const nuevaCotizacion = new Cotizacion({
      ...otrosDatos,
      idCliente,
      idSede,
      nombreEmp: otrosDatos.nombreEmp || (cliente ? cliente.nombreEmp : ''),
      idCotizacion: finalId,
      version_id: vId,
      estado_general: estadoFinal,
      fechaVencimiento: fechaVencimiento,
      anticipo: anticipo || (total * 0.40) || 0,
      items: items || [],
      subtotal: subtotal || 0,
      iva: iva || 0,
      total: total || 0,
      esCotizacionAdicional: esAdicional,
      idProyectoOrigen: idProyectoOrigen || null,
      tipoPago: otrosDatos.tipoPago || 'anticipo_final',
      metodoPago: otrosDatos.metodoPago || 'Transferencia Bancaria',
      notas: otrosDatos.notas || '',
      notasLegales: otrosDatos.notasLegales || '',
      historialVersiones: []
    });

    console.log("Objeto listo para guardar:", JSON.stringify(nuevaCotizacion.toObject(), null, 2));
    await nuevaCotizacion.save();

    // Logica de Superada
    if (idAnterior && idAnterior !== 'undefined' && idAnterior !== '') {
      await Cotizacion.updateOne(
        { idCotizacion: idAnterior },
        { estado_general: 'Superada' }
      );
      console.log(`Version anterior ${idAnterior} marcada como Superada.`);
    }

    // ✅ FIX: Convertir a objeto plano antes de enviar
    res.status(201).json({ 
      message: "Guardado exitosamente", 
      data: nuevaCotizacion.toObject() 
    });

  } catch (error) {
    console.error("--- ERROR EN SAVECOTIZACION ---", error);
    if (error.code === 11000) {
      return res.status(409).json({ error: "Conflicto de ID", details: "Ya existe esta version o cotizacion" });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: "Datos invalidos", details: error.errors });
    }
    res.status(500).json({ error: "Error interno", details: error.message });
  }
};

// ==============================================================
// 2. OBTENER TODAS LAS COTIZACIONES (excluye cotizaciones adicionales)
// ==============================================================

exports.getAllCotizaciones = async (req, res) => {
  try {
    // ✅ FIX: Usar .lean() para evitar instancias de Mongoose
    const cotizaciones = await Cotizacion.find({
      esCotizacionAdicional: { $ne: true }
    }).sort({ createdAt: -1 }).lean();

    res.json({ success: true, data: cotizaciones });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error al obtener", details: error.message });
  }
};

// ==============================================================
// 3. OBTENER COTIZACION POR ID
// ==============================================================

exports.getCotizacionById = async (req, res) => {
  try {
    const { id } = req.params;
    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idCotizacion: id }] }
      : { idCotizacion: id };

    const cotizacion = await Cotizacion.findOne(filtro).lean();
    if (!cotizacion) return res.status(404).json({ message: "Cotizacion no encontrada" });

    // Traer datos completos del cliente
    const cliente = await Cliente.findOne({ idCliente: cotizacion.idCliente }).lean();

    // Enriquecer con datos de la sede
    let sedeInfo = null;
    if (cliente && cliente.sedes) {
      if (String(cotizacion.idSede).includes('PRINCIPAL')) {
        sedeInfo = {
          nombreSede: 'Sede Principal (Administrativa)',
          direccion: cliente.direccion || '',
          correo: cliente.correo || '',
          contacto: cliente.telefono || cliente.celular || '',
          nit: cliente.nit || ''
        };
      } else {
        const sedeEncontrada = cliente.sedes.find(s => s.id === cotizacion.idSede);
        if (sedeEncontrada) {
          sedeInfo = {
            nombreSede: sedeEncontrada.nombreSede || '',
            direccion: sedeEncontrada.direccion || '',
            correo: sedeEncontrada.correoEnc || cliente.correo || '',
            contacto: sedeEncontrada.celular || cliente.telefono || '',
            nit: sedeEncontrada.nitEncargado || cliente.nit || ''
          };
        }
      }
    }

    const respuesta = {
      ...cotizacion,
      clienteDetalle: cliente || null,
      sedeDetalle: sedeInfo
    };
    res.status(200).json(respuesta);
  } catch (error) {
    console.error("Error en getCotizacionById:", error);
    res.status(500).json({ message: "Error al obtener la cotizacion", error: error.message });
  }
};

/// ==============================================================
// 4. ACTUALIZAR ESTADO DE COTIZACION (CORREGIDO Y SEGURO)
// ==============================================================
exports.updateEstadoCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_general } = req.body;

    console.log(`--- ACTUALIZANDO ESTADO COTIZACION ---`);
    console.log(`ID: ${id}`);
    console.log(`Estado solicitado: ${estado_general}`);

    if (!estado_general) {
      return res.status(400).json({ error: "El campo estado_general es obligatorio" });
    }

    const filtro = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { idCotizacion: id }] }
      : { idCotizacion: id };

    const cotizacion = await Cotizacion.findOne(filtro);
    if (!cotizacion) {
      return res.status(404).json({ error: "Cotizacion no encontrada" });
    }

    if (cotizacion.estado_general === 'Superada') {
      return res.status(403).json({ error: "No se puede modificar una cotizacion superada." });
    }

    const estadosPermitidos = ['Pendiente', 'Aprobada', 'Rechazada', 'Caducada', 'Superada'];
    if (!estadosPermitidos.includes(estado_general)) {
      return res.status(400).json({ error: `Estado no valido: ${estado_general}` });
    }

    let proyectoCreado = null;
    let facturaAnticipo = null;
    const esCotizacionAdicional = cotizacion.esCotizacionAdicional === true;

    if (estado_general === 'Aprobada' && cotizacion.estado_general !== 'Aprobada' && !esCotizacionAdicional) {

      // ✅ CORRECCION DE SEGURIDAD: Validación explícita de strings
      const metodoPago = (typeof req.body.metodoPago === 'string') ? req.body.metodoPago : 'Transferencia Bancaria';
      const tipoPago = (typeof req.body.tipoPago === 'string') ? req.body.tipoPago : 'anticipo_final';

      const metodosValidos = ['Transferencia Bancaria', 'Efectivo', 'Cheque Corporativo', 'Pasarela de pago Online', 'Tarjeta de credito/debito'];
      if (!metodosValidos.includes(metodoPago)) {
        return res.status(400).json({ error: "Metodo de pago no valido", metodosPermitidos: metodosValidos });
      }

      const tiposValidos = ['unico', 'anticipo_final', 'por_etapas', 'personalizado'];
      if (!tiposValidos.includes(tipoPago)) {
        return res.status(400).json({ error: "Tipo de pago no valido", tiposPermitidos: tiposValidos });
      }

      // 3. Buscar cliente y datos de la sede
      const cliente = await Cliente.findOne({ idCliente: cotizacion.idCliente });
      let sedeData = null;
      if (cliente && cliente.sedes && cotizacion.idSede) {
        sedeData = cliente.sedes.find(s => s.id === cotizacion.idSede);
      }

      const esSedePrincipal = !cotizacion.idSede || String(cotizacion.idSede).includes('PRINCIPAL');

      let nombreSede = 'Principal';
      let direccionSede = '';
      let nitCliente = '';
      let contactoCliente = '';
      let correoCliente = '';

      if (esSedePrincipal) {
        nombreSede = 'Sede Principal (Administrativa)';
        direccionSede = cliente ? cliente.direccion : '';
        nitCliente = cliente ? cliente.nit : '';
        contactoCliente = cliente ? (cliente.telefono || cliente.celular) : '';
        correoCliente = cliente ? cliente.correo : '';
      } else if (sedeData) {
        nombreSede = sedeData.nombreSede || 'Sede sin nombre';
        direccionSede = sedeData.direccion || '';
        nitCliente = cliente?.nit || ''; 
        contactoCliente = sedeData.celular || cliente?.telefono || cliente?.celular || '';
        correoCliente = sedeData.correoEnc || cliente?.correo || '';
      }

      // 4. Generar IDs
      const countProyectos = await Proyecto.countDocuments();
      const consecutivoProyecto = (countProyectos + 1).toString().padStart(3, '0');
      const idProyecto = `PRY-${consecutivoProyecto}`;

      const siguienteNumero = await Contador.obtenerSiguiente('facturas');
      const idFactura = `FAC-${String(siguienteNumero).padStart(3, '0')}`;

      const totalProyecto = cotizacion.total || 0;         
      const montoAnticipo = tipoPago === 'unico' 
        ? totalProyecto
        : (cotizacion.anticipo || (totalProyecto * 0.40) || 0);

      const subtotalFactura = Math.round(montoAnticipo / 1.19);
      const ivaFactura = Math.round(subtotalFactura * 0.19);

      const pctAnticipo = tipoPago === 'unico' ? 100 : 40;

      const sumaSubtotalesOriginales = (cotizacion.items || []).reduce((acc, item) => {
        return acc + (item.subtotal || (item.cantidad * (item.precioUnitario || item.valorUnitario || 0)) || 0);
      }, 0);
      const subtotalBase = sumaSubtotalesOriginales || subtotalFactura;
      const factorAjuste = subtotalFactura / subtotalBase;

      let itemsFactura = (cotizacion.items || []).map(item => {
        const cantidadOriginal = item.cantidad || 1;
        const subtotalOriginal = item.subtotal || (cantidadOriginal * (item.precioUnitario || item.valorUnitario || 0)) || 0;

        const subtotalAjustado = Math.round(subtotalOriginal * factorAjuste);
        const cantidadAjustada = Math.max(1, Math.round(cantidadOriginal * factorAjuste));

        return {
          idServicio: item.idServicio || '',
          nombreServicio: item.nombreServicio || item.descripcion || 'Servicio',
          descripcion: `${item.descripcion || item.nombreServicio || 'Servicio'} (${pctAnticipo === 100 ? 'Pago Total' : `Anticipo ${pctAnticipo}%`})`,
          cantidad: cantidadAjustada,
          precioUnitario: item.precioUnitario || item.valorUnitario || 0,
          subtotal: subtotalAjustado
        };
      });

      const sumaItems = itemsFactura.reduce((acc, item) => acc + item.subtotal, 0);
      if (itemsFactura.length > 0 && sumaItems !== subtotalFactura) {
        const diferencia = subtotalFactura - sumaItems;
        itemsFactura[itemsFactura.length - 1].subtotal += diferencia;
        const lastItem = itemsFactura[itemsFactura.length - 1];
        lastItem.precioUnitario = lastItem.cantidad > 0 
          ? Math.round(lastItem.subtotal / lastItem.cantidad) 
          : lastItem.subtotal;
      }

      if (itemsFactura.length === 0) {
        itemsFactura.push({
          idServicio: tipoPago === 'unico' ? 'PAGO_UNICO' : 'ANTICIPO',
          nombreServicio: tipoPago === 'unico'
            ? `Pago Total - Proyecto ${idProyecto}`
            : `Anticipo ${pctAnticipo}% - Proyecto ${idProyecto}`,
          descripcion: tipoPago === 'unico'
            ? 'Pago único por servicios contratados'
            : `Pago de anticipo del ${pctAnticipo}% para inicio de obra`,
          cantidad: 1,
          precioUnitario: subtotalFactura,
          subtotal: subtotalFactura
        });
      }

      // 5. Crear factura
      const facturaData = {
        idFactura: idFactura,
        idProyecto: idProyecto,
        idCotizacion: cotizacion.idCotizacion,
        idCliente: cotizacion.idCliente,
        nombreEmpresa: cotizacion.nombreEmp || (cliente ? cliente.nombreEmp : ''),
        nombreSede: nombreSede,
        direccionSede: direccionSede,
        nitCliente: nitCliente,
        contactoCliente: contactoCliente,
        correoCliente: correoCliente,
        nombreProyecto: `PROYECTO ${cotizacion.idCotizacion}`,
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
        subtotal: subtotalFactura,  
        anticipoRequerido: montoAnticipo,  
        anticipoPorcentaje: tipoPago === 'unico' ? 100 : 40,
        saldoRestante: totalProyecto - montoAnticipo,
        saldoPorcentaje: tipoPago === 'unico' ? 0 : 60,
        ivaPorcentaje: 19,
        retencionPorcentaje: 2,
        presupuestoTotalProyecto: totalProyecto, 
        notas: tipoPago === 'unico'
          ? 'Factura de pago único. El proyecto iniciara una vez se confirme el pago.'
          : 'Factura de anticipo para inicio de proyecto. El proyecto iniciara una vez se confirme el pago.',
        estado: 'Pendiente de Anticipo',
        activaProyecto: true,
        creadoPor: req.user ? req.user.email : 'Sistema'
      };

      const nuevaFactura = new Factura(facturaData);
      await nuevaFactura.save();
      facturaAnticipo = nuevaFactura;

      // 6. Generar hitos
      const { generarHitosPorTipo } = require('../utils/hitosHelper');
      const hitos = generarHitosPorTipo(tipoPago, totalProyecto, idFactura);

      // 7. Crear proyecto
      const nuevoProyecto = new Proyecto({
        idProyecto: idProyecto,
        idCotizacion: cotizacion.idCotizacion,
        idCliente: cotizacion.idCliente,
        idSede: cotizacion.idSede || `${cotizacion.idCliente}-PRINCIPAL`,
        nombreEmp: cotizacion.nombreEmp || (cliente ? cliente.nombreEmp : 'Sin nombre'),
        nombreSede: nombreSede,
        direccionSede: direccionSede,
        nombreProyecto: `PROYECTO ${cotizacion.idCotizacion}`,
        fechaInicio: new Date(),
        presupuestoTotal: totalProyecto,
        porcentajeAvance: 0,
        seguimiento: 'En espera de pago...',
        estado: 'En Espera de Anticipo',
        tipoPago: tipoPago,
        anticipo: montoAnticipo,
        saldo: totalProyecto - montoAnticipo,
        creadoPor: req.user ? req.user.email : 'Sistema',
        items: cotizacion.items || [],
        tieneHitos: hitos.length > 1,
        hitos: hitos,
        cotizacionesAdicionales: [],
        facturas: [{
          idFactura: nuevaFactura.idFactura,
          valor: nuevaFactura.netoACobrar || montoAnticipo,
          fecha: nuevaFactura.fechaEmision,
          estado: nuevaFactura.estado,
          concepto: tipoPago === 'unico' ? 'Pago Único' : `Anticipo ${nuevaFactura.idFactura}`,
          metodoPago: nuevaFactura.metodoPago,
          iva: nuevaFactura.iva || 0,
          retencion: nuevaFactura.retencion || 0,
          netoACobrar: nuevaFactura.netoACobrar || 0
        }],
        valorTotalEjecutado: 0,
        valorTotalFacturado: 0
      });

      await nuevoProyecto.save();
      proyectoCreado = nuevoProyecto;
      console.log('Proyecto creado:', nuevoProyecto.idProyecto);

    } else if (estado_general === 'Aprobada' && esCotizacionAdicional) {
      console.log(`Cotizacion adicional ${cotizacion.idCotizacion} aprobada. NO se crea proyecto.`);
    }

    // 8. Guardar referencias y actualizar cotizacion
    cotizacion.estado_general = estado_general;
    if (proyectoCreado) {
      cotizacion.idProyecto = proyectoCreado.idProyecto;
    }
    if (facturaAnticipo) {
      cotizacion.idFactura = facturaAnticipo.idFactura;
    }
    cotizacion.proyectoActivo = false;
    await cotizacion.save();

    // 9. ✅ FIX COMPLETO: Convertir todo a objetos planos con .toObject()
    const respuestaSegura = {
      success: true,
      message: facturaAnticipo
        ? "Cotizacion aprobada, proyecto y factura de anticipo creados exitosamente"
        : (esCotizacionAdicional && estado_general === 'Aprobada'
          ? "Cotizacion adicional aprobada exitosamente (sin crear proyecto)"
          : `Cotizacion actualizada a estado: ${estado_general}`),
      data: cotizacion.toObject(),
      idProyecto: proyectoCreado ? proyectoCreado.idProyecto : null,
      idFactura: facturaAnticipo ? facturaAnticipo.idFactura : null,
      proyecto: proyectoCreado ? proyectoCreado.toObject() : null,
      factura: facturaAnticipo ? facturaAnticipo.toObject() : null,
      esCotizacionAdicional: esCotizacionAdicional
    };

    console.log("✅ Respuesta enviada al Frontend sin errores circulares.");
    return res.json(respuestaSegura);

  } catch (error) {
    console.error("--- ERROR EN UPDATEESTADOCOTIZACION ---", error);
    return res.status(500).json({ error: "Error al actualizar estado", details: error.message });
  }
};

// ==============================================================
// 5. ACTUALIZAR COTIZACION CON SERVICIOS (crea versionamiento con historial)
// ==============================================================
exports.updateCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      estado_general,
      items,
      subtotal,
      iva,
      total,
      anticipo,
      notasLegales,
      notas,
      ...otrosCampos
    } = req.body;

    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idCotizacion: id }] }
      : { idCotizacion: id };

    const cotizacionOriginal = await Cotizacion.findOne(filtro);
    if (!cotizacionOriginal) {
      return res.status(404).json({ error: "Cotizacion no encontrada" });
    }

    if (cotizacionOriginal.estado_general === 'Superada') {
      return res.status(403).json({ error: "No se puede modificar una cotizacion superada." });
    }
    if (cotizacionOriginal.estado_general === 'Caducada') {
      return res.status(403).json({ error: "No se puede modificar una cotizacion caducada." });
    }
    //No permitir editar cotizaciones adicionales aprobadas
    if (cotizacionOriginal.esCotizacionAdicional && cotizacionOriginal.estado_general === 'Aprobada') {
      return res.status(403).json({ error: "No se puede modificar una cotizacion adicional aprobada." });
    }

    // Determinar si hay cambios en servicios
    const cambioEnServicios = items && JSON.stringify(items) !== JSON.stringify(cotizacionOriginal.items);
    const cambioEnTotales = subtotal !== undefined || iva !== undefined || total !== undefined;
    const cambioEnNotas = notasLegales !== undefined && notasLegales !== cotizacionOriginal.notasLegales;
    const cambioEnNotasAdicionales = notas !== undefined && notas !== cotizacionOriginal.notas;

    // Si hay cambios en servicios, crear nueva version
    if (cambioEnServicios || cambioEnTotales) {
      // AÑADIR: permitir versionamiento también si es cotización adicional
      const cliente = await Cliente.findOne({ idCliente: cotizacionOriginal.idCliente });
      const vIdOriginal = cotizacionOriginal.version_id || 1;
      const diasValidez = 15 + (vIdOriginal * 3);
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + diasValidez);

      const idBase = cotizacionOriginal.idCotizacion.split('-V')[0];
      const count = await Cotizacion.countDocuments({
        idCotizacion: { $regex: `^${idBase}-V` }
      });
      const nuevaVersionId = count + 1;
      const nuevoIdCotizacion = `${idBase}-V${nuevaVersionId}`;


      // Guardar snapshot de la version anterior en historial
      const snapshotVersionAnterior = {
        version_id: cotizacionOriginal.version_id,
        idCotizacion: cotizacionOriginal.idCotizacion,
        fechaVersion: cotizacionOriginal.fechaVersion || cotizacionOriginal.createdAt,
        estado_general: cotizacionOriginal.estado_general,
        total: cotizacionOriginal.total,
        subtotal: cotizacionOriginal.subtotal,
        iva: cotizacionOriginal.iva,
        anticipo: cotizacionOriginal.anticipo,
        items: cotizacionOriginal.items,
        notas: cotizacionOriginal.notas,
        notasLegales: cotizacionOriginal.notasLegales,
        tipoPago: cotizacionOriginal.tipoPago,
        metodoPago: cotizacionOriginal.metodoPago,
        fechaVencimiento: cotizacionOriginal.fechaVencimiento,
        guardadoPor: req.user?.email || 'Sistema',
        fechaGuardado: new Date()
      };

      // Agregar al historial de la nueva cotizacion
      const historialExistente = cotizacionOriginal.historialVersiones || [];

      const nuevaCotizacion = new Cotizacion({
        ...cotizacionOriginal.toObject(),
        _id: undefined,
        idCotizacion: nuevoIdCotizacion,
        version_id: nuevaVersionId,
        estado_general: 'Pendiente',
        fechaVencimiento: fechaVencimiento,
        fechaVersion: new Date(),
        items: items || cotizacionOriginal.items,
        subtotal: subtotal !== undefined ? subtotal : cotizacionOriginal.subtotal,
        iva: iva !== undefined ? iva : cotizacionOriginal.iva,
        total: total !== undefined ? total : cotizacionOriginal.total,
        anticipo: anticipo !== undefined ? anticipo : (total !== undefined ? total * 0.40 : cotizacionOriginal.anticipo),
        notasLegales: notasLegales !== undefined ? notasLegales : cotizacionOriginal.notasLegales,
        notas: notas !== undefined ? notas : cotizacionOriginal.notas,
        esCotizacionAdicional: cotizacionOriginal.esCotizacionAdicional || false,
        idProyectoOrigen: cotizacionOriginal.idProyectoOrigen || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // NUEVO: Incluir historial de versiones
        historialVersiones: [...historialExistente, snapshotVersionAnterior]
      });

      await nuevaCotizacion.save();

      // Marcar anterior como Superada
      cotizacionOriginal.estado_general = 'Superada';
      await cotizacionOriginal.save();

      // ✅ FIX: Convertir a objeto plano antes de enviar
      return res.json({
        success: true,
        message: `Nueva version creada: ${nuevoIdCotizacion}. Version anterior marcada como Superada.`,
        data: nuevaCotizacion.toObject(),
        esVersion: true,
        versionAnterior: cotizacionOriginal.idCotizacion
      });
    }

    // Si solo cambia estado
    if (estado_general && estado_general !== cotizacionOriginal.estado_general) {
      cotizacionOriginal.estado_general = estado_general;
    }
    // Si solo cambia notas
    if (cambioEnNotas) {
      cotizacionOriginal.notasLegales = notasLegales;
    }
    if (cambioEnNotasAdicionales) {
      cotizacionOriginal.notas = notas;
    }

    // Aplicar otros campos permitidos
    const camposPermitidos = ['fechaVencimiento', 'creadoPor', 'metodoPago', 'tipoPago'];
    camposPermitidos.forEach(campo => {
      if (otrosCampos[campo] !== undefined) {
        cotizacionOriginal[campo] = otrosCampos[campo];
      }
    });

    await cotizacionOriginal.save();

    // ✅ FIX: Convertir a objeto plano antes de enviar
    res.json({
      success: true,
      message: "Cotizacion actualizada correctamente",
      data: cotizacionOriginal.toObject(),
      esVersion: false
    });

  } catch (error) {
    console.error("--- ERROR EN UPDATECOTIZACION ---", error);
    res.status(500).json({ error: "Error al actualizar cotizacion", details: error.message });
  }
};

// ==============================================================
// 6. RECHAZAR COTIZACION
// ==============================================================
exports.rechazarCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idCotizacion: id }] }
      : { idCotizacion: id };

    const cotizacion = await Cotizacion.findOne(filtro);
    if (!cotizacion) {
      return res.status(404).json({ error: "Cotizacion no encontrada" });
    }
    if (cotizacion.estado_general !== 'Pendiente') {
      return res.status(400).json({
        error: `Solo cotizaciones Pendientes pueden rechazarse. Estado actual: ${cotizacion.estado_general}`
      });
    }
    cotizacion.estado_general = 'Rechazada';
    await cotizacion.save();

    // ✅ FIX: Convertir a objeto plano antes de enviar
    res.json({
      success: true,
      message: "Cotizacion rechazada y archivada correctamente",
      data: cotizacion.toObject()
    });
  } catch (error) {
    console.error("--- ERROR EN RECHAZARCOTIZACION ---", error);
    res.status(500).json({ error: "Error al rechazar cotizacion", details: error.message });
  }
};

// ==============================================================
// 7. ELIMINAR COTIZACION
// ==============================================================
exports.deleteCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const esObjectId = mongoose.Types.ObjectId.isValid(id);
    const filtro = esObjectId
      ? { $or: [{ _id: id }, { idCotizacion: id }] }
      : { idCotizacion: id };

    const cotizacion = await Cotizacion.findOne(filtro);
    if (!cotizacion) {
      return res.status(404).json({ error: "Cotizacion no encontrada" });
    }

    // CORRECCION: No permitir eliminar cotizaciones aprobadas o con factura pagada
    if (cotizacion.estado_general === 'Aprobada') {
      return res.status(403).json({
        success: false,
        error: "No se puede eliminar una cotizacion aprobada"
      });
    }

    await Cotizacion.findOneAndDelete(filtro);
    res.json({ success: true, message: "Cotizacion eliminada correctamente" });

  } catch (error) {
    console.error("--- ERROR EN DELETECOTIZACION ---", error);
    res.status(500).json({ error: "Error al eliminar cotizacion", details: error.message });
  }
};