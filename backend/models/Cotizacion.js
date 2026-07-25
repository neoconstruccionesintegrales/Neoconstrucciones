const mongoose = require('mongoose');

const cotizacionSchema = new mongoose.Schema({
  // ID principal
  idCotizacion: { type: String, required: true, index: true },
  idCliente: { type: String, required: true },
  idSede: { type: String, required: true },
  nombreEmp: String,
  fecha: { type: Date, default: Date.now },

  // Items de servicios
  items: [{
    idServicio: String,
    nombreServicio: String,
    descripcion: String,
    precioUnitario: Number,
    cantidad: Number,
    unidad: { type: String, default: 'und' },
    subtotal: Number
  }],

  // Totales
  subtotal: Number,
  iva: Number,
  total: Number,

  // Estado y versionamiento
  estado_general: {
    type: String,
    enum: ['Pendiente', 'Aprobada', 'Superada', 'Rechazada', 'Caducada'],
    default: 'Pendiente'
  },
  version_id: { type: Number, default: 1 },
  fechaVersion: { type: Date, default: Date.now },
  fechaVencimiento: Date,

  // Notas
  notasLegales: String,
  notas: { type: String, default: '' },

  // Finanzas
  anticipo: { type: Number, required: true },

  // Metadata
  creadoPor: String,

  // Relacion con proyecto (cotizacion normal aprobada)
  idProyecto: { type: String, default: null },
  idFactura: { type: String, default: null },
  proyectoActivo: { type: Boolean, default: false },

  // ============================================================
  // COTIZACIONES ADICIONALES (desde modulo Proyectos)
  // ============================================================
  esCotizacionAdicional: { type: Boolean, default: false },
  idProyectoOrigen: { type: String, default: null },

  // Tipo y metodo de pago
  tipoPago: {
    type: String,
    enum: ['unico', 'anticipo_final', 'por_etapas', 'personalizado'],
    default: 'anticipo_final'
  },
  metodoPago: {
    type: String,
    enum: ['Transferencia Bancaria', 'Efectivo', 'Cheque Corporativo', 'Pasarela de pago Online', 'Tarjeta de credito/debito'],
    default: 'Transferencia Bancaria'
  },

  // Facturas generadas al aprobar
  facturasGeneradas: [{
    idFactura: String,
    valor: Number,
    estado: String,
    fecha: Date
  }],

  // Aprobacion
  aprobadaPor: { type: String, default: null },
  fechaAprobacion: { type: Date, default: null },

  // ============================================================
  // NUEVO: Historial de versiones anteriores
  // ============================================================
  historialVersiones: [{
    version_id: Number,
    idCotizacion: String,
    fechaVersion: Date,
    estado_general: String,
    total: Number,
    subtotal: Number,
    iva: Number,
    anticipo: Number,
    items: [{
      idServicio: String,
      nombreServicio: String,
      descripcion: String,
      precioUnitario: Number,
      cantidad: Number,
      unidad: { type: String, default: 'und' },
      subtotal: Number
    }],
    notas: String,
    notasLegales: String,
    tipoPago: String,
    metodoPago: String,
    fechaVencimiento: Date,
    guardadoPor: String,
    fechaGuardado: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

// Indice unico: idCotizacion + version_id
cotizacionSchema.index({ idCotizacion: 1, version_id: 1 }, { unique: true });

// Indice para filtrar cotizaciones adicionales eficientemente
cotizacionSchema.index({ esCotizacionAdicional: 1 });
cotizacionSchema.index({ idProyectoOrigen: 1 });
cotizacionSchema.index({ estado_general: 1 });

// Virtual para referenciar al cliente
cotizacionSchema.virtual('clienteDetalle', {
  ref: 'Cliente',
  localField: 'idCliente',
  foreignField: 'idCliente',
  justOne: true
});

// Incluir virtuales en JSON y Object
cotizacionSchema.set('toJSON', { virtuals: true });
cotizacionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.Cotizacion || mongoose.model('Cotizacion', cotizacionSchema);