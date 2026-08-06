const mongoose = require('mongoose');

const cesantiasHistorialSchema = new mongoose.Schema({
  anio: { type: Number, required: true },
  totalEmpleados: { type: Number, required: true },
  totalConsignar: { type: Number, required: true },
  empleados: { type: Array, required: true },
  fechaGeneracion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CesantiasHistorial', cesantiasHistorialSchema);