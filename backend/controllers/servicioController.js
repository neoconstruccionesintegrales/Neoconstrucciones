const Servicio = require('../models/servicio');

// 1. OBTENER SERVICIOS (Con filtro por estado)
const obtenerServicios = async (req, res) => {
  try {
    const { estado } = req.query; // Filtrar por estado: 'Activo' o 'Inactivo'
    
    let filtro = {};
    if (estado && (estado === 'Activo' || estado === 'Inactivo')) {
      filtro.estado = estado;
    }
    
    const servicios = await Servicio.find(filtro);
    
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

// 2. CREAR UN NUEVO SERVICIO
const crearServicio = async (req, res) => {
  try {
    // Si no se envía estado, se usa el valor por defecto 'Activo'
    const nuevoServicio = new Servicio(req.body);
    await nuevoServicio.save();
    res.status(201).json({ success: true, msg: 'Servicio creado con éxito', data: nuevoServicio });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// 3. ELIMINAR UN SERVICIO (CAMBIO: Ahora inactiva en lugar de eliminar)
const eliminarServicio = async (req, res) => {
  try {
    const { idServicio } = req.params;
    
    // ✅ En lugar de eliminar, marcar como INACTIVO (soft delete)
    const servicioActualizado = await Servicio.findOneAndUpdate(
      { idServicio: idServicio },
      { estado: 'Inactivo' },
      { new: true }
    );
    
    if (!servicioActualizado) {
      return res.status(404).json({ success: false, error: 'El servicio no existe en la base de datos.' });
    }
    
    res.status(200).json({ 
      success: true, 
      msg: 'Servicio marcado como INACTIVO', 
      data: servicioActualizado 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. ACTUALIZAR UN SERVICIO
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
    res.status(200).json({ success: true, msg: 'Servicio actualizado en Atlas!', data: servicioActualizado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 5. ✅ NUEVO: REACTIVAR SERVICIO (Cambiar de Inactivo a Activo)
const reactivarServicio = async (req, res) => {
  try {
    const { idServicio } = req.params;
    const servicioActualizado = await Servicio.findOneAndUpdate(
      { idServicio: idServicio },
      { estado: 'Activo' },
      { new: true }
    );
    if (!servicioActualizado) {
      return res.status(404).json({ success: false, error: 'Servicio no encontrado.' });
    }
    res.status(200).json({ 
      success: true, 
      msg: 'Servicio reactivado correctamente', 
      data: servicioActualizado 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  obtenerServicios,
  crearServicio,
  eliminarServicio,
  actualizarServicio,
  reactivarServicio // ✅ Exportar nueva función
};