const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const Cotizacion = require('./models/Cotizacion');
require('dotenv').config();

// Importar middleware de autenticacion
const { authMiddleware, authorize, JWT_SECRET } = require('./middleware/authMiddleware');

// ENLACE DE LOS MODELOS MODULARES
const Servicio = require('./models/servicio');
const Mensaje = require('./models/mensaje');
const Cita = require('./models/cita');
const Usuario = require('./models/usuario');
const Clientes = require('./models/clientes');
const Proyecto = require('./models/Proyecto');
const Factura = require('./models/Factura'); // <-- IMPORTANTE: Importar Factura

// Rutas modulares
const authRoutes = require('./routes/authRoutes');
const servicioRoutes = require('./routes/servicioRoutes');
const mensajeRoutes = require('./routes/mensajeRoutes');
const citaRoutes = require('./routes/citaRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const proyectoRoutes = require('./routes/proyectoRoutes');
const cotizacionRoutes = require('./routes/cotizacionRoutes');
const facturaRoutes = require('./routes/facturaRoutes');

// RUTAS DE NÓMINA
const nominaRoutes = require('./routes/nominaRoutes');
const registroTiempoRoutes = require('./routes/registroTiempoRoutes');
const novedadRoutes = require('./routes/novedadRoutes');
const descuentoRoutes = require('./routes/descuentosRoutes');

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware de auditoria
app.use((req, res, next) => {
    console.log(`--- PETICION RECIBIDA: ${req.method} ${req.url} ---`);
    console.log("Cuerpo de la peticion:", req.body);
    next();
});

// ==========================================================================
// RUTAS MODULARES (SOLO UNA VEZ CADA RUTA)
// ==========================================================================
app.use('/api/login', authRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/mensajes', mensajeRoutes);
app.use('/api/citas', citaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/proyectos', authMiddleware, proyectoRoutes);
app.use('/api/cotizaciones', authMiddleware, cotizacionRoutes);
app.use('/api/facturas', authMiddleware, facturaRoutes); // <-- SOLO UNA VEZ, CON AUTH
app.use('/api/nomina', authMiddleware, nominaRoutes);
app.use('/api/asistencia', authMiddleware, registroTiempoRoutes);
app.use('/api/novedades', authMiddleware, novedadRoutes);
app.use('/api/descuentos', descuentoRoutes); // <-- Esta ruta no tiene auth, ¿está bien?

// ==========================================================================
// CONEXION A MONGODB ATLAS
// ==========================================================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conexion exitosa a MongoDB Atlas'))
    .catch((error) => console.error('Error al conectar a MongoDB:', error));

// ==========================================================================
// VIGILANTE DE COTIZACIONES (Cron Job - cada dia a medianoche)
// ==========================================================================
cron.schedule('0 0 * * *', async () => {
    console.log('--- Iniciando barrido diario de cotizaciones ---');
    try {
        const hoy = new Date();

        const cotizacionesVencidas = await Cotizacion.find({
            estado_general: 'Pendiente',
            fechaVencimiento: { $lt: hoy }
        });

        let modificadas = 0;

        for (const cot of cotizacionesVencidas) {
            const vId = cot.version_id || 1;
            const diasValidez = 15 + ((vId - 1) * 3);
            const fechaCreacion = cot.fechaVersion || cot.createdAt || cot.fecha;
            const fechaLimite = new Date(fechaCreacion);
            fechaLimite.setDate(fechaLimite.getDate() + diasValidez);

            if (hoy > fechaLimite) {
                cot.estado_general = 'Caducada';
                await cot.save();
                modificadas++;
            }
        }

        if (modificadas > 0) {
            console.log(`Vigilante: Se han archivado ${modificadas} cotizaciones caducadas.`);
        } else {
            console.log('Vigilante: No se encontraron cotizaciones para archivar hoy.');
        }
    } catch (error) {
        console.error("Error en el vigilante de cotizaciones:", error);
    }
});

// ==========================================================================
// LANZAMIENTO
// ==========================================================================
app.get('/', (req, res) => {
    res.send('Servidor de Neoconstrucciones corriendo perfectamente');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));

// Error handler global
app.use((err, req, res, next) => {
    console.error("ERROR CRITICO CAPTURADO:");
    console.error(err.stack);
    res.status(500).json({
        message: 'Error en el servidor',
        error: err.message
    });
});