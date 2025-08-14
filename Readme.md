# 🛠️ Guía de Instalación - SmartBee WebApp

> Guía completa para instalar y configurar SmartBee en tu entorno

## 📋 Prerrequisitos

### Software Requerido

#### 1. Node.js (>=16.0.0)
```bash
# Verificar instalación
node --version
npm --version

# Si no está instalado, descargar desde:
# https://nodejs.org/
```

#### 2. MySQL Server (>=8.0)
```bash
# Verificar instalación
mysql --version

# Si no está instalado:
# Windows: https://dev.mysql.com/downloads/mysql/
# macOS: brew install mysql
# Ubuntu: sudo apt install mysql-server
```

#### 3. Git (Opcional)
```bash
# Verificar instalación
git --version

# Si no está instalado:
# https://git-scm.com/downloads
```

## 🚀 Instalación Paso a Paso

### Paso 1: Obtener el Código

#### Opción A: Clonar con Git
```bash
git clone <repository-url>
cd SmartBee/Código/WebApp
```

#### Opción B: Descargar ZIP
1. Descargar el archivo ZIP del repositorio
2. Extraer en la ubicación deseada
3. Navegar a la carpeta `SmartBee/Código/WebApp`

### Paso 2: Instalar Dependencias

```bash
# Instalar todas las dependencias
npm install

# Verificar que se instalaron correctamente
npm list --depth=0
```

### Paso 3: Configurar Base de Datos

#### 3.1 Crear Base de Datos
```sql
-- Conectar a MySQL como root
mysql -u root -p

-- Crear base de datos
CREATE DATABASE smartbee CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario (opcional)
CREATE USER 'smartbee_user'@'localhost' IDENTIFIED BY 'tu_password_segura';
GRANT ALL PRIVILEGES ON smartbee.* TO 'smartbee_user'@'localhost';
FLUSH PRIVILEGES;

-- Salir
EXIT;
```

#### 3.2 Ejecutar Scripts de Creación
```bash
# Si tienes el archivo SQL de creación de tablas
mysql -u root -p smartbee < "03 SmartBee Create Table.sql"

# O ejecutar manualmente las consultas SQL necesarias
```

#### 3.3 Configurar Conexión
Editar el archivo `backend/src/config/database.js`:

```javascript
const db = {
    host: "127.0.0.1",          // IP del servidor MySQL
    port: 3306,                  // Puerto de MySQL
    database: "smartbee",        // Nombre de la base de datos
    user: "smartbee_user",       // Usuario de MySQL
    password: "tu_password"      // Contraseña del usuario
};
```

### Paso 4: Configurar Aplicación

#### 4.1 Configuración del Servidor
En `backend/src/config/database.js`, ajustar:

```javascript
const server = {
    host: "127.0.0.1",    // IP donde escuchará el servidor
    port: 3000,           // Puerto del servidor web
};

const debug = true;       // true para desarrollo, false para producción
const production = false; // true para producción
```

#### 4.2 Variables de Entorno (Opcional)
Crear archivo `.env` en la raíz:

```env
# Base de datos
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=smartbee
DB_USER=smartbee_user
DB_PASSWORD=tu_password

# Servidor
SERVER_HOST=127.0.0.1
SERVER_PORT=3000

# Entorno
NODE_ENV=development
DEBUG=true
```

### Paso 5: Crear Datos Iniciales

#### 5.1 Usuario Administrador
```sql
-- Conectar a la base de datos
mysql -u smartbee_user -p smartbee

-- Insertar usuario administrador (la contraseña debe estar hasheada con bcrypt)
INSERT INTO usuario (id, clave, rol, activo) VALUES 
('admin', '$2b$10$hash_de_la_contraseña', 'ADM', 1);

-- Insertar usuario apicultor de prueba
INSERT INTO usuario (id, clave, rol, activo) VALUES 
('vrojas', '$2b$10$hash_de_la_contraseña', 'API', 1);
```

#### 5.2 Generar Hash de Contraseña
```javascript
// Script para generar hash (ejecutar en Node.js)
const bcrypt = require('bcrypt');
const password = 'tu_contraseña';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

## 🚀 Ejecutar la Aplicación

### Desarrollo
```bash
# Ejecutar en modo desarrollo
npm run dev

# La aplicación estará disponible en:
# http://127.0.0.1:3000
```

### Producción
```bash
# Ejecutar en modo producción
npm start

# O con configuración específica
npm run prod
```

## ✅ Verificar Instalación

### 1. Verificar Servidor
```bash
# Debería mostrar:
# "Servidor SmartBee escuchando en http://127.0.0.1:3000"
npm start
```

### 2. Verificar Base de Datos
```bash
# En los logs debería aparecer:
# "Conectado a la Base de Datos"
```

### 3. Verificar Interfaz Web
1. Abrir navegador en `http://localhost:3000`
2. Debería aparecer la página de login
3. Probar login con usuario creado

## 🔧 Solución de Problemas

### Error: "Cannot connect to database"
```bash
# Verificar que MySQL esté ejecutándose
sudo systemctl status mysql    # Linux
brew services list | grep mysql # macOS

# Verificar credenciales en database.js
# Verificar que la base de datos existe
```

### Error: "Port 3000 already in use"
```bash
# Cambiar puerto en database.js
# O matar proceso que usa el puerto
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

### Error: "Module not found"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: "Permission denied"
```bash
# En Linux/macOS, dar permisos
chmod +x server.js

# O ejecutar con sudo si es necesario
sudo npm start
```

## 🔒 Configuración de Seguridad

### Para Producción
1. **Cambiar credenciales por defecto**
2. **Usar HTTPS** (configurar certificados SSL)
3. **Configurar firewall** (solo puertos necesarios)
4. **Actualizar dependencias** regularmente
5. **Configurar backups** de base de datos

### Variables de Producción
```javascript
// En database.js para producción
const production = true;
const debug = false;

// Configurar sesiones seguras
sessionConfig.cookie.secure = true;
app.set('trust proxy', 1);
```

## 📊 Monitoreo

### Logs de la Aplicación
```bash
# Los logs aparecen en la consola cuando debug=true
# Para producción, redirigir a archivo:
npm start > smartbee.log 2>&1
```

### Monitoreo de Base de Datos
```sql
-- Verificar conexiones activas
SHOW PROCESSLIST;

-- Verificar estado de tablas
SHOW TABLE STATUS FROM smartbee;
```

## 🔄 Actualización

```bash
# Hacer backup de la base de datos
mysqldump -u smartbee_user -p smartbee > backup_$(date +%Y%m%d).sql

# Actualizar código
git pull origin main

# Actualizar dependencias
npm update

# Reiniciar aplicación
npm start
```

## 📞 Soporte

Si encuentras problemas durante la instalación:

1. **Verificar prerrequisitos** - Todas las versiones correctas
2. **Revisar logs** - Buscar mensajes de error específicos
3. **Consultar documentación** - README.md y comentarios en código
4. **Contactar soporte** - Con detalles del error y configuración

---

**¡Instalación completada!** 🎉  
Ahora puedes acceder a SmartBee en http://localhost:3000