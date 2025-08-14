import fs from 'fs/promises';
import express from 'express';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import Utils from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function userRouter(db) {
    const router = express.Router();

    // Middleware para verificar el rol de apicultor
    router.use(async (req, res, next) => {
        Utils.logInfo(`Ruta /user -- ${req.method} ${req.path}`);
        Utils.logInfo(`    req.session.smartbee: ${JSON.stringify(req.session.smartbee)}`);

        if (req.session.smartbee?.rol !== 'API') {
            Utils.logInfo("Usuario no autorizado para acceder a esta ruta");
            req.session.smartbee = { error: "Acceso denegado" };
            await Utils.saveSession(req, res);
            return res.status(303).redirect('/');
        }
        next();
    });

    // API para obtener configuración del cliente
    router.get('/config', (req, res) => {
        res.json({
            useMockData: false, // Siempre false - solo datos reales
            apiBaseUrl: CONFIG.API_BASE_URL,
            userId: req.session.smartbee?.user
        });
    });

    // API para datos en tiempo real
    router.get('/realtime/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            
            // Consulta para datos de COLMENA
            const colmenaQuery = `
                SELECT 
                    nm.payload,
                    nm.fecha,
                    n.descripcion as nodo_descripcion,
                    nt.descripcion as tipo_descripcion,
                    'colmena' as fuente
                FROM nodo_mensaje nm
                JOIN nodo_colmena nc ON nm.nodo_id = nc.nodo_id
                JOIN colmena c ON nc.colmena_id = c.id
                JOIN nodo n ON nm.nodo_id = n.id
                JOIN nodo_tipo nt ON n.tipo = nt.tipo
                WHERE c.dueno = ?
                ORDER BY nm.fecha DESC
                LIMIT 1
            `;
            
            // Consulta para datos AMBIENTALES
            const ambientalQuery = `
                SELECT 
                    nm.payload,
                    nm.fecha,
                    n.descripcion as nodo_descripcion,
                    nt.descripcion as tipo_descripcion,
                    'ambiental' as fuente
                FROM nodo_mensaje nm
                JOIN nodo_estacion ne ON nm.nodo_id = ne.nodo_id
                JOIN estacion e ON ne.estacion_id = e.id
                JOIN nodo n ON nm.nodo_id = n.id
                JOIN nodo_tipo nt ON n.tipo = nt.tipo
                WHERE e.dueno = ?
                ORDER BY nm.fecha DESC
                LIMIT 1
            `;
            
            const [colmenaRows] = await db.execute(colmenaQuery, [userId]);
            const [ambientalRows] = await db.execute(ambientalQuery, [userId]);
            
            // Procesar datos de colmena
            const processedData = {
                timestamp: new Date().toISOString(),
                temperature: 0,
                humidity: 0,
                weight: 0,
                beeActivity: "Sin datos",
                hiveTemperature: 0,
                hiveHumidity: 0
            };
            
            // Datos de colmena
            if (colmenaRows.length > 0) {
                try {
                    const colmenaData = JSON.parse(colmenaRows[0].payload);
                    processedData.weight = colmenaData.peso || colmenaData.weight || 0;
                    processedData.hiveTemperature = colmenaData.temperatura || colmenaData.temperature || 0;
                    processedData.hiveHumidity = colmenaData.humedad || colmenaData.humidity || 0;
                    processedData.beeActivity = colmenaData.beeActivity || "Normal";
                    processedData.timestamp = colmenaRows[0].fecha;
                } catch (parseError) {
                    Utils.logError(`Error parsing colmena payload: ${parseError.message}`);
                }
            }
            
            // Datos ambientales
            if (ambientalRows.length > 0) {
                try {
                    const ambientalData = JSON.parse(ambientalRows[0].payload);
                    processedData.temperature = ambientalData.temperatura || ambientalData.temperature || 0;
                    processedData.humidity = ambientalData.humedad || ambientalData.humidity || 0;
                } catch (parseError) {
                    Utils.logError(`Error parsing ambiental payload: ${parseError.message}`);
                }
            }
            
            res.json(processedData);
        } catch (error) {
            Utils.logError(`Error en API realtime: ${error.message}`);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // API para datos históricos
    router.get('/historical/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { period = 'day', hive = 'all', source = 'exterior', startDate, endDate } = req.query;
            
            let query, params;
            
            if (source === 'colmena') {
                // Consulta para datos de colmena
                query = `
                    SELECT 
                        nm.payload,
                        nm.fecha,
                        c.id as colmena_id,
                        c.descripcion as colmena_descripcion
                    FROM nodo_mensaje nm
                    JOIN nodo_colmena nc ON nm.nodo_id = nc.nodo_id
                    JOIN colmena c ON nc.colmena_id = c.id
                    WHERE c.dueno = ?
                `;
            } else {
                // Consulta para datos ambientales
                query = `
                    SELECT 
                        nm.payload,
                        nm.fecha,
                        e.id as estacion_id,
                        e.descripcion as estacion_descripcion
                    FROM nodo_mensaje nm
                    JOIN nodo_estacion ne ON nm.nodo_id = ne.nodo_id
                    JOIN estacion e ON ne.estacion_id = e.id
                    WHERE e.dueno = ?
                `;
            }
            
            // Logging para depuración
            Utils.logInfo(`Consultando datos históricos para usuario: ${userId}, período: ${period}`);
            
            const conditions = [];
            params = [userId];
    
            if (hive !== 'all') {
                conditions.push('c.id = ?');
                params.push(hive);
            }
    
            if (startDate) {
                conditions.push('nm.fecha >= ?');
                params.push(startDate);
            }
    
            if (endDate) {
                conditions.push('nm.fecha <= ?');
                params.push(endDate);
            }
    
            // Agregar condiciones de período
            switch (period) {
                case 'day':
                    conditions.push('nm.fecha >= DATE_SUB(NOW(), INTERVAL 1 DAY)');
                    break;
                case 'week':
                    conditions.push('nm.fecha >= DATE_SUB(NOW(), INTERVAL 1 WEEK)');
                    break;
                case 'month':
                    conditions.push('nm.fecha >= DATE_SUB(NOW(), INTERVAL 1 MONTH)');
                    break;
                case 'year':
                    conditions.push('nm.fecha >= DATE_SUB(NOW(), INTERVAL 1 YEAR)');
                    break;
            }
    
            query = query + (conditions.length ? ' AND ' + conditions.join(' AND ') : '') + ' ORDER BY nm.fecha DESC';
            
            Utils.logInfo(`Consulta SQL histórica: ${query}`);
            Utils.logInfo(`Parámetros: ${JSON.stringify(params)}`);
            
            const [rows] = await db.execute(query, params);
            
            // Logging después de la consulta
            Utils.logInfo(`Registros históricos encontrados: ${rows.length}`);
            if (rows.length > 0) {
                Utils.logInfo(`Primer payload histórico: ${rows[0].payload}`);
                Utils.logInfo(`Última fecha: ${rows[0].fecha}`);
            }
            
            // Procesar y agrupar datos
            const processedData = processHistoricalData(rows, period);
            
            Utils.logInfo(`Datos procesados para período ${period}:`);
            Utils.logInfo(`- day.records: ${processedData.day.records.length}`);
            Utils.logInfo(`- week.dailyData: ${processedData.week.dailyData.length}`);
            Utils.logInfo(`- month.dailyData: ${processedData.month.dailyData.length}`);
            Utils.logInfo(`- year.monthlyData: ${processedData.year.monthlyData.length}`);
            
            res.json(processedData);
        } catch (error) {
            Utils.logError(`Error en API historical: ${error.message}`);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // API para alertas
    router.get('/alerts/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            
            // Consulta real de alertas
            const query = `
                SELECT 
                    na.id,
                    a.nombre as title,
                    a.descripcion as message,
                    a.indicador as type,
                    na.fecha as timestamp,
                    c.descripcion as colmena_descripcion
                FROM nodo_alerta na
                JOIN alerta a ON na.alerta_id = a.id
                JOIN nodo_colmena nc ON na.nodo_id = nc.nodo_id
                JOIN colmena c ON nc.colmena_id = c.id
                WHERE c.dueno = ?
                ORDER BY na.fecha DESC
                LIMIT 20
            `;
            
            const [rows] = await db.execute(query, [userId]);
            
            const alerts = rows.map(row => ({
                id: row.id,
                type: row.type,
                title: row.title,
                message: `${row.message} (${row.colmena_descripcion})`,
                timestamp: new Date(row.timestamp).getTime()
            }));
            
            res.json(alerts);
        } catch (error) {
            Utils.logError(`Error en API alerts: ${error.message}`);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // API para obtener colmenas del usuario
    router.get('/hives/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            
            const query = `
                SELECT id, descripcion as name, latitud, longitud
                FROM colmena
                WHERE dueno = ?
                ORDER BY descripcion
            `;
            
            const [rows] = await db.execute(query, [userId]);
            
            const hives = rows.map(row => ({
                id: row.id,
                name: row.name,
                latitude: row.latitud,
                longitude: row.longitud
            }));
            
            res.json(hives);
        } catch (error) {
            Utils.logError(`Error en API hives: ${error.message}`);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // Ruta principal del dashboard del apicultor
    router.get('/', async (req, res) => {
        try {
            const html = await fs.readFile(path.join(__dirname, '../../../frontend/public/apicultor/apicultor-dashboard.html'), 'utf-8');
            const page = cheerio.load(html);
            
            if (req.session.smartbee?.user) {
                page('.user__name').text(req.session.smartbee.user);
            }
            
            page('#logout-btn').attr('onclick', "window.location.href='/logout';");
            page('link[href="apicultor-dashboard.css"]').attr('href', '/apicultor/apicultor-dashboard.css');
            
            // Actualizar las referencias de los scripts
            page('script[src="apicultor-dashboard-api.js"]').attr('src', '/apicultor/apicultor-dashboard-api.js');
            page('script[src="apicultor-frontend.js"]').attr('src', '/apicultor/apicultor-frontend.js');
            
            // Inyectar configuración SMARTBEE_CONFIG (sin mock data)
            const configScript = `
                <script>
                    window.SMARTBEE_CONFIG = {
                        useMockData: false,
                        apiBaseUrl: '/user',
                        userId: '${req.session.smartbee?.user || 'default'}'
                    };
                </script>
            `;
            page('head').append(configScript);
            
            return res.send(page.html());
        } catch (err) {
            Utils.logError(`Error leyendo html del dashboard: ${err.message}`);
            req.session.smartbee = { error: "Error al cargar el dashboard" };
            await Utils.saveSession(req, res);
            return res.status(303).redirect('/');
        }
    });

    // RUTA DE ARCHIVOS:

    // Ruta para servir el CSS del dashboard
    router.get('/dashboard.css', async (req, res) => {
        try {
            const css = await fs.readFile('site/apicultor/apicultor-dashboard.css', 'utf-8');
            res.setHeader('Content-Type', 'text/css');
            return res.send(css);
        } catch (err) {
            Utils.logError(`Error leyendo CSS: ${err.message}`);
            return res.status(404).send('CSS no encontrado');
        }
    });

    // Ruta para servir el JavaScript del dashboard (versión API)
    router.get('/dashboard.js', async (req, res) => {
        try {
            const js = await fs.readFile('site/apicultor/apicultor-dashboard-api.js', 'utf-8');
            res.setHeader('Content-Type', 'application/javascript');
            return res.send(js);
        } catch (err) {
            Utils.logError(`Error leyendo JavaScript: ${err.message}`);
            return res.status(404).send('JavaScript no encontrado');
        }
    });

    // Ruta para servir el archivo frontend
    router.get('/frontend.js', async (req, res) => {
        try {
            const js = await fs.readFile('site/apicultor/apicultor-frontend.js', 'utf-8');
            res.setHeader('Content-Type', 'application/javascript');
            return res.send(js);
        } catch (err) {
            Utils.logError(`Error leyendo frontend JavaScript: ${err.message}`);
            return res.status(404).send('Frontend JavaScript no encontrado');
        }
    });

    return router;
}

// Función auxiliar para procesar datos históricos
function processHistoricalData(rows, period) {
    // Procesar datos reales de la base de datos
    const records = rows.map(row => {
        let payload = {};
        try {
            payload = JSON.parse(row.payload);
        } catch (parseError) {
            Utils.logError(`Error parsing payload: ${parseError.message}`);
        }
        
        return {
            time: new Date(row.fecha).toLocaleString(), // Formatear fecha
            timestamp: row.fecha, // Mantener timestamp original
            temperature: payload.temperatura || payload.temperature || 0,
            humidity: payload.humedad || payload.humidity || 0,
            weight: payload.peso || payload.weight || 0,
            beeActivity: payload.beeActivity || payload.actividad || 'Normal',
            colmena_id: row.colmena_id,
            estacion_id: row.estacion_id
        };
    });
    
    // Devolver estructura que espera el frontend
    const result = {
        day: { records: [] },
        week: { dailyData: [] },
        month: { dailyData: [] },
        year: { monthlyData: [] }
    };
    
    // Asignar datos según el período solicitado
    switch (period) {
        case 'day':
            result.day.records = records;
            break;
        case 'week':
            // Agrupar por días para la semana
            result.week.dailyData = groupByDay(records);
            break;
        case 'month':
            // Agrupar por días para el mes
            result.month.dailyData = groupByDay(records);
            break;
        case 'year':
            // Para año, agrupar por meses
            result.year.monthlyData = groupByMonth(records);
            break;
    }
    
    return result;
}

// Función auxiliar para agrupar por día
function groupByDay(records) {
    const days = {};
    
    records.forEach(record => {
        const date = new Date(record.timestamp);
        const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!days[dayKey]) {
            days[dayKey] = {
                label: date.toLocaleDateString(),
                date: dayKey,
                records: [],
                averageTemperature: 0,
                averageHumidity: 0,
                averageWeight: 0
            };
        }
        
        days[dayKey].records.push(record);
    });
    
    // Calcular promedios para cada día
    return Object.values(days).map(day => {
        const records = day.records;
        day.averageTemperature = Math.round(records.reduce((sum, r) => sum + r.temperature, 0) / records.length * 10) / 10;
        day.averageHumidity = Math.round(records.reduce((sum, r) => sum + r.humidity, 0) / records.length * 10) / 10;
        day.averageWeight = Math.round(records.reduce((sum, r) => sum + r.weight, 0) / records.length * 10) / 10;
        return day;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Función auxiliar para agrupar datos por mes
function groupByMonth(records) {
    const months = {};
    
    records.forEach(record => {
        const date = new Date(record.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!months[monthKey]) {
            months[monthKey] = {
                label: date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                averageTemperature: 0,
                averageHumidity: 0,
                averageWeight: 0,
                dailyData: []
            };
        }
        
        months[monthKey].dailyData.push(record);
    });
    
    // Calcular promedios para cada mes
    return Object.values(months).map(month => {
        const records = month.dailyData;
        month.averageTemperature = Math.round(records.reduce((sum, r) => sum + r.temperature, 0) / records.length * 10) / 10;
        month.averageHumidity = Math.round(records.reduce((sum, r) => sum + r.humidity, 0) / records.length * 10) / 10;
        month.averageWeight = Math.round(records.reduce((sum, r) => sum + r.weight, 0) / records.length * 10) / 10;
        
        // Agrupar dailyData por días
        month.dailyData = groupByDay(records);
        return month;
    }).sort((a, b) => new Date(`${b.year}-${b.month}`) - new Date(`${a.year}-${a.month}`));
}
