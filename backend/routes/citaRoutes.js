const express = require('express');
const router = express.Router();

const {
  obtenerCitas,
  crearCita,
  actualizarCita,
  eliminarCita
} = require('../controllers/citaController');

const { authMiddleware, authorize } = require('../middleware/authMiddleware');

// GET /api/citas - Obtener todas las citas (protegido, solo admin)
router.get('/', authMiddleware, obtenerCitas);

// POST /api/citas - Crear una nueva cita (PÚBLICO, sin auth)
router.post('/', crearCita);

// PUT /api/citas/:idCita - Actualizar una cita (protegido)
router.put('/:idCita', authMiddleware, actualizarCita);

// DELETE /api/citas/:idCita - Eliminar una cita (solo admin)
router.delete('/:idCita', authMiddleware, authorize('admin'), eliminarCita);

module.exports = router;