const express = require('express');
const router = express.Router();
const { 
  getAllFacturasCompra,
  getFacturaCompraById,
  createFacturaCompra,
  updateFacturaCompra,
  deleteFacturaCompra,
  getResumenCompras,
  sincronizarContador
} = require('../controllers/facturaCompraController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware');

// Rutas de consulta (requieren autenticación)
router.get('/', authMiddleware, getAllFacturasCompra);
router.get('/resumen', authMiddleware, getResumenCompras);
router.get('/:id', authMiddleware, getFacturaCompraById);

// Rutas de escritura (solo administradores y contadores)
router.post('/', authMiddleware, authorize('admin', 'contabilidad'), createFacturaCompra);
router.put('/:id', authMiddleware, authorize('admin', 'contabilidad'), updateFacturaCompra);
router.delete('/:id', authMiddleware, authorize('admin', 'contabilidad'), deleteFacturaCompra);

// Ruta de sincronización (solo administradores)
router.post('/sincronizar', authMiddleware, authorize('admin'), sincronizarContador);

module.exports = router;