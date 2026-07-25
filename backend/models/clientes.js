// models/Clientes.js
const mongoose = require('mongoose');

// Definimos el esquema de una sede por separado
const sedeSchema = new mongoose.Schema({
  id: String,
  nombreSede: String,
  nombreEncargado: String,
  nitEncargado: String, // ¡Asegúrate de que este sea el nombre que usas en el input!
  ciudad: String,
  direccion: String,
  celular: String,
  correoEnc: String
});

const clienteSchema = new mongoose.Schema({
  idCliente: String,
  nombreEmp: String,
  nombreRep: String,
  nit: String,
  ciudad: String,
  direccion: String,
  telefono: String,
  celular: String,
  correo: String,
  sedes: [sedeSchema] // Ahora usamos el sub-esquema
});

module.exports = mongoose.model('Clientes', clienteSchema);