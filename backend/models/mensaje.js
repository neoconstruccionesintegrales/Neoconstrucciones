// backend/models/mensaje.js
const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema({
  idMensaje: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  correo: { type: String },
  celular: { type: String },
  mensaje: { type: String, required: true },
  estado: { type: String, default: 'pendiente' }, // pendiente, proceso, gestionado
  notas: { type: String, default: '' }
}, { collection: 'mensajesContacto', timestamps: true });

module.exports = mongoose.model('Mensaje', mensajeSchema);