// backend/routes/cesantiasRoutes.js
const express = require('express');
const router = express.Router();
const CesantiasHistorial = require('../models/CesantiasHistorial'); // Importamos el modelo

// Ruta para obtener el historial de cesantías (GET)
router.get('/historial', async (req, res) => {
  try {
    // Busca todos los registros y los ordena del más reciente al más antiguo (-1)
    const historial = await CesantiasHistorial.find().sort({ anio: -1 });
    res.json({ success: true, data: historial });
  } catch (error) {
    console.error("❌ Error al obtener historial:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// (Opcional) Ruta para guardar manualmente si quieres hacer pruebas POST
router.post('/guardar', async (req, res) => {
  try {
    const nuevo = new CesantiasHistorial(req.body);
    await nuevo.save();
    res.json({ success: true, message: "Guardado en historial", data: nuevo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;