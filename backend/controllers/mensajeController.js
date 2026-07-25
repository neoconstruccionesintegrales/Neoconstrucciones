const Mensaje = require('../models/mensaje');

// 1. OBTENER TODOS LOS MENSAJES
const obtenerMensajes = async (req, res) => {
  try {
    const mensajes = await Mensaje.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: mensajes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. CREAR UN NUEVO MENSAJE
const crearMensaje = async (req, res) => {
  try {
    const nuevoMensaje = new Mensaje(req.body);
      await nuevoMensaje.save();
      res.status(201).json({ success: true, message: 'Mensaje guardado en Atlas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. ACTUALIZAR UN MENSAJE POR SU idMensaje
const actualizarMensaje = async (req, res) => {
  try {
    const { idMensaje } = req.params;
    const mensajeActualizado = await Mensaje.findOneAndUpdate(
      { idMensaje },
      req.body,
      { new: true }
    );
    res.status(200).json({ success: true, data: mensajeActualizado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. ELIMINAR UN MENSAJE POR SU idMensaje
const eliminarMensaje = async (req, res) => {
  try {
    const { idMensaje } = req.params;
      await Mensaje.findOneAndDelete({ idMensaje });
      res.status(200).json({ success: true, message: 'Registro eliminado de Atlas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  obtenerMensajes,
  crearMensaje,
  actualizarMensaje,
  eliminarMensaje
};
