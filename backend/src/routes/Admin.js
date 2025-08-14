import fs from 'fs/promises';
import express from 'express';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Utils from '../utils/logger.js';

export default function adminRouter(db) {
    const router = express.Router();

    // Middleware para verificar el rol de administrador
    router.use(async (req, res, next) => {
        // la url
        Utils.logInfo(`Ruta /admin -- ${req.method} ${req.path}`);
        Utils.logInfo(`    req.session.smartbee: ${JSON.stringify(req.session.smartbee)}`);

        // solo usuario con rol ADM puede acceder
        if (req.session.smartbee?.rol !== 'ADM') {
            Utils.logInfo("    Usuario no autorizado para acceder a esta ruta");

            // guardamos el error en la sesión
            req.session.smartbee = { error: "Acceso denegado" };
            await Utils.saveSession(req, res);
            return res.status(303).redirect('/');
        }
        next();
    });

    router.get('/usuarios', async (req, res) => {
        // procesamos la página
        try {
            const html = await fs.readFile(path.join(__dirname, '../../../frontend/public/admin/usuarios.html'), 'utf-8');
            const page = cheerio.load(html);
            //page('#botonUsuarios').attr('onclick', "window.location.href='/admin/usuarios'");
            page('#botonColmenas').attr('onclick', "window.location.href='/admin/colmenas'");
            page('#botonNodos').attr('onclick', "window.location.href='/admin/nodos'");
            page('#botonSalir').attr('onclick', "window.location.href='/logout'");
            return res.send(page.html());
        } catch (err) {
            Utils.logError(`Error leyendo html: ${err.message}`);
            return res.status(500).send("[//admin] Error interno");
        }
    });

    router.get('/colmenas', async (req, res) => {
        // procesamos la página
        try {
            const html = await fs.readFile(path.join(__dirname, '../../../frontend/public/admin/colmenas.html'), 'utf-8');
            const page = cheerio.load(html);
            page('#botonUsuarios').attr('onclick', "window.location.href='/admin/usuarios'");
            //page('#botonColmenas').attr('onclick', "window.location.href='/admin/colmenas'");
            page('#botonNodos').attr('onclick', "window.location.href='/admin/nodos'");
            page('#botonSalir').attr('onclick', "window.location.href='/logout'");
            return res.send(page.html());
        } catch (err) {
            Utils.logError(`Error leyendo html: ${err.message}`);
            return res.status(500).send("[//admin] Error interno");
        }
    });

    router.get('/nodos', async (req, res) => {
        // procesamos la página
        try {
            const html = await fs.readFile(path.join(__dirname, '../../../frontend/public/admin/nodos.html'), 'utf-8');
            const page = cheerio.load(html);
            page('#botonUsuarios').attr('onclick', "window.location.href='/admin/usuarios'");
            page('#botonColmenas').attr('onclick', "window.location.href='/admin/colmenas'");
            //page('#botonNodos').attr('onclick', "window.location.href='/admin/nodos'");
            page('#botonSalir').attr('onclick', "window.location.href='/logout'");
            return res.send(page.html());
        } catch (err) {
            Utils.logError(`Error leyendo html: ${err.message}`);
            return res.status(500).send("[//admin] Error interno");
        }
    });

    return router;
}
