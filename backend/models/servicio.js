const mongoose = require('mongoose');

// Esquema para el desglose de cada material individual
const materialSchema = new mongoose.Schema({
  nombreMaterial: { type: String, required: true }, // Ej: "Perfil IPN 160", "Soldadura 6013"
  costoEstimado: { type: Number, required: true }  // Costo de compra de ese material
});

const servicioSchema = new mongoose.Schema({
  idServicio: { type: String, required: true, unique: true, trim: true }, // Ej: "EST-PESADA"
  nombre: { type: String, required: true }, // Ej: "Fabricación de Cerchas"
  unidad: { type: String, required: true, default: 'm2' }, // m2, kg, ml, etc.
  precioUnitario: { type: Number, required: true }, // Lo que le cobras al cliente por unidad
    
// Desglose interno de costos para calcular el subtotal de materiales
  materiales: [materialSchema], // Lista donde puedes añadir de 1 a varios materiales
    
  costoManoObraEspecializada: { type: Number, required: true }, // Costo de los soldadores/armadores por unidad
  descripcion: { type: String }
});

module.exports = mongoose.model('Servicio', servicioSchema);