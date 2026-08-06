const express = require('express');
const router = express.Router();
const controller = require('../controllers/proyectoController');
const facturaController = require('../controllers/facturaController');

// ==============================================================
// RUTAS DE PROYECTOS
// ==============================================================

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

// ==============================================================
// RUTAS DE FACTURAS (independientes de proyectos)
// ==============================================================

// Obtener todas las facturas
router.get('/facturas', facturaController.getAllFacturas);

// Crear factura independiente (sin proyecto)
router.post('/facturas/independiente', facturaController.crearFacturaIndependiente);

// Obtener factura por ID
router.get('/facturas/:id', facturaController.getFacturaById);

// Actualizar estado de factura
router.put('/facturas/:id/estado', facturaController.updateEstadoFactura);

// Anular factura (libera hitos automáticamente)
router.put('/facturas/:id/anular', facturaController.anularFactura);

// Eliminar factura
router.delete('/facturas/:id', facturaController.deleteFactura);

module.exports = router;