const Clientes = require('../models/clientes');

// 1. OBTENER TODOS LOS CLIENTES
const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Clientes.find();
      res.status(200).json({ success: true, data: clientes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. CREAR UN NUEVO CLIENTE
const crearCliente = async (req, res) => {
  try {
    const nuevoCliente = new Clientes(req.body);
      await nuevoCliente.save();
      res.status(201).json({ success: true, message: 'Cliente guardado en Atlas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. ACTUALIZAR UN CLIENTE POR SU idCliente
const actualizarCliente = async (req, res) => {
  try {
    const { idCliente } = req.params;
    const clienteActualizado = await Clientes.findOneAndUpdate(
      { idCliente },
      req.body,
      { new: true }
    );
    res.status(200).json({ success: true, data: clienteActualizado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. ELIMINAR UN CLIENTE POR SU idCliente
const eliminarCliente = async (req, res) => {
  try {
    const { idCliente } = req.params;
      await Clientes.findOneAndDelete({ idCliente });
      res.status(200).json({ success: true, message: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente
};
