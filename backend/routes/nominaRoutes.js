const express = require('express');
const router = express.Router();
const nominaController = require('../controllers/nominaController');
const { authMiddleware } = require('../middleware/authMiddleware');

const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    const rol = req.user?.rol;
    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    next();
  };
};

router.use(authMiddleware);

// ============================================
// RUTAS ESPECÍFAS PRIMERO (más específicas arriba)
// ============================================

// Verificaciones
router.get('/verificar-inasistencias', nominaController.verificarInasistencias);
router.get('/verificar-vacaciones', nominaController.verificarVacaciones);

// LIQUIDACIONES: orden MÁS específico → MENOS específico
router.get('/liquidaciones/empleado/:email', nominaController.getLiquidacionesEmpleado);  
router.get('/liquidaciones/exportar-excel', nominaController.exportarLiquidacionesExcel);
router.get('/liquidaciones/:id', nominaController.getLiquidacionById);                     
router.get('/liquidaciones', nominaController.getLiquidaciones);                            

// Nómina
router.post('/calcular', verificarRol(['admin', 'gerente', 'secretaria']), nominaController.calcularNomina);
router.post('/liquidar', verificarRol(['admin', 'gerente']), nominaController.liquidarContrato);
router.post('/nomina/prima', nominaController.liquidarPrima);
router.post('/cesantias-fondo', nominaController.generarCesantiasFondo);

// Reporte (2 segmentos, antes de /:id)
router.get('/:idNomina/reporte', verificarRol(['admin', 'gerente', 'contabilidad']), nominaController.reporteContador);

// ============================================
// RUTAS GENÉRICAS AL FINAL
// ============================================
router.get('/', nominaController.getNominas);
router.get('/:id', nominaController.getNominaById);
router.put('/:id/aprobar', verificarRol(['admin', 'gerente']), nominaController.aprobarNomina);
router.put('/:id/pagar', verificarRol(['admin', 'gerente', 'secretaria']), nominaController.pagarNomina);

module.exports = router;