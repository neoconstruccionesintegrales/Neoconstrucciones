const mongoose = require('mongoose');

const DiaSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  diaSemana: { type: Number, min: 0, max: 6 }, // 0=domingo
  tipo: {
    type: String,
    enum: ['habil', 'domingo', 'festivo', 'no_habil_empresa'],
    default: 'habil'
  },
  descripcion: { type: String, default: '' },
  esNocturno: { type: Boolean, default: false }
}, { _id: false });

const CalendarioSchema = new mongoose.Schema({
  anio: { type: Number, required: true },
  mes: { type: Number, required: true, min: 1, max: 12 },
  dias: [DiaSchema],
  totalDiasHabiles: { type: Number, default: 0 },
  totalFestivos: { type: Number, default: 0 },
  totalDomingos: { type: Number, default: 0 }
}, { timestamps: true });

// Índice único por año-mes
CalendarioSchema.index({ anio: 1, mes: 1 }, { unique: true });

module.exports = mongoose.model('Calendario', CalendarioSchema);