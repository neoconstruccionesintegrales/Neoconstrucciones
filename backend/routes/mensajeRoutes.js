const express = require('express');
const router = express.Router();

const {
  obtenerMensajes,
  crearMensaje,
  actualizarMensaje,
  eliminarMensaje
} = require('../controllers/mensajeController');

const { authMiddleware, authorize } = require('../middleware/authMiddleware');

// GET /api/mensajes - Obtener todos los mensajes
router.get('/', authMiddleware, obtenerMensajes);

// POST /api/mensajes - Crear un nuevo mensaje (público, sin auth)
router.post('/', crearMensaje);

// PUT /api/mensajes/:idMensaje - Actualizar un mensaje
router.put('/:idMensaje', authMiddleware, actualizarMensaje);

// DELETE /api/mensajes/:idMensaje - Eliminar un mensaje (solo admin)
router.delete('/:idMensaje', authMiddleware, authorize('admin'), eliminarMensaje);

module.exports = router;
