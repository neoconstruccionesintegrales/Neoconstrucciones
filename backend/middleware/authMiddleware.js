const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_aqui_cambiar_en_produccion';

/**
 * Middleware de autenticación JWT
 * Verifica que el token sea válido y agrega req.user
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
        
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso denegado. Token no proporcionado.' 
      });
    }
      
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);  
      req.user = decoded;
      next();
        
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado. Por favor inicie sesión nuevamente.' 
      });
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Token inválido.' 
    });
  }
};

/**
 * Middleware de autorización por roles
 * @param  {...string} roles - Roles permitidos
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autenticado.' 
      });
    }
        
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tiene permisos para realizar esta acción.' 
      });
    }
      
  next();
  };
};

module.exports = { authMiddleware, authorize, JWT_SECRET };