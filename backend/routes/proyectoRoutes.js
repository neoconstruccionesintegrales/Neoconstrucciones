const express = require('express');
const router = express.Router();
const controller = require('../controllers/proyectoController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Rutas especificas PRIMERO (evitar conflicto con /:id)
router.get('/cotizaciones-aprobadas', controller.obtenerCotizacionesAprobadas);

// Rutas de facturas
router.get('/facturas', controller.obtenerTodasFacturas);

// Rutas CRUD proyectos
router.post('/', controller.crearProyecto);
router.get('/', controller.obtenerProyectos);

// Rutas especificas de proyecto por ID
router.get('/:id/facturas', controller.obtenerFacturasProyecto);
router.post('/:id/facturas', controller.crearFactura);
router.get('/:id', controller.obtenerProyectoPorId);
router.put('/:id', controller.actualizarProyecto);
router.delete('/:id', controller.eliminarProyecto);

// ============================================
// COTIZACIONES ADICIONALES
// ============================================
router.post('/:id/cotizaciones-adicionales', authMiddleware, controller.crearCotizacionAdicional);
router.put('/:idProyecto/cotizaciones-adicionales/:idCotizacion', authMiddleware, controller.actualizarCotizacionAdicional);
router.post('/:idProyecto/cotizaciones-adicionales/:idCotizacion/aprobar', authMiddleware, controller.aprobarCotizacionAdicional);
router.get('/:id/cotizaciones-adicionales', authMiddleware, controller.obtenerCotizacionesAdicionales);

// ============================================
// FACTURA DE COTIZACION ADICIONAL
// ============================================
router.post('/:idProyecto/cotizaciones-adicionales/:idCotizacion/siguiente-factura', authMiddleware, controller.generarSiguienteFacturaAdicional);

// ============================================
// SEGUIMIENTOS
// ============================================
router.post('/:id/seguimientos', authMiddleware, controller.agregarSeguimiento);
router.get('/:id/seguimientos', authMiddleware, controller.obtenerSeguimientos);

// ============================================
// HITOS - Completar y gestionar
// ============================================
router.post('/:id/hitos/:idHito/completar', authMiddleware, controller.completarHito);

// ============================================
// FACTURAS DESDE HITO
// ============================================
router.post('/:id/facturas/hito/:idHito', authMiddleware, controller.generarFacturaDesdeHito);

// ============================================
// FACTURA DE SALDO DEL PROYECTO BASE
// ============================================
router.post('/:id/facturas/saldo', authMiddleware, controller.generarFacturaSaldoProyecto);

module.exports = router;