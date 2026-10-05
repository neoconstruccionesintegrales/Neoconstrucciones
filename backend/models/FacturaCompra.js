const mongoose = require('mongoose');

const FacturaCompraSchema = new mongoose.Schema({
  // ID único
  idFacturaCompra: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  // Relaciones
  idProveedor: { type: String, required: true },
  idProyecto: { type: String, default: null },
  idOrdenCompra: { type: String, default: null },
  
  // Datos del proveedor (denormalizados)
  nombreProveedor: { type: String, required: true },
  nitProveedor: { type: String, default: '' },
  contactoProveedor: { type: String, default: '' },
  
  // Datos de la factura
  numeroFactura: { type: String, required: true },
  fechaEmision: { type: Date, default: Date.now },
  fechaVencimiento: { type: Date, default: null },
  fechaPago: { type: Date, default: null },
  
  // Tipo de compra
  tipo: { 
    type: String, 
    enum: ['materiales', 'equipos', 'subcontrato', 'servicios', 'administrativo', 'transporte', 'varios'],
    default: 'materiales'
  },
  
  // Items de la factura
  items: [{
    descripcion: { type: String, required: true },
    cantidad: { type: Number, default: 1, min: 0 },
    precioUnitario: { type: Number, default: 0, min: 0 },
    unidad: { type: String, default: 'und' },
    subtotal: { type: Number, default: 0, min: 0 }
  }],
  
  // Totales
  subtotal: { type: Number, required: true, min: 0 },
  descuento: { type: Number, default: 0, min: 0 },
  iva: { type: Number, default: 0, min: 0 },
  ivaPorcentaje: { type: Number, default: 19 },
  total: { type: Number, required: true, min: 0 },
  
  // Retención (si aplica)
  retencion: { type: Number, default: 0 },
  retencionPorcentaje: { type: Number, default: 0 },
  retencionTipo: { type: String, enum: ['IVA', 'Renta', 'ICA', 'Ninguna'], default: 'Ninguna' },
  
  // Estado
  estado: {
    type: String,
    enum: ['Pendiente', 'Aprobada', 'Pagada', 'Anulada', 'Parcial'],
    default: 'Pendiente'
  },
  
  // Forma de pago
  metodoPago: {
    type: String,
    enum: ['Transferencia Bancaria', 'Efectivo', 'Cheque', 'Credito', 'Contraentrega'],
    default: 'Transferencia Bancaria'
  },
  
  // Notas
  notas: { type: String, default: '' },
  
  // Documentos adjuntos (opcional)
  documentosAdjuntos: [{
    nombre: String,
    url: String,
    tipo: String,
    fechaSubida: { type: Date, default: Date.now }
  }],
  
  // Metadata
  creadoPor: { type: String, default: 'Sistema' },
  aprobadoPor: { type: String, default: null },
  fechaAprobacion: { type: Date, default: null }
}, { timestamps: true });

// ⚠️ ELIMINA EL MIDDLEWARE pre('save') - ya no es necesario
// FacturaCompraSchema.pre('save', async function(next) { ... });

// Índices para búsquedas rápidas
FacturaCompraSchema.index({ idProveedor: 1 });
FacturaCompraSchema.index({ idProyecto: 1 });
FacturaCompraSchema.index({ fechaEmision: 1 });
FacturaCompraSchema.index({ estado: 1 });
FacturaCompraSchema.index({ tipo: 1 });

module.exports = mongoose.model('FacturaCompra', FacturaCompraSchema);