const express = require('express');
const router = express.Router();
const { 
  getAllProveedores,
  getProveedorById,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  sincronizarContador
} = require('../controllers/porveedorController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');

// Rutas públicas (requieren autenticación)
router.get('/', authMiddleware, getAllProveedores);
router.get('/:id', authMiddleware, getProveedorById);

// Rutas protegidas (solo administradores y contadores)
router.post('/', authMiddleware, authorize('admin', 'contabilidad'), createProveedor);
router.put('/:id', authMiddleware, authorize('admin', 'contabilidad'), updateProveedor);
router.delete('/:id', authMiddleware, authorize('admin', 'contabilidad'), deleteProveedor);

// Ruta de sincronización (solo administradores)
router.post('/sincronizar', authMiddleware, authorize('admin'), sincronizarContador);

module.exports = router;