const express = require('express');
const router = express.Router();

const { authMiddleware, authorize } = require('../middleware/authMiddleware');

const {
  obtenerUsuarios,
  obtenerUsuariosActivos,
  obtenerUsuariosRetirados,
  obtenerUsuarioPorEmail,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
} = require('../controllers/usuarioController');

// GET /api/usuarios - Todos (admin)
router.get('/', authMiddleware, authorize('admin'), obtenerUsuarios);

// GET /api/usuarios/activos - Solo activos (DEBE IR ANTES de /:email)
router.get('/activos', authMiddleware, obtenerUsuariosActivos);

// GET /api/usuarios/retirados - Historial de retirados
router.get('/retirados', authMiddleware, authorize('admin'), obtenerUsuariosRetirados);

// GET /api/usuario/:email - Obtener un usuario por email (DESPUÉS de las específicas)
router.get('/:email', authMiddleware, obtenerUsuarioPorEmail);

// POST /api/usuarios - Crear un nuevo usuario (solo admin)
router.post('/', authMiddleware, authorize('admin'), crearUsuario);

// PUT /api/usuario/:email - Actualizar un usuario por email
router.put('/:email', authMiddleware, actualizarUsuario);

// DELETE /api/usuarios/:id - Eliminar un usuario por ID (solo admin)
router.delete('/:id', authMiddleware, authorize('admin'), eliminarUsuario);

module.exports = router;