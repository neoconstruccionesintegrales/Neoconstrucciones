const mongoose = require('mongoose');

// ========== MODELO CONTADOR ==========
const ContadorSchema = new mongoose.Schema({
  coleccion: { type: String, required: true, unique: true },
  secuencia: { type: Number, default: 0 }
});

ContadorSchema.statics.obtenerSiguiente = async function(coleccion) {
  const contador = await this.findOneAndUpdate(
    { coleccion },
    { $inc: { secuencia: 1 } },
    { new: true, upsert: true }
  );
  return contador.secuencia;
};

const Contador = mongoose.model('Contador', ContadorSchema);

// ========== SCHEMA DE FACTURA ==========
const FacturaSchema = new mongoose.Schema({
  // ID
  idFactura: { type: String, required: true, unique: true, index: true },

  // Relaciones
  idProyecto: { type: String, required: true, index: true },
  idCotizacion: { type: String, default: null },
  idCliente: { type: String, required: true },
  retencionInformativa: { type: Number, default: 0 }, 

  // ============================================================
  // DATOS DEL CLIENTE (denormalizados)
  // ============================================================
  nombreEmpresa: { type: String, required: true },
  nombreSede: { type: String, default: 'Principal' },
  direccionSede: { type: String, default: '' },
  nitCliente: { type: String, default: '' },
  contactoCliente: { type: String, default: '' },
  correoCliente: { type: String, default: '' },

  // ============================================================
  // DATOS DEL PROYECTO
  // ============================================================
  nombreProyecto: { type: String, required: true },

  // ============================================================
  // DATOS DEL EMISOR (Neoconstrucciones Integrales SAS)
  // ============================================================
  datosEmisor: {
    razonSocial: { type: String, default: 'Neoconstrucciones Integrales SAS' },
    nit: { type: String, default: '901.421.096-1' },
    direccion: { type: String, default: 'Calle 11c No.80B-70' },
    celular: { type: String, default: '3017223223' },
    correoElectronico: { type: String, default: 'neoconstruccionesintegrales@gmail.com' }
  },

  // ============================================================
  // METODO DE PAGO (extendido)
  // ============================================================
  metodoPago: {
    type: String,
    enum: ['Transferencia Bancaria', 'Efectivo', 'Cheque Corporativo', 'Pasarela de pago Online', 'Tarjeta de credito/debito'],
    default: 'Transferencia Bancaria'
  },

  // ============================================================
  // FECHAS
  // ============================================================
  fechaEmision: { type: Date, default: Date.now },
  fechaVencimiento: { type: Date, default: null },
  fechaPagoAnticipo: { type: Date, default: null },
  fechaPagoTotal: { type: Date, default: null },

  // ============================================================
  // ITEMS / CATALOGO DE SERVICIOS
  // ============================================================
  items: [{
    idServicio: String,
    nombreServicio: String,
    descripcion: String,
    cantidad: { type: Number, default: 1 },
    precioUnitario: { type: Number, default: 0 },
    unidad: { type: String, default: 'und' },
    subtotal: { type: Number, default: 0 }
  }],

  // ============================================================
  // FINANZAS
  // ============================================================
  subtotal: { type: Number, required: true, min: 0 },
  anticipoRequerido: { type: Number, default: 0 },
  anticipoPorcentaje: { type: Number, default: 40 },
  saldoRestante: { type: Number, default: 0 },
  saldoPorcentaje: { type: Number, default: 60 },
  iva: { type: Number, default: 0 },
  ivaPorcentaje: { type: Number, default: 19 },
  retencion: { type: Number, default: 0 },
  retencionPorcentaje: { type: Number, default: 2 },
  totalConIva: { type: Number, default: 0 },
  netoACobrar: { type: Number, default: 0 },
  retencionInformativa: { type: Number, default: 0 },
  presupuestoTotalProyecto: { type: Number, default: 0 },

  // ============================================================
  // NOTAS
  // ============================================================
  notas: { type: String, default: '' },
  notasLegales: { type: String, default: '' },
  notasAdicionales: { type: String, default: '' },

  // ============================================================
  // ESTADO (extendido)
  // ============================================================
  estado: {
  type: String,
  enum: [
    'Pendiente de Anticipo',
    'Anticipo ya Pagado',
    'Pendiente de Saldo',        
    'Pendiente de 2da Etapa',    
    'Pagada',
    'Anulada',
    'Vencido'
  ],
  default: 'Pendiente de Anticipo'
},

  // ============================================================
  // FLAGS
  // ============================================================
  esFacturaAdicional: { type: Boolean, default: false },
  idCotizacionAdicional: { type: String, default: null },
  activaProyecto: { type: Boolean, default: true },
  hitosCubiertos: [{ type: String, default: null }],
  // Metadata
  creadoPor: { type: String, default: 'Sistema' }
}, { timestamps: true });

// ============================================================
// PRE-SAVE: Calculos automaticos
// ============================================================
FacturaSchema.pre('save', async function() {
  // Generar idFactura automaticamente si es nuevo y no tiene
  if (this.isNew && !this.idFactura) {
    const siguienteNumero = await Contador.obtenerSiguiente('facturas');
    this.idFactura = `FAC-${String(siguienteNumero).padStart(3, '0')}`;
  }

  // Recalcular si es nuevo o cambio subtotal/porcentajes
  const esNuevo = this.isNew;
  const cambioSubtotal = this.isModified('subtotal');
  const cambioPorcentajes = this.isModified('anticipoPorcentaje') ||
                            this.isModified('saldoPorcentaje') ||
                            this.isModified('ivaPorcentaje') ||
                            this.isModified('retencionPorcentaje');

  if (esNuevo || cambioSubtotal || cambioPorcentajes) {
    const pctIVA = this.ivaPorcentaje || 19;
    const pctRetencion = this.retencionPorcentaje || 2;

    // 1. PRIMERO calcular IVA y Total con IVA
    this.iva = Math.round((this.subtotal * pctIVA) / 100);
    this.totalConIva = this.subtotal + this.iva;

    // 2. Retencion INFORMATIVA (sobre subtotal)
    this.retencion = Math.round((this.subtotal * pctRetencion) / 100);
    this.retencionInformativa = this.retencion;

    // 3. Calcular anticipo y saldo sobre TOTAL CON IVA
    if (this.anticipoPorcentaje > 0 || this.saldoPorcentaje > 0) {
      const pctAnticipo = this.anticipoPorcentaje || 40;
      const pctSaldo = this.saldoPorcentaje || (100 - pctAnticipo);
      
      // ✅ CORRECCION: Anticipo y Saldo sobre TOTAL CON IVA
      this.anticipoRequerido = Math.round((this.totalConIva * pctAnticipo) / 100);
      this.saldoRestante = Math.round((this.totalConIva * pctSaldo) / 100);
    } else {
      // Factura de hito o unica: no hay anticipo/saldo adicional
      this.anticipoRequerido = 0;
      this.saldoRestante = 0;
    }

    // 4. Neto a cobrar = Total con IVA (la retencion es INFORMATIVA)
    this.netoACobrar = this.totalConIva;
  }

  // Fecha de vencimiento default: 30 dias
  if (!this.fechaVencimiento) {
    this.fechaVencimiento = new Date(this.fechaEmision);
    this.fechaVencimiento.setDate(this.fechaVencimiento.getDate() + 30);
  }
});

// ============================================================
// METODOS DE INSTANCIA
// ============================================================
FacturaSchema.methods.marcarAnticipoPagado = function() {
  if (this.estado === 'Pendiente de Anticipo') {
    this.estado = 'Anticipo ya Pagado';
    this.fechaPagoAnticipo = new Date();
  }
};

FacturaSchema.methods.marcarPagada = function() {
  this.estado = 'Pagada';
  this.fechaPagoTotal = new Date();
  if (!this.fechaPagoAnticipo) {
    this.fechaPagoAnticipo = new Date();
  }
};

FacturaSchema.methods.anular = function() {
  if (this.estado === 'Pagada') {
    throw new Error('No se puede anular una factura ya pagada');
  }
  this.estado = 'Anulada';
};

FacturaSchema.methods.marcarVencido = function() {
  if (this.estado !== 'Pagada' && this.estado !== 'Anulada') {
    this.estado = 'Vencido';
  }
};

module.exports = mongoose.model('Factura', FacturaSchema);