const express = require('express');
const router = express.Router();

const {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} = require('../controllers/clienteController');

const { authMiddleware, authorize } = require('../middleware/authMiddleware');

// GET /api/clientes - Obtener todos los clientes
router.get('/', authMiddleware, obtenerClientes);

// POST /api/clientes - Crear un nuevo cliente
router.post('/', authMiddleware, crearCliente);

// PUT /api/clientes/:idCliente - Actualizar un cliente
router.put('/:idCliente', authMiddleware, actualizarCliente);

// DELETE /api/clientes/:idCliente - Eliminar un cliente (solo admin)
router.delete('/:idCliente', authMiddleware, authorize('admin'), eliminarCliente);

module.exports = router;
