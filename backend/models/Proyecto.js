const mongoose = require('mongoose');

// ============================================================
// 1. Sub-schema cotizaciones adicionales (referencia enriquecida)
// ============================================================
const CotizacionAdicionalRefSchema = new mongoose.Schema({
  idCotizacion: { type: String, required: true },
  valor: { type: Number, default: 0 },
  descripcion: { type: String, default: '' },
  fechaAgregado: { type: Date, default: Date.now },
  estado: { type: String, default: 'Pendiente' },
  notas: { type: String, default: '' },
  total: { type: Number, default: 0 },
  fecha: { type: Date, default: Date.now }
}, { _id: true });

// ============================================================
// 2. Sub-schema para facturas vinculadas al proyecto
// ============================================================
const FacturaSubSchema = new mongoose.Schema({
  idFactura: { type: String, required: true },
  valor: { type: Number, required: true, min: 0 },
  fecha: { type: Date, default: Date.now },
  estado: {
    type: String,
    enum: ['Pendiente de Anticipo', 'Anticipo ya Pagado', 'Pendiente de Saldo', 
         'Pendiente de 2da Etapa', 'Pagada', 'Anulada', 'Vencido'],
    default: 'Pendiente de Anticipo'
  },
  tipoPago: {
    type: String,
    enum: ['unico', 'anticipo_final', 'por_etapas', 'personalizado'],
    default: 'anticipo_final'
  },
  concepto: String,
  metodoPago: {
    type: String,
    enum: ['Transferencia Bancaria', 'Efectivo', 'Cheque Corporativo', 'Pasarela de pago Online', 'Tarjeta de credito/debito'],
    default: 'Transferencia Bancaria'
  },
  iva: { type: Number, default: 0 },
  retencion: { type: Number, default: 0 },
  netoACobrar: { type: Number, default: 0 },
  esFacturaAdicional: { type: Boolean, default: false },
  idCotizacionAdicional: { type: String, default: null },
  // Referencia al hito que paga esta factura
  idHito: { type: String, default: null },
  numeroHito: { type: Number, default: null },
  porcentajeSaldo: { type: Number, default: null },
  hitosCubiertos: [{ type: String, default: null }],
  items: [{
    idServicio: String,
    nombreServicio: String,
    descripcion: String,
    cantidad: { type: Number, default: 1 },
    precioUnitario: { type: Number, default: 0 },
    unidad: { type: String, default: 'und' },
    subtotal: { type: Number, default: 0 }
  }],
}, { _id: true });

// ============================================================
// 3. Sub-schema para seguimientos
// ============================================================
const SeguimientoSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  tipo: {
    type: String,
    enum: ['avance', 'novedad', 'retraso', 'visita', 'entrega', 'pago'],
    default: 'avance'
  },
  descripcion: { type: String, required: true },
  porcentajeAvance: { type: Number, default: 0, min: 0, max: 100 },
  evidencias: [{ type: String }],
  creadoPor: { type: String, default: 'Sistema' }
}, { _id: true });

// ============================================================
// 4. Sub-schema para hitos (MEJORADO)
// ============================================================
const HitoSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  idHito: { type: String, required: true },
  numeroHito: { type: Number, required: true },
  nombre: { type: String, required: true },
  descripcion: { type: String, default: '' },
  porcentajePago: { type: Number, default: 0, min: 0, max: 100 },
  porcentajePeso: { type: Number, default: 0, min: 0, max: 100 },
  montoEstimado: { type: Number, default: 0 },
  completado: { type: Boolean, default: false },
  fechaCompletado: { type: Date, default: null },
  facturaGenerada: { type: Boolean, default: false },
  idFactura: { type: String, default: null },
  tipoPago: { type: String, default: 'anticipo_final' },
  cubiertoPorSaldo: { type: Boolean, default: false },
  idFacturaSaldo: { type: String, default: null }
}, { _id: true });

// ============================================================
// 5. Schema principal del Proyecto
// ============================================================
const ProyectoSchema = new mongoose.Schema({
  // IDs
  idProyecto: { type: String, required: true, unique: true },
  idCotizacion: { type: String, default: null },
  idCliente: { type: String, required: true },
  idSede: { type: String, required: true },

  // Datos del cliente (denormalizados para rapido acceso)
  nombreEmp: { type: String, default: '' },
  nombreSede: { type: String, default: 'Principal' },
  direccionSede: { type: String, default: '' },

  // Nombre del proyecto (editable)
  nombreProyecto: { type: String, required: true },

  // Fechas
  fechaInicio: { type: Date, default: Date.now },
  fechaFin: { type: Date, default: null },
  fechaActivacion: { type: Date, default: null },

  // Presupuesto y finanzas
  presupuestoTotal: { type: Number, required: true, min: 0 },
  anticipo: { type: Number, default: 0 },
  saldo: { type: Number, default: 0 },

  // Avance
  porcentajeAvance: { type: Number, default: 0, min: 0, max: 100 },
  seguimiento: { type: String, default: 'Iniciando proyecto...' },

  // Estado del proyecto
  estado: {
    type: String,
    enum: ['Creado', 'En Espera de Anticipo', 'Iniciado', 'En Ejecucion', 'Finalizado', 'Cancelado'],
    default: 'Creado'
  },

  // Tipo de pago
  tipoPago: {
    type: String,
    enum: ['unico', 'anticipo_final', 'por_etapas', 'personalizado'],
    default: 'anticipo_final'
  },

  // Hitos (MEJORADO - ahora usa HitoSchema)
  tieneHitos: { type: Boolean, default: false },
  hitos: [HitoSchema],

  // Relaciones financieras
  cotizacionesAdicionales: [CotizacionAdicionalRefSchema],
  seguimientos: [SeguimientoSchema],
  facturas: [FacturaSubSchema],

  // Totales calculados
  valorTotalEjecutado: { type: Number, default: 0 },
  valorTotalFacturado: { type: Number, default: 0 },

  // Items heredados de la cotizacion
  items: { type: Array, default: [] },

  // Metadata
  creadoPor: { type: String, default: 'Sistema' }
}, { timestamps: true });

// ============================================================
// Middleware pre-save
// ============================================================
ProyectoSchema.pre('save', async function() {
  // Calcular saldo
  if (this.isModified('presupuestoTotal') || this.isModified('anticipo')) {
    this.saldo = (this.presupuestoTotal || 0) - (this.anticipo || 0);
  }

  // Calcular valorTotalEjecutado
  const base = this.presupuestoTotal || 0;
  const adicionales = (this.cotizacionesAdicionales || []).reduce(
    (acc, c) => acc + (c.total || c.valor || 0), 0
  );
  this.valorTotalEjecutado = base + adicionales;

  // Calcular valorTotalFacturado desde facturas
  if (this.facturas && this.facturas.length > 0) {
    this.valorTotalFacturado = this.facturas.reduce(
      (acc, f) => acc + (f.valor || 0), 0
    );
  }

  // El avance se maneja manualmente desde seguimientos
  // this.actualizarAvanceDesdeHitos();
});

// ============================================================
// Metodos de instancia
// ============================================================

// NUEVO: Completar un hito
ProyectoSchema.methods.completarHito = function(idHito, idFacturaPagada = null) {
  const hito = this.hitos.find(h => h.idHito === idHito);
  if (!hito) return { success: false, message: 'Hito no encontrado' };
  
  if (hito.completado) {
    return { success: false, message: 'El hito ya está completado' };
  }

  // Verificar que el hito anterior esté completado
  const index = this.hitos.findIndex(h => h.idHito === idHito);
  if (index > 0 && !this.hitos[index - 1].completado) {
    return { success: false, message: 'Debe completar el hito anterior primero' };
  }

  hito.completado = true;
  hito.fechaCompletado = new Date();
  if (idFacturaPagada) {
    hito.idFactura = idFacturaPagada;
  }

  return { success: true, message: 'Hito completado', hito };
};

// NUEVO: Obtener siguiente hito pendiente
ProyectoSchema.methods.obtenerSiguienteHitoPendiente = function() {
  if (!this.hitos || this.hitos.length === 0) return null;
  return this.hitos.find(h => !h.completado) || null;
};

// NUEVO: Obtener hito por ID de factura
ProyectoSchema.methods.obtenerHitoPorFactura = function(idFactura) {
  if (!this.hitos || this.hitos.length === 0) return null;
  return this.hitos.find(h => h.idFactura === idFactura) || null;
};

// NUEVO: Marcar hito como factura generada
ProyectoSchema.methods.marcarHitoFacturado = function(idHito, idFactura) {
  const hito = this.hitos.find(h => h.idHito === idHito);
  if (!hito) return { success: false, message: 'Hito no encontrado' };
  
  hito.facturaGenerada = true;
  hito.idFactura = idFactura;
  
  return { success: true, message: 'Hito marcado como facturado', hito };
};

// NUEVO: Verificar si se puede generar factura para un hito
ProyectoSchema.methods.puedeGenerarFacturaHito = function(idHito) {
  const hito = this.hitos.find(h => h.idHito === idHito);
  if (!hito) return { puede: false, razon: 'Hito no encontrado' };
  if (hito.facturaGenerada) return { puede: false, razon: 'El hito ya tiene factura generada' };
  
  const index = this.hitos.findIndex(h => h.idHito === idHito);
  if (index === 0) return { puede: true }; // Primer hito siempre
  
  const anterior = this.hitos[index - 1];
  if (!anterior.completado) {
    return { puede: false, razon: `Debe completar el hito anterior: ${anterior.nombre}` };
  }
  
  return { puede: true };
};

// NUEVO: Obtener porcentaje total facturado de hitos
ProyectoSchema.methods.obtenerPorcentajeFacturadoHitos = function() {
  if (!this.hitos || this.hitos.length === 0) return 0;
  return this.hitos.reduce((acc, h) => acc + (h.facturaGenerada ? h.porcentajePago : 0), 0);
};

ProyectoSchema.methods.actualizarAvanceDesdeHitos = function() {
  if (!this.tieneHitos || !this.hitos || this.hitos.length === 0) {
    return;
  }
  const pesoTotal = this.hitos.reduce((acc, h) => acc + (h.porcentajePeso || 0), 0);
  if (pesoTotal === 0) return;
  const avance = this.hitos.reduce((acc, h) => {
    return acc + (h.completado ? (h.porcentajePeso || 0) : 0);
  }, 0);
  this.porcentajeAvance = Math.min(100, Math.round((avance / pesoTotal) * 100));
};

ProyectoSchema.methods.agregarSeguimiento = function(datos) {
  this.seguimientos.push({
    fecha: datos.fecha || new Date(),
    tipo: datos.tipo || 'avance',
    descripcion: datos.descripcion,
    porcentajeAvance: datos.porcentajeAvance || this.porcentajeAvance,
    evidencias: datos.evidencias || [],
    creadoPor: datos.creadoPor || 'Sistema'
  });
  if (datos.porcentajeAvance !== undefined) {
    this.porcentajeAvance = datos.porcentajeAvance;
  }
};

module.exports = mongoose.model('Proyecto', ProyectoSchema);