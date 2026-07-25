// models/Contador.js
const mongoose = require('mongoose');

if (mongoose.models.Contador) {
  module.exports = mongoose.models.Contador;
} else {
  const ContadorSchema = new mongoose.Schema({
    coleccion: { type: String, required: true, unique: true },
    secuencia: { type: Number, default: 0 }
  });

  ContadorSchema.statics.obtenerSiguiente = async function(coleccion) {
  const contador = await this.findOneAndUpdate(
      { coleccion },
      { $inc: { secuencia: 1 } },
      { new: true, upsert: true }
  );
    return contador.secuencia;
  };

  // ✅ NUEVO: Método para sincronizar con colección existente
  ContadorSchema.statics.sincronizar = async function(coleccion, modeloMongoose, campoId = 'idFactura', prefijo = 'FAC-') {
    const ultimo = await modeloMongoose.findOne().sort({ createdAt: -1 });
      let numeroActual = 0;
       
      if (ultimo && ultimo[campoId]) {
        const match = ultimo[campoId].match(new RegExp(`${prefijo}(\\d+)`));
        if (match) numeroActual = parseInt(match[1]);
      }
        
      await this.findOneAndUpdate(
        { coleccion },
        { $set: { secuencia: Math.max(numeroActual, 0) } },
        { upsert: true, new: true }
      );
       
      console.log(`Contador '${coleccion}' sincronizado en: ${numeroActual}`);
  };

  module.exports = mongoose.model('Contador', ContadorSchema);
}