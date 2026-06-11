# MiPersona

## Descripción

MiPersona es una aplicación web desarrollada para centralizar y gestionar la información personal de los ciudadanos mediante un perfil digital.

El proyecto integra la plataforma de automatización **n8n**, permitiendo conectar procesos y servicios externos mediante flujos automatizados, facilitando la comunicación entre la aplicación y otros sistemas sin necesidad de desarrollar integraciones complejas.

La aplicación permite a los usuarios almacenar información personal, consultar documentación asociada, gestionar turnos y recibir notificaciones automáticas por correo electrónico sobre eventos importantes de su cuenta.

---

# Ejecución Local

## Requisitos Previos

- Node.js
- npm
- n8n
- SQLite Cloud
- Certificados SSL configurados para HTTPS

## Pasos para ejecutar el proyecto

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd mi-persona-digital
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env` con los valores correspondientes para:

```env
HTTP_PORT=
HTTPS_PORT=
SECRETKEY_JWT=
JWT_EXPIRES_IN=
CONNECTION_DB=
DATABASE_NAME=
BCRYPT_ROUNDS=
SSL_KEY_PATH=
SSL_CERT_PATH=
RATE_TIME=
RATE_MAX=
```

### 4. Iniciar el workflow de n8n

Importar y ejecutar el workflow:

```text
backend/miPersona.json
```

en la instancia local de n8n.

### 5. Iniciar el backend

```bash
node miPersona.js
```

### 6. Acceder a la aplicación

Abrir en el navegador:

```text
https://localhost:3050/index.html
```

---

### 7. Cuentas de Usuario - Administrador
- Usuario | Cuil: 10202030235 | Contraseña: rominaa
- Administrador | Cuil: 22115559994 | Contraseña: ricardops

# Arquitectura

La solución está compuesta por tres capas principales:

- Frontend (HTML, CSS y JavaScript)
- Backend (Node.js + Express)
- Base de Datos (SQLite Cloud)
- Automatizaciones (n8n)

```text
Frontend
    │
    ▼
Backend Express
    │
    ├── SQLite Cloud
    │
    └── n8n
            │
            └── Notificaciones por Email
```

---

# Funcionalidades del Usuario

El sistema permite:

- Iniciar sesión mediante CUIL y contraseña.
- Registrarse con:
  - Nombre
  - Apellido
  - DNI
  - CUIL
  - Fecha de Nacimiento
  - Teléfono
  - Email
  - Contraseña
- Actualizar sus datos personales.
- Eliminar su cuenta.
- Visualizar la información almacenada.
- Recuperar su contraseña.
- Consultar turnos asignados.
- Consultar certificados asignados.
- Consultar licencias asignadas.
- Recibir notificaciones por correo electrónico sobre:
  - Inicio de sesión exitoso.
  - Inicio de sesión fallido.
  - Recuperación de contraseña.
  - Actualización de información personal.

---

# Funcionalidades del Administrador

El sistema permite:

- Identificar usuarios con rol Administrador durante el inicio de sesión.
- Consultar usuarios registrados.
- Visualizar:
  - DNI
  - Nombre
  - Apellido
  - Email
  - Rol
- Crear y gestionar turnos.
- Asignar turnos a usuarios.
- Crear certificados.
- Asignar certificados a usuarios.
- Crear licencias.
- Asignar licencias a usuarios.

---

# Integración con n8n

La plataforma n8n fue utilizada para automatizar procesos y notificaciones.

Entre las automatizaciones implementadas se encuentran:

- Notificación de inicio de sesión exitoso.
- Notificación de inicio de sesión fallido.
- Recuperación de contraseña.
- Envío de alertas relacionadas con la gestión de la cuenta.

Estas automatizaciones son consumidas desde el backend mediante webhooks HTTP.

---

# Seguridad Implementada

El sistema incorpora:

- Autenticación mediante JWT.
- Cookies HTTPOnly.
- Protección HTTPS.
- Protección CSRF mediante SameSite.
- Hash de contraseñas con BCrypt.
- Sanitización de entradas mediante sanitize-html.
- Validación de datos mediante express-validator.
- Rate Limiting contra ataques de fuerza bruta.
- Control de acceso basado en roles (RBAC).

---

# Tecnologías Utilizadas

## Frontend

- HTML5
- CSS3
- JavaScript

## Backend

- Node.js
- Express.js

## Base de Datos

- SQLite Cloud

## Automatización

- n8n

## Seguridad

- JWT
- BCrypt
- express-validator
- sanitize-html
- express-rate-limit

---

# Autores
- Caruccio Lautaro
- Márquez Cecilia
- Condori Jonathan
- Kalafa Santiago

Proyecto académico desarrollado para investigar e integrar la herramienta n8n dentro de una aplicación de gestión de identidad digital ciudadana.
