const Utils = {
    logEnabled: false,
    logError(msg) {
        if (Utils.logEnabled) console.log(new Date(), ` - [ERROR] ${msg}`);
    },
    logInfo(msg) {
        if (Utils.logEnabled) console.log(new Date(), ` - [INFO ] ${msg}`);
    },
    async saveSession(req, res) {
        try {
            await new Promise((resolve, reject) => {
                req.session.save(err => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (err) {
            Utils.logError(`    Error al guardar la sesión: ${err.message}`);
            res.status(500).send("Error al guardar la sesión");
        }
    }
}

export default Utils;
