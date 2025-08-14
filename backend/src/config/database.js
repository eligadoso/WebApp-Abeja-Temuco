// configuración de la base de datos
const db = {
    host: "127.0.0.1",
    port: 3306,
    database: "smartbee",
    user: "Nopassword",
    password: ""
};

// punto de escucha de la app
const server = {
    host: "127.0.0.1",
    port: 3000,
}

// para depurar en la consola
const debug = true;

// para operar en produccion
const production = false

// la configuracion a exportar
const config = {
    db,
    server,
    production,
    debug
};

export default config;
