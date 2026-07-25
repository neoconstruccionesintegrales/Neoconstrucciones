// backend/models/cita.js
const mongoose = require('mongoose');

const citaSchema = new mongoose.Schema({
  idCita: { type: String, required: true, unique: true },
  nombreCliente: { type: String, required: true },
  celular: { type: String },
  tipoServicio: { type: String }, // Lugar u obra / tipo de servicio solicitado
  fecha: { type: String },
  hora: { type: String },
  estado: { type: String, default: 'pendiente' }, // pendiente, proceso, gestionado
  notas: { type: String, default: '' }
}, { collection: 'citasAgendadas', timestamps: true });

module.exports = mongoose.model('Cita', citaSchema);