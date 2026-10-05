// models/Proveedor.js
const mongoose = require('mongoose');

const ProveedorSchema = new mongoose.Schema({
  // ID único del proveedor
  idProveedor: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  // Datos básicos
  nombre: { type: String, required: true },
  razonSocial: { type: String, default: '' },
  nit: { type: String, required: true, unique: true },
  digitoVerificacion: { type: String, default: '' },
  
  // Contacto
  telefono: { type: String, default: '' },
  celular: { type: String, default: '' },
  correo: { type: String, default: '' },
  direccion: { type: String, default: '' },
  ciudad: { type: String, default: '' },
  departamento: { type: String, default: '' },
  
  // Contacto interno
  contactoNombre: { type: String, default: '' },
  contactoTelefono: { type: String, default: '' },
  contactoCorreo: { type: String, default: '' },
  
  // Clasificación
  tipo: { 
    type: String, 
    enum: ['materiales', 'equipos', 'subcontrato', 'servicios', 'administrativo', 'transporte', 'varios'],
    default: 'materiales'
  },
  
  // Datos bancarios
  banco: { type: String, default: '' },
  tipoCuenta: { type: String, enum: ['Ahorros', 'Corriente'], default: 'Ahorros' },
  numeroCuenta: { type: String, default: '' },
  
  // Estado
  estado: { 
    type: String, 
    enum: ['Activo', 'Inactivo', 'Bloqueado'],
    default: 'Activo'
  },
  
  // Calificación
  calificacion: { type: Number, min: 0, max: 5, default: 0 },
  observaciones: { type: String, default: '' },
  
  // Metadata
  creadoPor: { type: String, default: 'Sistema' },
  fechaRegistro: { type: Date, default: Date.now },
  ultimaCompra: { type: Date, default: null }
}, { timestamps: true });

// ⚠️ ELIMINA EL MIDDLEWARE pre('save') - ya no es necesario
// ProveedorSchema.pre('save', async function(next) { ... });

// Índices para búsquedas rápidas
ProveedorSchema.index({ nombre: 1 });
ProveedorSchema.index({ tipo: 1 });
ProveedorSchema.index({ estado: 1 });

module.exports = mongoose.model('Proveedor', ProveedorSchema);