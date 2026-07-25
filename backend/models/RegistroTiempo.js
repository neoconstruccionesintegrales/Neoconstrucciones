const mongoose = require('mongoose');

const RegistroTiempoSchema = new mongoose.Schema({
  idRegistro: { type: String, unique: true },

  email: { type: String, required: true },
  registradoPor: { type: String, required: true },
  idProyecto: { type: String, required: true },

  fecha: { type: Date, required: true },

  // Horas
  horasNormales: { type: Number, default: 0 },
  horasExtrasDiurnas: { type: Number, default: 0 },
  horasExtrasNocturnas: { type: Number, default: 0 },
  horasExtrasDominical: { type: Number, default: 0 },
  horasExtrasNocturnasDominical: { type: Number, default: 0 },

  // Recargos
  recargoNocturno: { type: Number, default: 0 },
  recargoDominical: { type: Number, default: 0 },
  recargoNocturnoDominical: { type: Number, default: 0 },

  // Destajo
  unidadesProducidas: { type: Number, default: 0 },

  // Novedad del día
  tipoDia: {
    type: String,
    enum: ['normal', 'incapacidad_eps', 'incapacidad_arl', 'vacaciones',
           'licencia_remunerada', 'licencia_no_remunerada', 'permiso',
           'capacitacion', 'descanso', 'festivo_no_trabajado', 'falta_injustificada'],
    default: 'normal'
  },

  // ===== APROBACIÓN EXTRAS =====
  extrasAprobadas: { type: Boolean, default: false },
  extrasAprobadasPor: { type: String, default: null },
  extrasAprobadasFecha: { type: Date, default: null },
  extrasPendientesAprobacion: { type: Boolean, default: false },

  // NUEVO: Campos para rechazo
  motivoRechazoExtras: { type: String, default: '' },
  extrasRechazadasFecha: { type: Date, default: null },
  extrasRechazadasPor: { type: String, default: null },

  estado: {
    type: String,
    enum: ['borrador', 'validado', 'rechazado'],
    default: 'borrador'
  },

  notas: { type: String, default: '' },

  // Marcas de tiempo 
  marcaEntrada: { type: Date, default: null },
  marcaSalida: { type: Date, default: null },
  turnoAsignado: { type: String, enum: ['06-15', '07-16', '08-17', null], default: null },

  tipoRegistro: { type: String, enum: ['supervisor', 'self'], default: 'supervisor' },

  // Horas manuales (obra)
  horaEntradaManual: { type: String, default: null },
  horaSalidaManual: { type: String, default: null },

  // MARCADOS DETALLADOS (planta/residente)
  marcaAlmuerzoInicio: { type: Date, default: null },
  marcaAlmuerzoFin: { type: Date, default: null },

  breaks: [{
    inicio: { type: Date },
    fin: { type: Date },
    tipo: { type: String, enum: ['break', 'pausa_activa', 'capacitacion'] }
  }],

  estadoMarcado: {
    type: String,
    enum: ['sin_marcar', 'trabajando', 'almuerzo', 'break', 'pausa_activa', 'capacitacion', 'finalizado'],
    default: 'sin_marcar'
  },

  minutosCapacitacion: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('RegistroTiempo', RegistroTiempoSchema);