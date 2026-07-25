const express = require('express');
const router = express.Router();
const Novedad = require('../models/Novedad');
const { authMiddleware } = require('../middleware/authMiddleware');

const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    const rol = req.user?.rol;  // ← CAMBIADO
    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    next();
  };
};

router.use(authMiddleware);

router.post('/', verificarRol(['admin', 'gerente', 'secretaria']), async (req, res) => {
  try {
    const datos = req.body;
    datos.idNovedad = `NOV-${Date.now()}`;
    datos.registradoPor = req.user?.email || 'sistema';  // ← CAMBIADO
    
    const msDia = 1000 * 60 * 60 * 24;
    const dias = Math.ceil((new Date(datos.fechaFin) - new Date(datos.fechaInicio)) / msDia) + 1;
    datos.dias = dias;
    
    const novedad = new Novedad(datos);
    await novedad.save();
    res.json({ success: true, data: novedad });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const filtro = {};
    if (req.query.email) filtro.email = req.query.email;
    if (req.query.estado) filtro.estado = req.query.estado;
    
    const novedades = await Novedad.find(filtro).sort({ createdAt: -1 });
    res.json({ success: true, data: novedades });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/aprobar', verificarRol(['admin', 'gerente']), async (req, res) => {
  try {
    const nov = await Novedad.findById(req.params.id);
    if (!nov) return res.status(404).json({ success: false, error: 'No encontrada' });
    
    nov.estado = 'aprobada';
    nov.aprobadoPor = req.user?.email || 'sistema';  // ← CAMBIADO
    
    if (nov.tipo.startsWith('incapacidad')) {
      const diasEmpresa = Math.min(nov.dias, 3);
      nov.diasPagadosEmpresa = diasEmpresa;
      nov.diasPagadosEPS = Math.max(0, nov.dias - 3);
      
      const Usuario = require('../models/usuario');
      const emp = await Usuario.findOne({ email: nov.email });
      const salarioBase = emp?.sueldo || 0;
      nov.valorPagadoEmpresa = (salarioBase / 30) * diasEmpresa;
      nov.valorPagadoEPS = (salarioBase / 30) * nov.diasPagadosEPS * 0.6667;
    }
    
    await nov.save();
    res.json({ success: true, data: nov });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;