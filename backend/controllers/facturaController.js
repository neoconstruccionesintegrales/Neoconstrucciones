// controllers/facturaController.js factura independiente
const mongoose = require('mongoose');
const Factura = require('../models/Factura');
const Cliente = require('../models/clientes');
const Contador = require('../models/Contador');

// ==============================================================
// 1. CREAR FACTURA INDEPENDIENTE
// ==============================================================
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
            iva,
            ivaPorcentaje,
            retencion,
            retencionPorcentaje,
            totalConIva,
            netoACobrar,
            notas,
            notasLegales,
            fechaEmision,
            fechaVencimiento,
            esIndependiente,
            estado
        } = req.body;

        // Validaciones
        if (!idCliente) {
            return res.status(400).json({ error: "El campo idCliente es obligatorio" });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Debe tener al menos un item" });
        }

        // Validar que los items tengan nombre
        for (const item of items) {
            if (!item.nombreServicio || item.nombreServicio.trim() === '') {
                return res.status(400).json({ error: "Todos los items deben tener un nombre de servicio" });
            }
        }

        // Buscar cliente para validar
        const cliente = await Cliente.findOne({ idCliente: idCliente });
        if (!cliente) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        }

        // Generar ID de factura (mismo consecutivo)
        const siguienteNumero = await Contador.obtenerSiguiente('facturas');
        const idFactura = `FAC-${String(siguienteNumero).padStart(3, '0')}`;

        // Determinar sede
        const esPrincipal = String(idSede).includes('PRINCIPAL');
        let sedeData = null;
        if (!esPrincipal && cliente.sedes) {
            sedeData = cliente.sedes.find(s => s.id === idSede);
        }

        const nombreSedeFinal = esPrincipal 
            ? 'Sede Principal (Administrativa)' 
            : (sedeData?.nombreSede || nombreSede || 'Principal');

        const direccionSedeFinal = esPrincipal 
            ? (cliente.direccion || '') 
            : (sedeData?.direccion || direccionSede || '');

        const nitClienteFinal = esPrincipal 
            ? (cliente.nit || '') 
            : (sedeData?.nitEncargado || cliente.nit || '');

        const contactoClienteFinal = esPrincipal 
            ? (cliente.telefono || cliente.celular || '') 
            : (sedeData?.celular || cliente.telefono || '');

        const correoClienteFinal = esPrincipal 
            ? (cliente.correo || '') 
            : (sedeData?.correoEnc || cliente.correo || '');

        // Calcular totales si no vienen
        const subtotalFinal = subtotal || items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
        const ivaPorcentajeFinal = ivaPorcentaje || 19;
        const retencionPorcentajeFinal = retencionPorcentaje || 2;
        const ivaFinal = iva || Math.round(subtotalFinal * (ivaPorcentajeFinal / 100));
        const totalConIvaFinal = totalConIva || subtotalFinal + ivaFinal;
        const retencionFinal = retencion || Math.round(subtotalFinal * (retencionPorcentajeFinal / 100));
        const netoACobrarFinal = netoACobrar || totalConIvaFinal - retencionFinal;

        // Crear factura
        const nuevaFactura = new Factura({
            idFactura,
            idProyecto: `IND-${idFactura}`, // ID ficticio para facturas independientes
            idCliente,
            nombreEmpresa: nombreEmpresa || cliente.nombreEmp,
            nombreSede: nombreSedeFinal,
            direccionSede: direccionSedeFinal,
            nitCliente: nitClienteFinal,
            contactoCliente: contactoClienteFinal,
            correoCliente: correoClienteFinal,
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
            items: items.map(item => ({
                idServicio: item.idServicio || '',
                nombreServicio: item.nombreServicio,
                descripcion: item.descripcion || '',
                cantidad: item.cantidad || 1,
                precioUnitario: item.precioUnitario || 0,
                unidad: item.unidad || 'und',
                subtotal: item.subtotal || (item.cantidad * item.precioUnitario) || 0
            })),
            subtotal: subtotalFinal,
            anticipoRequerido: 0,
            anticipoPorcentaje: 0,
            saldoRestante: 0,
            saldoPorcentaje: 0,
            iva: ivaFinal,
            ivaPorcentaje: ivaPorcentajeFinal,
            retencion: retencionFinal,
            retencionPorcentaje: retencionPorcentajeFinal,
            totalConIva: totalConIvaFinal,
            netoACobrar: netoACobrarFinal,
            presupuestoTotalProyecto: subtotalFinal,
            notas: notas || '',
            notasLegales: notasLegales || '',
            estado: estado || 'Emitida',
            esFacturaAdicional: false,
            activaProyecto: false,
            creadoPor: req.user?.email || req.user?.nombre || 'Sistema'
        });

        await nuevaFactura.save();

        res.status(201).json({
            success: true,
            message: "Factura independiente creada exitosamente",
            data: nuevaFactura
        });

    } catch (error) {
        console.error("--- ERROR EN CREAR FACTURA INDEPENDIENTE ---", error);
        if (error.code === 11000) {
            return res.status(409).json({ error: "Conflicto de ID", details: "Ya existe una factura con este ID" });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: "Datos inválidos", details: error.errors });
        }
        res.status(500).json({ error: "Error interno", details: error.message });
    }
};

// ==============================================================
// 2. OBTENER TODAS LAS FACTURAS (incluyendo independientes)
// ==============================================================
exports.getAllFacturas = async (req, res) => {
    try {
        const facturas = await Factura.find().sort({ createdAt: -1 });
        res.json({ success: true, data: facturas });
    } catch (error) {
        console.error("Error en getAllFacturas:", error);
        res.status(500).json({ success: false, error: "Error al obtener facturas", details: error.message });
    }
};

// ==============================================================
// 3. OBTENER FACTURA POR ID
// ==============================================================
exports.getFacturaById = async (req, res) => {
    try {
        const { id } = req.params;
        const esObjectId = mongoose.Types.ObjectId.isValid(id);
        const filtro = esObjectId
            ? { $or: [{ _id: id }, { idFactura: id }] }
            : { idFactura: id };

        const factura = await Factura.findOne(filtro);
        if (!factura) {
            return res.status(404).json({ success: false, message: "Factura no encontrada" });
        }

        // Enriquecer con datos del cliente si es necesario
        const cliente = await Cliente.findOne({ idCliente: factura.idCliente });
        const facturaEnriquecida = factura.toObject();
        if (cliente) {
            facturaEnriquecida.clienteDetalle = cliente;
        }

        res.json({ success: true, data: facturaEnriquecida });
    } catch (error) {
        console.error("Error en getFacturaById:", error);
        res.status(500).json({ success: false, error: "Error al obtener factura", details: error.message });
    }
};

// ==============================================================
// 4. ACTUALIZAR ESTADO DE FACTURA
// ==============================================================
exports.updateEstadoFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({ error: "El campo estado es obligatorio" });
        }

        const esObjectId = mongoose.Types.ObjectId.isValid(id);
        const filtro = esObjectId
            ? { $or: [{ _id: id }, { idFactura: id }] }
            : { idFactura: id };

        const factura = await Factura.findOne(filtro);
        if (!factura) {
            return res.status(404).json({ error: "Factura no encontrada" });
        }

        // Validar transiciones de estado según tipo de factura
        const esIndependiente = factura.idProyecto && factura.idProyecto.startsWith('IND-');
        const estadosValidos = esIndependiente 
            ? ['Emitida', 'Pagada', 'Anulada']
            : ['Pendiente de Anticipo', 'Anticipo ya Pagado', 'Pendiente de Saldo', 'Pendiente de 2da Etapa', 'Pagada', 'Anulada', 'Vencido'];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ 
                error: `Estado no válido para este tipo de factura. Estados permitidos: ${estadosValidos.join(', ')}` 
            });
        }

        // Validar que no se pueda pagar una factura ya anulada
        if (factura.estado === 'Anulada') {
            return res.status(400).json({ error: "No se puede modificar una factura anulada" });
        }

        // Validar que no se pueda anular una factura pagada
        if (factura.estado === 'Pagada' && estado !== 'Anulada') {
            return res.status(400).json({ error: "No se puede modificar una factura pagada" });
        }

        // Si se marca como pagada, actualizar fechas
        if (estado === 'Pagada') {
            factura.fechaPagoTotal = new Date();
            if (!factura.fechaPagoAnticipo) {
                factura.fechaPagoAnticipo = new Date();
            }
        }

        // Si se marca como anticipo pagado
        if (estado === 'Anticipo ya Pagado') {
            factura.fechaPagoAnticipo = new Date();
        }

        // Si se anula, validar que no esté pagada
        if (estado === 'Anulada' && factura.estado === 'Pagada') {
            return res.status(400).json({ error: "No se puede anular una factura pagada" });
        }

        factura.estado = estado;
        await factura.save();

        // Si es factura de proyecto, actualizar el proyecto relacionado
        if (!esIndependiente && factura.idProyecto && !factura.idProyecto.startsWith('IND-')) {
            const Proyecto = require('../models/Proyecto');
            const proyecto = await Proyecto.findOne({ idProyecto: factura.idProyecto });
            if (proyecto) {
                // Actualizar estado del proyecto si la factura se paga
                if (estado === 'Pagada') {
                    // Verificar si todas las facturas del proyecto están pagadas
                    const todasFacturas = await Factura.find({ idProyecto: factura.idProyecto });
                    const todasPagadas = todasFacturas.every(f => f.estado === 'Pagada');
                    if (todasPagadas) {
                        proyecto.estado = 'Completado';
                        proyecto.porcentajeAvance = 100;
                    } else {
                        proyecto.estado = 'En Ejecución';
                    }
                    await proyecto.save();
                }
            }
        }

        res.json({
            success: true,
            message: `Factura actualizada a estado: ${estado}`,
            data: factura
        });

    } catch (error) {
        console.error("--- ERROR EN UPDATEESTADOFACTURA ---", error);
        res.status(500).json({ error: "Error al actualizar estado", details: error.message });
    }
};

// ==============================================================
// 5. ELIMINAR FACTURA
// ==============================================================
exports.deleteFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const esObjectId = mongoose.Types.ObjectId.isValid(id);
        const filtro = esObjectId
            ? { $or: [{ _id: id }, { idFactura: id }] }
            : { idFactura: id };

        const factura = await Factura.findOne(filtro);
        if (!factura) {
            return res.status(404).json({ error: "Factura no encontrada" });
        }

        // No permitir eliminar facturas pagadas
        if (factura.estado === 'Pagada') {
            return res.status(403).json({ error: "No se puede eliminar una factura pagada" });
        }

        await Factura.findOneAndDelete(filtro);
        res.json({ success: true, message: "Factura eliminada correctamente" });

    } catch (error) {
        console.error("--- ERROR EN DELETEFACTURA ---", error);
        res.status(500).json({ error: "Error al eliminar factura", details: error.message });
    }
};
// controllers/facturaController.js

// ==============================================================
// 6. ANULAR FACTURA (libera hitos automáticamente)
// ==============================================================
exports.anularFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const esObjectId = mongoose.Types.ObjectId.isValid(id);
        const filtro = esObjectId
            ? { $or: [{ _id: id }, { idFactura: id }] }
            : { idFactura: id };

        const factura = await Factura.findOne(filtro);
        if (!factura) {
            return res.status(404).json({ error: "Factura no encontrada" });
        }

        // No permitir anular facturas pagadas
        if (factura.estado === 'Pagada') {
            return res.status(400).json({ error: "No se puede anular una factura pagada" });
        }

        // Si ya está anulada, no hacer nada
        if (factura.estado === 'Anulada') {
            return res.status(400).json({ error: "La factura ya está anulada" });
        }

        // Guardar estado anterior para posibles liberaciones de hitos
        const estadoAnterior = factura.estado;
        factura.estado = 'Anulada';

        // Si es factura de proyecto, liberar hitos asociados
        const esIndependiente = factura.idProyecto && factura.idProyecto.startsWith('IND-');
        if (!esIndependiente && factura.idProyecto) {
            const Proyecto = require('../models/Proyecto');
            const proyecto = await Proyecto.findOne({ idProyecto: factura.idProyecto });
            if (proyecto) {
                // Liberar hitos que dependían de esta factura
                const hitosLiberados = proyecto.hitos?.filter(h => 
                    h.idFacturaAsociada === factura.idFactura && 
                    h.estado === 'Pendiente'
                ) || [];

                if (hitosLiberados.length > 0) {
                    // Marcar hitos como liberados (opcional)
                    proyecto.hitos = proyecto.hitos.map(h => {
                        if (h.idFacturaAsociada === factura.idFactura) {
                            return { ...h, estado: 'Liberado por Anulación', fechaLiberacion: new Date() };
                        }
                        return h;
                    });
                    await proyecto.save();
                }
            }
        }

        await factura.save();

        res.json({
            success: true,
            message: `Factura ${factura.idFactura} anulada exitosamente`,
            data: factura,
            estadoAnterior: estadoAnterior
        });

    } catch (error) {
        console.error("--- ERROR EN ANULAR FACTURA ---", error);
        res.status(500).json({ error: "Error al anular factura", details: error.message });
    }
};

// ==============================================================
// 7. OBTENER FACTURAS POR PROYECTO
// ==============================================================
exports.getFacturasByProyecto = async (req, res) => {
    try {
        const { idProyecto } = req.params;
        const facturas = await Factura.find({ idProyecto }).sort({ fechaEmision: -1 });
        res.json({ success: true, data: facturas });
    } catch (error) {
        console.error("Error en getFacturasByProyecto:", error);
        res.status(500).json({ error: "Error al obtener facturas", details: error.message });
    }
};

// ==============================================================
// 8. OBTENER FACTURAS POR CLIENTE
// ==============================================================
exports.getFacturasByCliente = async (req, res) => {
    try {
        const { idCliente } = req.params;
        const facturas = await Factura.find({ idCliente }).sort({ fechaEmision: -1 });
        res.json({ success: true, data: facturas });
    } catch (error) {
        console.error("Error en getFacturasByCliente:", error);
        res.status(500).json({ error: "Error al obtener facturas", details: error.message });
    }
};