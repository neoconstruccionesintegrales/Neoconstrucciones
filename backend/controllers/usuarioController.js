const Usuario = require('../models/usuario');

const { 
  getNivelARLByRol, 
  calcularValorHora, 
  debeRecibirAuxilio,
  calcularAuxilioTransporte,
  SMLV,
  AUXILIO_TRANSPORTE,
  TOPE_AUXILIO
} = require('../utils/nominaHelpers');

// 1. OBTENER TODOS LOS USUARIOS
const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    const usuariosConSueldo = usuarios.map(u => ({
      ...u.toObject(),
      sueldo: u.sueldo || 0
    }));
    res.status(200).json({ success: true, data: usuariosConSueldo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. OBTENER USUARIOS ACTIVOS (para nómina y proyectos)
const obtenerUsuariosActivos = async (req, res) => {
  try {
    const usuarios = await Usuario.find({ 
      estadoLaboral: 'activo',
      liquidacionGenerada: { $ne: true }
    });
    res.status(200).json({ success: true, data: usuarios });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. OBTENER USUARIOS RETIRADOS (historial)
const obtenerUsuariosRetirados = async (req, res) => {
  try {
    const usuarios = await Usuario.find({ 
      $or: [
      { estadoLaboral: 'retirado' },
      { liquidacionGenerada: true }
      ]
    });
    res.status(200).json({ success: true, data: usuarios });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. OBTENER UN USUARIO POR EMAIL
const obtenerUsuarioPorEmail = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ email: req.params.email });
      if (usuario) {
        res.status(200).json({ success: true, data: usuario });
      } else {
        res.status(404).json({ success: false, error: "Usuario no encontrado" });
      }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 5. CREAR UN NUEVO USUARIO
const crearUsuario = async (req, res) => {
  try {
    const data = req.body;
       
    // Validaciones básicas
    if (!data.email || !data.nombre || !data.documento) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
    }
   
    // Convertir sueldo a número
    data.sueldo = Number(data.sueldo) || 0;
       
    // ✅ VALIDAR SUELDO MÍNIMO LEGAL
    if (data.sueldo > 0 && data.sueldo < SMLV) {
      return res.status(400).json({ 
        success: false, 
          error: `El sueldo no puede ser menor al SMLV 2026 ($${SMLV.toLocaleString('es-CO')})` 
      });
    }
        
    // Asignar ARL automáticamente según rol
    data.nivelARL = getNivelARLByRol(data.rol);
      
    // Calcular valor hora
    data.valorHora = calcularValorHora(data.sueldo, data.tipoContrato, data.tipoSalario);
        
    // Determinar si recibe auxilio transporte
    data.recibeAuxilioTransporte = debeRecibirAuxilio(data.sueldo);
       
    // Validar datos bancarios
    if (!data.datosBancarios || !data.datosBancarios.banco || !data.datosBancarios.numeroCuenta) {
      return res.status(400).json({ success: false, error: 'Datos bancarios son obligatorios' });
    }
        
      const nuevoUsuario = new Usuario(data);
      await nuevoUsuario.save();
      
      res.status(201).json({ success: true, message: 'Usuario creado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
// 6. ACTUALIZAR UN USUARIO POR EMAIL
const actualizarUsuario = async (req, res) => {
  try {
    const { email } = req.params;
    let updateData = { ...req.body };
    delete updateData.email;
        
   // Buscar usuario actual
  const usuarioActual = await Usuario.findOne({ email });
    if (!usuarioActual) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
        
    // BLOQUEO ANTI-DESFALCO: No permitir reactivar usuario liquidado
    if (usuarioActual.liquidacionGenerada && updateData.estadoLaboral === 'activo') {
      return res.status(403).json({ 
        success: false, 
        error: 'Este usuario fue liquidado. No se puede reactivar. Cree un nuevo usuario si es reingreso.' 
      });
    }
        
    // Si cambia sueldo, recalcular valor hora y auxilio
    if (updateData.sueldo !== undefined) {
      updateData.sueldo = Number(updateData.sueldo) || 0;
      updateData.valorHora = calcularValorHora(
      updateData.sueldo, 
      updateData.tipoContrato || usuarioActual.tipoContrato,
      updateData.tipoSalario || usuarioActual.tipoSalario
      );
    updateData.recibeAuxilioTransporte = debeRecibirAuxilio(updateData.sueldo);
    }
        
    // Si cambia rol, actualizar ARL
    if (updateData.rol) {
      updateData.nivelARL = getNivelARLByRol(updateData.rol);
    }
        
    const usuarioActualizado = await Usuario.findOneAndUpdate(
      { email: email },
      { $set: updateData },
      { new: true, runValidators: true }
    );
        
    res.status(200).json({ success: true, message: 'Usuario actualizado correctamente', data: usuarioActualizado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 7. ELIMINAR UN USUARIO POR ID
const eliminarUsuario = async (req, res) => {
  try {
    await Usuario.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ EXPORTS (asegúrate de que todas las funciones estén definidas arriba)
module.exports = {
  obtenerUsuarios,
  obtenerUsuariosActivos,
  obtenerUsuariosRetirados,
  obtenerUsuarioPorEmail,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
};