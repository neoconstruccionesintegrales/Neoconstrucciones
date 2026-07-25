const mongoose = require('mongoose'); // ← AÑADIR ESTA LÍNEA

const UsuarioSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nombre: { type: String },
  rol: { 
    type: String, 
    enum: ['admin', 'gerente', 'secretaria', 'residente', 'contabilidad', 'comercial', 'cliente', 'supervisor', 'oficial', 'ayudante'],
    default: 'residente'
  },
  
  // campos registro
  tipoId: { type: String },
  tipoDocumento: { type: String },
  fechaExpedicion: { type: String },
  paisExp: { type: String },
  deptoExp: { type: String },
  fechaNacimiento: { type: String },
  emailPersonal: { type: String },
  estadoCivil: { type: String },
  tipoSangre: { type: String },
  sexo: { type: String },
  libretaMilitar: { type: String },
  eps: { type: String },
  cargo: { type: String },
  fechaIngreso: { type: String },
  sueldo: { type: Number },
  paisRes: { type: String },
  deptoRes: { type: String },
  municipio: { type: String },
  zona: { type: String },
  barrio: { type: String },
  direccion: { type: String },
  telefono: { type: String },
  movil: { type: String },
  nombreContacto: { type: String },
  telContacto: { type: String },
  movilContacto: { type: String },
  parentesco: { type: String },
  tipoDocumental: { type: String },
  documentosCargados: { type: Array, default: [] },
  
  // === CAMPOS DE NÓMINA ===
  tipoContrato: {
    type: String, 
    enum: ['obra_labor', 'fijo', 'indefinido', 'aprendizaje', 'prestacion_servicios'],
    default: 'obra_labor'
  },
  fechaFinContrato: Date,
  tipoSalario: {
    type: String,
    enum: ['fijo_mensual', 'fijo_quincenal', 'por_hora'],
    default: 'por_hora'
  },
  valorHora: Number,
  recibeAuxilioTransporte: { type: Boolean, default: true },
  
  // Seguridad social
  fondoPension: { 
    type: String, 
    enum: ['Porvenir', 'Protección', 'Colfondos', 'Skandia', 'Colpensiones'],
    default: 'Porvenir'
  },
  nivelARL: { type: Number, default: 1 },
  cajaCompensacion: { 
    type: String, 
    enum: ['Colsubsidio', 'Cafam', 'Comfamiliar', 'Compensar', 'Porvenir'],
    default: 'Colsubsidio'
  },
  
  // Estado
  estadoLaboral: { 
    type: String, 
    enum: ['activo', 'vacaciones', 'incapacitado', 'suspendido', 'retirado'], 
    default: 'activo'
  },
  
  // Tipo de empleado
  tipoEmpleado: { 
    type: String, 
    enum: ['obra', 'planta', 'residente'],
    default: 'obra'
  },
  esAdministrativo: { type: Boolean, default: false },
  puedeRegistrarObra: { type: Boolean, default: true },
  
  // Asignación
  proyectoAsignado: { type: String, default: null },
  centroCosto: { type: String, default: null },
  
  // Bancos
  datosBancarios: {  
    banco: String,  
    tipoCuenta: { type: String, enum: ['ahorros', 'corriente'] }, 
    numeroCuenta: String 
  },
  
  // Historial de asignaciones
  historialAsignaciones: [{ 
    idProyecto: String,  
    fechaInicio: Date,  
    fechaFin: Date
  }],
  
  // Beneficiarios para prima
  beneficiarios: [{ 
    nombre: String, 
    parentesco: String,  
    porcentaje: Number
  }],
  
  fondoCesantias: { 
    type: String, 
    enum: ['PORVENIR', 'PROTECCION', 'FNA', 'COLFONDOS', 'SKANDIA', 'COLPENSIONES'],
    default: 'PORVENIR'
  },
  numeroCuentaFondo: { type: String, default: '' },
  
  // Control de liquidación (ANTI-DESFALCO)
  liquidacionGenerada: { type: Boolean, default: false },
  fechaRetiro: { type: Date, default: null },
  motivoRetiro: {
    type: String,
    enum: ['renuncia_voluntaria', 'terminacion_contrato', 'despido_justa_causa', 
           'despido_sin_justa_causa', 'mutuo_acuerdo', 'jubilacion', 'muerte'],
    default: null
  },
  
  // Historial de reingresos (trazabilidad)
  historialReingresos: [{
    fechaReingreso: Date,
    fechaRetiroAnterior: Date,
    liquidacionAnteriorId: String,
    motivoReingreso: String
  }]

}, { 
    timestamps: true,
    strict: false
});

module.exports = mongoose.model('Usuario', UsuarioSchema);