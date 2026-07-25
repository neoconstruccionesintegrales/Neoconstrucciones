const express = require('express');
const router = express.Router();
const controller = require('../controllers/cotizacionController');

// Crear nueva cotizacion
router.post('/', controller.saveCotizacion);

// Obtener todas las cotizaciones (excluye adicionales)
router.get('/', controller.getAllCotizaciones);

// Obtener cotizacion por ID
router.get('/:id', controller.getCotizacionById);

// Actualizar estado de cotizacion (aprobar/rechazar)
router.put('/:id/estado', controller.updateEstadoCotizacion);

// Aprobar cotizacion y crear proyecto automaticamente
router.put('/:id/aprobar', controller.updateEstadoCotizacion);

// Rechazar cotizacion
router.put('/:id/rechazar', controller.rechazarCotizacion);

// Actualizar cotizacion completa (con servicios - crea versionamiento)
router.put('/:id', controller.updateCotizacion);

// Eliminar cotizacion
router.delete('/:id', controller.deleteCotizacion);

module.exports = router;

