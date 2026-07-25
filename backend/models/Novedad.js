const mongoose = require('mongoose');

const NovedadSchema = new mongoose.Schema({
  idNovedad: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: ['incapacidad_eps', 'incapacidad_arl', 'vacaciones', 'licencia_remunerada', 
           'licencia_no_remunerada', 'permiso', 'suspension', 'capacitacion'],
    required: true 
  },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  dias: { type: Number, required: true }, // Calculado automáticamente
  descripcion: { type: String },

  // Campos específicos para incapacidades
  numeroIncapacidad: { type: String },
  entidad: { type: String }, // EPS o ARL
  valorPagadoEmpresa: { type: Number, default: 0 }, // Días pagados por la empresa (días 1-2)

  // Estado
  estado: { 
    type: String, 
    enum: ['pendiente', 'aprobada', 'rechazada'], 
    default: 'pendiente' 
  },
  aprobadoPor: { type: String },
  fechaAprobacion: { type: Date },

  // Metadata
  creadoPor: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Novedad', NovedadSchema);