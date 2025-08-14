import { createConnection as dbConnect } from 'mysql2/promise'; 
import express from 'express'; 
import session from 'express-session'; 
import path from 'path'; 
import { fileURLToPath } from 'url'; 
 
const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename); 
 
// Importar configuracion y utilidades 
import config from './backend/src/config/database.js'; 
import Utils from './backend/src/utils/logger.js'; 
Utils.logEnabled = config.debug; 
 
// Importar rutas 
import mainRouter from './backend/src/routes/Main.js'; 
import adminRouter from './backend/src/routes/Admin.js'; 
import userRouter from './backend/src/routes/User.js'; 
 
// Inicializar 
Utils.logInfo("Inicializando SmartBee WebApp Unificada"); 
 
// Conectar a la base de datos 
const db = await initDB(); 
 
// Inicializar la app express 
const app = initAPP(); 
 
// Iniciar servidor 
app.listen(config.server.port, config.server.host, () => { 
    Utils.logInfo(`Servidor SmartBee escuchando en http://${config.server.host}:${config.server.port}`); 
}); 
 
// Funciones 
async function initDB() { 
    Utils.logInfo(`Conectando a la Base de Datos en ${config.db.database}:${config.db.port}`); 
    try { 
        const db = await dbConnect({ 
            host: config.db.host, 
            port: config.db.port, 
            database: config.db.database, 
            user: config.db.user, 
            password: config.db.password 
        }); 
        Utils.logInfo("Conectado a la Base de Datos"); 
        return db; 
    } catch (err) { 
        Utils.logError("Error al conectar a la Base de Datos:"); 
        Utils.logError(`    ${err.message}`); 
        process.exit(1); 
    } 
} 
 
function initAPP() { 
    Utils.logInfo("Configurando la aplicación Express"); 
    let app = express(); 
 
    // Configurar sesiones 
    const sessionConfig = { 
        store: new session.MemoryStore(), 
        name: "SMARTBEE", 
        secret: "8A8FCE65-C0E4-484C-B432-32C28E335956", 
        resave: false, 
        saveUninitialized: false, 
        cookie: { secure: false } 
    }; 
 
    if (config.production) { 
        sessionConfig.cookie.secure = true; 
        app.set('trust proxy', 1); 
    } 
 
    app.use(session(sessionConfig)); 
    app.use(express.urlencoded({ extended: true })); 
    app.use(express.json()); 
 
    // Middleware para debug 
    if (config.debug) { 
        app.use((req, res, next) => { 
            Utils.logInfo(`${req.protocol}://${req.host}${req.path} - ${req.method}`); 
            next(); 
        }); 
    } 
 
    // Servir archivos estaticos del frontend 
    app.use(express.static(path.join(__dirname, 'frontend/public'))); 
 
    // Middleware para evitar cache 
    app.use((req, res, next) => { 
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate'); 
        res.setHeader('Pragma', 'no-cache'); 
        res.setHeader('Expires', '0'); 
        next(); 
    }); 
 
    // Rutas de la aplicacion 
    app.use('/', mainRouter(db)); 
    app.use('/admin', adminRouter(db)); 
    app.use('/user', userRouter(db)); 
 
    // Ruta 404 
    app.use((req, res) => { 
        Utils.logInfo(`Ruta no encontrada -- ${req.method} ${req.path}`); 
        return res.status(404).send("Página no Encontrada"); 
    }); 
 
    Utils.logInfo("Aplicación Express configurada"); 
    return app; 
}
