const mongoose = require('mongoose');

const descuentoSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  tipo: {
    type: String,
    required: true,
    enum: [
      'prestamo',
      'falta_penalizacion',
      'danos_perdidas',
      'uniformes_epp',
      'sancion_disciplinaria',
      'aporte_voluntario',
      'otro'
    ]
  },
  descripcion: { type: String, required: true },
  valorTotal: { type: Number, required: true, min: 0 },
  valorCuota: { type: Number, required: true, min: 0 },
  cuotas: { type: Number, required: true, min: 1 },
  cuotasPagadas: { type: Number, default: 0, min: 0 },
  estado: {
    type: String,
    enum: ['activo', 'pausado', 'completado', 'cancelado'],
    default: 'activo'
  },
  fechaInicio: { type: Date, default: Date.now },
  fechaFin: { type: Date },
  creadoPor: { type: String },
  aprobadoPor: { type: String },
  fechaAprobacion: { type: Date },
  // Para descuentos condicionales (ej: faltas, daños en proyecto específico)
  condicion: {
    requiereFalta: { type: Boolean, default: false },
    idProyecto: { type: String }
  },
  historialPagos: [{
    idNomina: String,
    fechaPago: Date,
    valor: Number,
    cuotaNumero: Number
  }]
}, { timestamps: true });

// Índice compuesto para búsquedas rápidas en nómina
descuentoSchema.index({ email: 1, estado: 1 });

// Virtual: cuotas restantes
descuentoSchema.virtual('cuotasRestantes').get(function() {
  return Math.max(0, this.cuotas - this.cuotasPagadas);
});

// Virtual: saldo pendiente
descuentoSchema.virtual('saldoPendiente').get(function() {
  return Math.max(0, this.valorTotal - (this.valorCuota * this.cuotasPagadas));
});

// Método: obtener cuota actual a descontar
descuentoSchema.methods.getCuotaActual = function() {
  if (this.estado !== 'activo') return 0;
  if (this.cuotasPagadas >= this.cuotas) return 0;
  return this.valorCuota;
};

module.exports = mongoose.model('DescuentoEmpleado', descuentoSchema);