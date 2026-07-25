const express = require('express');
const router = express.Router();

// Importar el controller
const {
  obtenerServicios,
  crearServicio,
  eliminarServicio,
  actualizarServicio
} = require('../controllers/servicioController');

// Importar middleware de autenticación
const { authMiddleware, authorize } = require('../middleware/authMiddleware');

// ==========================================================================
// RUTAS DE SERVICIOS (todas protegidas con autenticación)
// ==========================================================================

// GET /api/servicios - Obtener todos los servicios (calcula subtotal de materiales dinámicamente)
router.get('/', obtenerServicios);

// POST /api/servicios - Crear un nuevo servicio (solo admin)
router.post('/', authMiddleware, authorize('admin'), crearServicio);

// PUT /api/servicios/:idServicio - Actualizar un servicio por su idServicio (solo admin)
router.put('/:idServicio', authMiddleware, authorize('admin'), actualizarServicio);

// DELETE /api/servicios/:idServicio - Eliminar un servicio por su idServicio (solo admin)
router.delete('/:idServicio', authMiddleware, authorize('admin'), eliminarServicio);

module.exports = router;
