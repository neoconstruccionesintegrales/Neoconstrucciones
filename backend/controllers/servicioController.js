const Servicio = require('../models/servicio');

// 1. OBTENER SERVICIOS (Calcula el subtotal de materiales dinámicamente)
const obtenerServicios = async (req, res) => {
  try {
    const servicios = await Servicio.find();
       // Mapeamos los servicios para incluir el subtotal calculado de materiales
      const serviciosConSubtotal = servicios.map(srv => {
        const subtotalMateriales = srv.materiales.reduce((acc, mat) => acc + mat.costoEstimado, 0);
        return {
          ...srv._doc,
          subtotalMateriales: subtotalMateriales
        };
      });
    res.status(200).json({ success: true, data: serviciosConSubtotal });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. CREAR UN NUEVO SERVICIO (Con su lista de materiales)
const crearServicio = async (req, res) => {
  try {
    const nuevoServicio = new Servicio(req.body);
      await nuevoServicio.save();
      res.status(201).json({ success: true, msg: 'Servicio creado con éxito', data: nuevoServicio });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// 3. ELIMINAR UN SERVICIO POR SU idServicio
const eliminarServicio = async (req, res) => {
  try {
    const { idServicio } = req.params;
      // Busca en Atlas usando tu identificador personalizado de ingeniería
      const servicioEliminado = await Servicio.findOneAndDelete({ idServicio: idServicio });
        if (!servicioEliminado) {
          return res.status(404).json({ success: false, error: 'El servicio no existe en la base de datos.' });
        }
        res.status(200).json({ success: true, msg: 'Servicio eliminado correctamente de Atlas' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. ACTUALIZAR UN SERVICIO POR SU idServicio
const actualizarServicio = async (req, res) => {
  try {
    const { idServicio } = req.params;
      const servicioActualizado = await Servicio.findOneAndUpdate(
        { idServicio: idServicio },
        req.body,
        { new: true, runValidators: true }
    );
    if (!servicioActualizado) {
      return res.status(404).json({ success: false, error: 'Servicio no encontrado.' });
    }
    res.status(200).json({ success: true, msg: 'Precios y datos actualizados en Atlas!', data: servicioActualizado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  obtenerServicios,
  crearServicio,
  eliminarServicio,
  actualizarServicio
};