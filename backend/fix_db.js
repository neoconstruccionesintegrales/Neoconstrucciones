const mongoose = require('mongoose');
// IMPORTANTE: Pon aquí tu cadena de conexión real (la misma que usas en tu app)
const DB_URI = 'mongodb://localhost:27017/tu_base_de_datos'; 

async function fix() {
    await mongoose.connect(DB_URI);
    console.log("Conectado. Intentando borrar índice...");
    
    // Accedemos a la colección directamente
    const db = mongoose.connection.db;
    try {
        await db.collection('cotizacions').dropIndex('idCotizacion_1');
        console.log("¡ÉXITO! Índice eliminado.");
    } catch (e) {
        console.log("El índice no existía o ya se borró:", e.message);
    }
    process.exit();
}
fix();