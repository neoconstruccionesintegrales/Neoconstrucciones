const express = require('express');
const router = express.Router();
const controller = require('../controllers/proyectoController');

// Obtener todas las facturas
router.get('/', controller.obtenerTodasFacturas);

// Crear factura independiente (sin proyecto)
router.post('/independiente', controller.crearFacturaIndependiente);

// Obtener factura por ID
router.get('/:id', controller.obtenerFacturaPorId);

// Actualizar estado de factura
router.put('/:id/estado', controller.actualizarEstadoFactura);

// Anular factura (libera hitos automáticamente)
router.put('/:id/anular', controller.anularFactura);

// Eliminar factura
router.delete('/:id', controller.eliminarFactura);

module.exports = router;