const mongoose = require('mongoose');

const DistribucionProyectoSchema = new mongoose.Schema({
  idProyecto: String,
  horas: Number,
  costo: Number
}, { _id: false });

const DetalleDescuentoSchema = new mongoose.Schema({
  idDescuento: { type: mongoose.Schema.Types.ObjectId, ref: 'DescuentoEmpleado' },
  tipo: String,
  descripcion: String,
  valor: Number,
  cuotaNumero: Number,
  cuotaTotal: Number
}, { _id: false });

const EmpleadoNominaSchema = new mongoose.Schema({
  email: { type: String, required: true },
  nombre: String,
  cargo: String,
  salarioBase: { type: Number, default: 0 },
  valorHora: { type: Number, default: 0 },

  // === DÍAS ===
  diasTrabajados: { type: Number, default: 0 },
  diasNoTrabajados: { type: Number, default: 0 },
  diasFalta: { type: Number, default: 0 },
  diasLicenciaNoRem: { type: Number, default: 0 },

  // === HORAS ===
  horasNormales: { type: Number, default: 0 },
  horasExtrasDiurnas: { type: Number, default: 0 },
  horasExtrasNocturnas: { type: Number, default: 0 },
  horasExtrasDominical: { type: Number, default: 0 },
  horasExtrasNocturnasDominical: { type: Number, default: 0 },

  // === VALORES EXTRAS Y RECARGOS ===
  valorExtrasDiurnas: { type: Number, default: 0 },
  valorExtrasNocturnas: { type: Number, default: 0 },
  valorExtrasDominical: { type: Number, default: 0 },
  valorExtrasNocturnasDominical: { type: Number, default: 0 },
  recargoNocturno: { type: Number, default: 0 },
  recargoDominical: { type: Number, default: 0 },

  // === DEVENGADOS ADICIONALES ===
  auxilioTransporte: { type: Number, default: 0 },
  subsidioFamiliar: { type: Number, default: 0 },
  incapacidadPagadaEmpresa: { type: Number, default: 0 },
  licenciaRemunerada: { type: Number, default: 0 },
  vacacionesPagadas: { type: Number, default: 0 },
  bonificaciones: { type: Number, default: 0 },

  totalDevengado: { type: Number, default: 0 },

  // === DEDUCCIONES ===
  saludEmpleado: { type: Number, default: 0 },
  pensionEmpleado: { type: Number, default: 0 },
  fondoSolidaridad: { type: Number, default: 0 },
  retencionFuente: { type: Number, default: 0 },
  otrosDescuentos: { type: Number, default: 0 },
  detalleDescuentos: [DetalleDescuentoSchema],

  totalDeducciones: { type: Number, default: 0 },

  // === NETO ===
  netoAPagar: { type: Number, default: 0 },

  // === APORTES EMPLEADOR ===
  saludEmpleador: { type: Number, default: 0 },
  pensionEmpleador: { type: Number, default: 0 },
  arl: { type: Number, default: 0 },
  cajaCompensacion: { type: Number, default: 0 },
  icbf: { type: Number, default: 0 },
  sena: { type: Number, default: 0 },
  totalAportes: { type: Number, default: 0 },

  // === COSTO TOTAL ===
  costoTotalEmpleador: { type: Number, default: 0 },

  // Distribución
  distribucionProyectos: [DistribucionProyectoSchema]
}, { _id: false });

const DistribucionGlobalSchema = new mongoose.Schema({
  idProyecto: String,
  totalCosto: Number,
  porcentaje: Number
}, { _id: false });

const NominaSchema = new mongoose.Schema({
  idNomina: { type: String, unique: true, index: true },

  anio: { type: Number, required: true },
  mes: { type: Number, required: true, min: 1, max: 12 },
  quincena: { type: Number, enum: [0, 1, 2], default: 1 },

  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  fechaPago: { type: Date },

  tipo: {
    type: String,
    enum: ['quincenal', 'mensual', 'prima_semestral', 'cesantias', 'vacaciones', 'liquidacion'],
    default: 'quincenal'
  },

  estado: {
    type: String,
    enum: ['abierta', 'calculada', 'aprobada', 'pagada', 'cerrada', 'anulada'],
    default: 'abierta'
  },

  // Campos específicos para prima
  semestre: { type: Number, enum: [1, 2] },
  diasBasePrima: { type: Number, default: 360 },

  empleados: [EmpleadoNominaSchema],

  // Totales
  totalNomina: { type: Number, default: 0 },
  totalAportes: { type: Number, default: 0 },
  totalCosto: { type: Number, default: 0 },

  distribucionGlobal: [DistribucionGlobalSchema],

  creadoPor: { type: String },
  aprobadoPor: { type: String },
  fechaAprobacion: { type: Date },
  pagadoPor: { type: String },
  fechaPagoReal: { type: Date },
  fechaCierre: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Nomina', NominaSchema);
