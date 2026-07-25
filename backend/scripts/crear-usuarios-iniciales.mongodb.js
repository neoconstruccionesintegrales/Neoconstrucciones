// Selecciona la base de datos de Neoconstrucciones
use('neoconstrucciones');

// 1. Crea la colección de usuarios
db.createCollection('usuarios');

// 2. Inserta el primer administrador
db.getCollection('usuarios').insertOne({
  "email": "saydc@neoconstrucciones.com",
  "password": "admin123",
  "nombre": "Administrador Principal",
  "rol": "admin",
  "createdAt": new Date()
});

// 3. Verifica que se creó correctamente
db.getCollection('usuarios').find({});
use("neoconstrucciones");
