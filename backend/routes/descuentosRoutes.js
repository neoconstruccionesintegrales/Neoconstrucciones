const express = require('express');
const router = express.Router();
const descuentos = require('../controllers/descuentosController');

// Si tienes middleware de auth, descomenta la siguiente línea y ajusta la ruta:
// const { autenticar } = require('../middleware/auth');

router.post('/', descuentos.crearDescuento);
router.get('/', descuentos.listarDescuentos);
router.get('/resumen/:email', descuentos.resumenEmpleado);
router.get('/:id', descuentos.getDescuentoById);
router.put('/:id', descuentos.actualizarDescuento);
router.patch('/:id/aprobar', descuentos.aprobarDescuento);
router.patch('/:id/cancelar', descuentos.cancelarDescuento);
router.patch('/:id/estado', descuentos.cambiarEstado);

module.exports = router;