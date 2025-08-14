import fs from 'fs/promises';
import express from 'express';
import * as cheerio from 'cheerio';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Utils from '../utils/logger.js';

export default function mainRouter(db) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        Utils.logInfo(`Ruta / -- ${req.method} ${req.path}`);
        Utils.logInfo(`    req.session.smartbee: ${JSON.stringify(req.session.smartbee)}`);

        const errMsg = req.session.smartbee?.error;
        req.session.smartbee = {};
        await Utils.saveSession(req, res);

        try {
            // Ruta actualizada para el frontend organizado
            const frontendPath = path.join(__dirname, '../../../frontend/public/index.html');
            const html = await fs.readFile(frontendPath, 'utf-8');
            const page = cheerio.load(html);

            page('#loginForm').attr('action', '/login');
            page('#button-group button:contains("Apicultor")').remove();

            if (errMsg !== undefined) {
                page('#errorMessage').text(errMsg);
            }

            return res.send(page.html());
        } catch (err) {
            Utils.logError(`Error leyendo html: ${err.message}`);
            return res.status(500).send("[/main] Error interno");
        }
    });

    router.post('/login', async (req, res) => {
        // la url
        Utils.logInfo(`Ruta / -- ${req.method} ${req.path}`);
        Utils.logInfo(`    req.session.smartbee: ${JSON.stringify(req.session.smartbee)}`);

        // no deben existir datos de un usuario autentificado
        if (req.session.smartbee?.user) {
            Utils.logInfo(`    Ya existe usuario autentificado: ${req.session.smartbee.user}`);
            return res.status(303).redirect('/');
        }

        // deben venir el nombre de usuario y clave
        const username = req.body?.username;
        const password = req.body?.password;
        if (!username?.trim() || !password?.trim()) {
            Utils.logInfo("    Faltan datos de autentificación");

            // guardamos el error en la sesión
            req.session.smartbee = { error: "Debe ingresar nombre de Usuario y Clave" };
            await Utils.saveSession(req, res);
            return res.status(303).redirect('/');
        }

        // obtenemos el tipo y clave (su hash) del usuario
        let reg;
        try {
            const sql = "SELECT rol, clave FROM usuario WHERE id = ? and activo = 1";
            [reg] = await db.query(sql, [username]);
            if (reg.length != 1) {
                Utils.logInfo("    Usuario no existe o no está activo");

                // guardamos el error en la sesión
                req.session.smartbee = { error: "Usuario o Clave no válidas" };
                await Utils.saveSession(req, res);
                return res.status(303).redirect('/');
            }
        }
        catch (err) {
            Utils.logError(`    ${err.message}`);

            // guardamos el error en la sesión
            req.session.smartbee = { error: "Error al consultar la Base de Datos" };
            await Utils.saveSession(req, res);
            return res.status(303).redirect('/');
        }

        // validamos la clave
        const esValida = await bcrypt.compare(password, reg[0].clave);
        if (!esValida) {
            Utils.logInfo("    Clave no válida");

            // guardamos el error en la sesión
            req.session.smartbee = { error: "Usuario o Clave no válidas" };
            await Utils.saveSession(req, res);
            return res.status(303).redirect('/');
        }

        Utils.logInfo(`Usuario ${username} autentificado correctamente (rol: ${reg[0].rol})`);

        // guardamos el usuario en la sesión
        req.session.smartbee = {
            user: username,
            rol: reg[0].rol
        };
        await Utils.saveSession(req, res);

        // redireccionamos segun el rol del usuario
        if (req.session.smartbee.rol == 'ADM')
            return res.status(303).redirect("/admin/usuarios");
        else
            return res.status(303).redirect("/user");
    });

    router.get('/logout', async (req, res) => {
        Utils.logInfo(`Ruta / -- ${req.method} ${req.path}`);
        Utils.logInfo(`    req.session.smartbee: ${JSON.stringify(req.session.smartbee)}`);

        // Limpiar la sesión completamente
        req.session.smartbee = {};
        await Utils.saveSession(req, res);
        
        Utils.logInfo("Sesión limpiada correctamente");
        return res.status(303).redirect("/");
    });
    return router;
}

