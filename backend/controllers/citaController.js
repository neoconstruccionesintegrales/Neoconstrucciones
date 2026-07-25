const Cita = require('../models/cita');

// 1. OBTENER TODAS LAS CITAS
const obtenerCitas = async (req, res) => {
  try {
    const citas = await Cita.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: citas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. CREAR UNA NUEVA CITA
const crearCita = async (req, res) => {
  try {
    const nuevaCita = new Cita(req.body);
      await nuevaCita.save();
      res.status(201).json({ success: true, message: 'Visita tecnica agendada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. ACTUALIZAR UNA CITA POR SU idCita
const actualizarCita = async (req, res) => {
  try {
    const { idCita } = req.params;
    const citaActualizada = await Cita.findOneAndUpdate(
      { idCita },
      req.body,
      { new: true }
    );
    res.status(200).json({ success: true, data: citaActualizada });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
  }
};

// 4. ELIMINAR UNA CITA POR SU idCita
const eliminarCita = async (req, res) => {
  try {
    const { idCita } = req.params;
      await Cita.findOneAndDelete({ idCita });
      res.status(200).json({ success: true, message: 'Registro eliminado de Atlas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  obtenerCitas,
  crearCita,
  actualizarCita,
  eliminarCita
};
