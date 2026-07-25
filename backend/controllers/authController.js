const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// 1. LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ email });

    if (!usuario || usuario.password !== password) {
      return res.status(401).json({ success: false, error: 'Credenciales invalidas.' });
    }

    const token = jwt.sign(
    { id: usuario._id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: { email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  login
};
