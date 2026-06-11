require('dotenv').config();
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const http = require('http')
const https = require('https');
const morgan = require('morgan');
const path = require('path');
const frontendPath = path.join(__dirname, '../frontend');
const ratelimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const cookieParser = require('cookie-parser');
const bcrypt = require("bcrypt");
const { Database } = require('@sqlitecloud/drivers');


const HTTPSPORT = process.env.HTTPS_PORT;
const HTTPPORT = process.env.HTTP_PORT;
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(frontendPath));
const db = new Database(process.env.CONNECTION_DB);
const saltRounds = parseInt(process.env.BCRYPT_ROUNDS);

//TODO: Base de datos funcional
async function connectDB() {
    await db.sql(`USE DATABASE ${process.env.DATABASE_NAME}`);

    await db.sql(`
    CREATE TABLE IF NOT EXISTS "Account" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dni VARCHAR(8) NOT NULL UNIQUE,
    cuil VARCHAR(11) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR (50) NOT NULL,
    lastName VARCHAR (50) NOT NULL,
    numberPhone VARCHAR(10),
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(20) DEFAULT 'user',
    birthDate TIMESTAMP NOT NULL DEFAULT "0000-00-00",
    createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);

    await db.sql(`
    CREATE TABLE IF NOT EXISTS "Turn" (
    id INTEGER PRIMARY KEY,
    turnName VARCHAR(30) NOT NULL UNIQUE,
    turnType VARCHAR(20) NOT NULL,
    description VARCHAR(150) NOT NULL
    );`);

    await db.sql(`
    CREATE TABLE IF NOT EXISTS "Certificate" (
    id INTEGER PRIMARY KEY,
    certificateName VARCHAR(30) NOT NULL UNIQUE,
    certificateType VARCHAR(20) NOT NULL,
    description VARCHAR(150) NOT NULL
    );`);

    await db.sql(`
    CREATE TABLE IF NOT EXISTS "Licence" (
    id INTEGER PRIMARY KEY,
    licenceName VARCHAR(30) NOT NULL UNIQUE,
    licenceType VARCHAR(25) NOT NULL,
    description VARCHAR(150) NOT NULL
    );`);

    await db.sql(`
    CREATE TABLE IF NOT EXISTS "Account_Turn" (
    id INTEGER PRIMARY KEY,
    accountId INT NOT NULL,
    turnId INT NOT NULL,
    createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (turnId) REFERENCES Turn(id) ON DELETE CASCADE
    );`);

    await db.sql(`
    CREATE TABLE IF NOT EXISTS "Account_Certificate" (
    id INTEGER PRIMARY KEY,
    accountId INT NOT NULL,
    certificateId INT NOT NULL,
    createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (certificateId) REFERENCES Certificate(id) ON DELETE CASCADE
    );`);

    await db.sql(`
    CREATE TABLE IF NOT EXISTS "Account_Licence" (
    id INTEGER PRIMARY KEY,
    accountId INT NOT NULL,
    licenceId INT NOT NULL,
    createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (licenceId) REFERENCES Licence(id) ON DELETE CASCADE
    );`);

    console.log("Base de Datos conectada!");
};
connectDB();


//* ----------------------------- N8N

async function sendN8nEvent(event, name, lastName, cuil, email) {
    try {
        await axios.post(
            "http://localhost:5678/webhook/login-alert",
            //"http://localhost:5678/webhook/login-alert-two",
            {
                event,
                name,
                lastName,
                cuil,
                email
            }
        );

    } catch (error) {

        console.error(
            "Error enviando alerta a n8n:",
            error.message
        );

    }
}


//* ----------------------------- Opciones de CORS
const corsConfiguration = {
    origin: `https://localhost:${HTTPSPORT}`,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};
app.use(cors(corsConfiguration));

//* ----------------------------- Creacion de servidores
const serverOptions = { //* Lectura de certificados (OpenSSL)
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
}

http.createServer(app).listen(HTTPPORT, () => {
    console.log(`Starting server HTTP on port ${HTTPPORT}`)
})

https.createServer(serverOptions, app).listen(HTTPSPORT, () => {
    console.log(`Starting server HTTPS on port ${HTTPSPORT}`)
})

//* ----------------------------- Redirecciones de HTTP a HTTPS
const redirectionToHTTPS = (req, res, next) => {

    if (!req.secure && req.headers.host == `localhost:${HTTPPORT}`) { //
        console.log("Redireccionamiento a HTTPS");
        return res.redirect(308, `https://localhost:${HTTPSPORT}${req.url}`);
    }
    next();
}
app.use(redirectionToHTTPS);

//* ----------------------------- Limitador de peticiones
const limiter = ratelimit({
    windowMs: parseInt(process.env.RATE_TIME), //15 mins
    max: parseInt(process.env.RATE_MAX), //maximo de peticiones por IP
    message: "Demasiadas peticiones, intente mas tarde!"
})
app.use(limiter);

//* ----------------------------- Escritura de Logs (Morgan)
const infoLog = fs.createWriteStream(
    path.join(__dirname, 'logsRegister.log'), { flags: 'a' }
)
app.use(morgan('combined', { stream: infoLog }))


//* ----------------------------- Validación de Inputs
const validateBody = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }
    next();
};

//* ----------------------------- Sanitización de Inputs
const sanitizeBody = (req, res, next) => {
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === "string") {
                const auxKey = req.body[key];
                req.body[key] = sanitizeHtml(req.body[key]);
                //console.log(`¡body sanitizado! = ${req.body[key]}`)
                if (auxKey != req.body[key])
                    return res.status(400).json({ message: `Los datos ingresados en el campo ${key} no son validos. Intentelo nuevamente!` })
            }
        }
    }
    next();
};

//* ----------------------------- Verificación de Token (proteccion de rutas)
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) return res.status(401).json({ message: "Token Requerido" });

    jwt.verify(token, process.env.SECRETKEY_JWT, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Token Invalido" });

        req.user = decoded;
        next();
    });
};

//* ----------------------------- Autorización de Roles (RBAC)
const authorizationRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Acceso no autorizado" })
        }
        next()
    }
}

//* ----------------------------- Limpieza de Cookie (logout - deleteAccount).
const clearCookie = (res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "Strict"
    });
}

//Escape (') - DB
const escape = (v) => String(v).replace(/'/g, "''");

//* ----------------------------- Reglas de datos (validateCharacters) - Valida los datos entrantes con reglas en cada key. Limpieza de caractéres especiales en Inputs.

const validateDni = (field = "dni") =>
    body(field)
        .notEmpty().withMessage(`El campo ${field} es obligatorio.`)
        .isString().withMessage(`El campo ${field} debe ser string.`)
        .matches(/^[0-9]{8}$/)
        .withMessage(`El campo ${field} debe tener exactamente 8 dígitos.`);

const validateCuil = (field = "cuil") =>
    body(field)
        .notEmpty().withMessage(`El campo ${field} es obligatorio.`)
        .isString().withMessage(`El campo ${field} debe ser string.`)
        .matches(/^[0-9]{11}$/)
        .withMessage(`El campo ${field} debe tener exactamente 11 dígitos.`);

const validatePassword = (field = "password") =>
    body(field)
        .notEmpty().withMessage(`El campo ${field} es obligatorio.`)
        .isString().withMessage(`El campo ${field} debe ser string.`)
        .isLength({ min: 6 })
        .withMessage(`El campo ${field} debe estar compuesto de 6 simbolos minimo.`)
        .not()
        .matches(/\s/)
        .withMessage(`El campo ${field} no debe contener espacios.`);

const validateName = (field = "name") =>
    body(field)
        .notEmpty().withMessage(`El campo ${field} es obligatorio.`)
        .matches(/^[a-zA-Z]+$/)
        .withMessage(`El campo ${field} solo debe contener caracteres.`);

const validateEmail = (field = "email") =>
    body(field)
        .notEmpty().withMessage(`El campo ${field} es obligatorio.`)
        .isEmail().withMessage(`El formato del campo ${field} es inválido.`);

const validatePhone = (field = "numberPhone") =>
    body(field)
        .notEmpty().withMessage(`El campo ${field} es obligatorio.`)
        .matches(/^[0-9]{10}$/)
        .withMessage(`El campo ${field} debe tener exactamente 10 dígitos.`);

const validateBirthDate = (field = "birthDate") =>
    body(field)
        .notEmpty().withMessage(`El campo ${field} es obligatorio.`)
        .isISO8601()
        .withMessage(`El campo ${field} debe tener formato YYYY-MM-DD.`);

const validateNotEmpty = (field) =>
    body(field)
        .notEmpty().withMessage(`El campo ${field} es obligatorio.`)


const certificateRules = [
    validateNotEmpty("certificateName"),
    validateNotEmpty("certificateType"),
    validateNotEmpty("description")
]

const licenceRules = [
    validateNotEmpty("licenceName"),
    validateNotEmpty("licenceType"),
    validateNotEmpty("description")
]

const turnRules = [
    validateNotEmpty("turnName"),
    validateNotEmpty("turnType"),
    validateNotEmpty("description")
]

const generateTurnRules = [
    validateNotEmpty("turnName"),
    validateNotEmpty("turnType")
]

const generateLicenceRules = [
    validateNotEmpty("licenceName"),
    validateNotEmpty("licenceType"),
    validateDni("accountDni")
]

const generateCertificateRules = [
    validateNotEmpty("certificateName"),
    validateNotEmpty("certificateType"),
    validateDni("accountDni")
]

const registerRules = [
    validateDni(),
    validateCuil(),
    validatePassword(),
    validateName(),
    validateName("lastName"),
    validatePhone(),
    validateEmail(),
    validateBirthDate(),
];

const loginRules = [
    validateCuil(),
    validatePassword(),
];

const newPasswordRules = [
    validatePassword("password"),
    validatePassword("newPassword"),
    validatePassword("checkPassword"),
];

/*----------------------------- 
        FUNCIONALIDADES
-----------------------------*/

//TODO: Funcionando en DB
//* ----------------------------- Registro
app.post("/register", registerRules, sanitizeBody, validateBody, async (req, res) => {

    if (req.cookies.token) return res.status(403).json({ message: "Te encuentras logueado!" });

    try {
        const { dni, cuil, password, name, lastName, numberPhone, email, birthDate } = req.body;

        let result = await db.sql(`
        SELECT
        dni,
        cuil,
        email
        FROM Account
        `
        );
        const accountsData = result.rows || result;

        const thisDniExist = accountsData.find((u) => u.dni === String(dni));
        const thisEmailExist = accountsData.find((u) => u.email === email);
        const thisCuilExist = accountsData.find(u => u.cuil === String(cuil));

        if (thisDniExist || thisEmailExist || thisCuilExist) {
            return res.status(400).json({ message: 'El usuario ya existe!' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.sql(`
            INSERT INTO Account (
            dni, cuil, password, name, lastName, numberPhone, email, birthDate, role
            )
            VALUES (
            '${escape(dni)}',
            '${escape(cuil)}',
            '${escape(hashedPassword)}',
            '${escape(name)}',
            '${escape(lastName)}',
            '${escape(numberPhone)}',
            '${escape(email)}',
            '${escape(birthDate)}',
            'user'
            )`);

        return res.status(201).json({ message: `Usuario registrado exitosamente!` });

    } catch (error) {
        return res.status(400).json({ message: `Error en el Registro, Revise los datos e intentelo de nuevo! ${error.message}` })
    }
});

//TODO: Funcionando en DB
//* ----------------------------- Login de usuario
app.post("/login", loginRules, sanitizeBody, validateBody, async (req, res) => {

    if (req.cookies.token) return res.status(403).json({ message: "Te encuentras logueado!" });

    const { cuil, password } = req.body;

    const result = await db.sql(`
        SELECT 
        id,
        dni,
        name,
        lastName,
        cuil,
        email,
        password,
        role
        FROM Account
        WHERE
        cuil = ${escape(cuil)}
        `
    );

    const accountData = result.rows || result;
    //if (!accountData[0]) return res.status(401).json({ message: "Credenciales Incorrectas" });
    if (!accountData[0]) {
        //await sendN8nEvent("login_user_not_found", cuil);
        return res.status(401).json({ message: "Credenciales Incorrectas" });
    }

    const isMatch = await bcrypt.compare(password, accountData?.[0]?.password);
    //if (!isMatch) return res.status(401).json({ message: "Credenciales Incorrectas" });
    if (!isMatch) {
        await sendN8nEvent("login_failed", accountData?.[0]?.name, accountData?.[0]?.lastName, cuil, accountData?.[0]?.email);
        return res.status(401).json({ message: "Credenciales Incorrectas" });
    }

    //*Implementacion del JWT
    const token = jwt.sign(
        { id: accountData?.[0]?.id, dni: accountData?.[0]?.dni, role: accountData?.[0]?.role },
        process.env.SECRETKEY_JWT,
        { expiresIn: process.env.JWT_EXPIRES_IN } //*Expiracion del token
    );

    res.cookie("token", token, {
        httpOnly: true,  //*anti-JS/XSS
        secure: true, //*HTTPS only
        sameSite: "Strict", //*protección contra CSRF
        maxAge: 60 * 60 * 1000 //*Vencimiento de la cookie (duración de sesión = 1h)
    });

    await sendN8nEvent("login_success", accountData?.[0]?.name, accountData?.[0]?.lastName, cuil, accountData?.[0]?.email);

    return res.status(200).json({
        message: "Sesion Iniciada Exitosamente",
        role: accountData[0].role

    });
});

//TODO: Funcionando en DB
//* ----------------------------- Logout de usuario 
app.post("/logout", verifyToken, validateBody, (req, res) => {

    clearCookie(res);

    return res.status(200).json({ message: "Sesion Cerrada Exitosamente" });
});

//TODO: Funcionando en DB
//* ----------------------------- Mostrar datos de usuario
app.get("/userData", verifyToken, authorizationRole(["user"]), async (req, res) => {
    const dni = req.user.dni;

    const result = await db.sql(`
        SELECT
        id, 
        dni,
        cuil, 
        name, 
        lastName,
        birthDate, 
        email, 
        numberPhone
        FROM Account
        WHERE
        dni = ${escape(dni)}
    `)

    if (!result || result.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    return res.status(201).json({ result });
})

//TODO: Funcionando en DB
//* ----------------------------- Mostrar lista de usuarios
app.get("/accountsList", verifyToken, authorizationRole(["ops"]), async (req, res) => {

    const result = await db.sql(`
        SELECT 
        id, 
        dni,
        cuil,
        name, 
        lastName,
        birthDate,
        email, 
        role
        FROM Account
    `)

    return res.status(200).json({ result });
})

//TODO: Funcionando en DB
//* ----------------------------- Eliminar cuenta de usuario
app.delete("/deleteAccount", verifyToken, authorizationRole(["user"]), async (req, res) => {
    try {
        const userId = req.user.id;
        await db.sql(`DELETE FROM Account WHERE id = ${escape(userId)}`);

        clearCookie(res);

        return res.status(201).json({ message: `Usuario Eliminado exitosamente! Delete ID: ${userId}` });

    } catch (error) {
        return res.status(400).json({ message: `Error al eliminar cuenta: ${error.message}` })
    }
})

//TODO: Funcionando en DB
//* ----------------------------- Actualizacion de Nombre
app.put("/updateName", verifyToken, authorizationRole(["user"]), validateName("newName"), sanitizeBody, validateBody, async (req, res) => {

    const keys = Object.keys(req.body);
    if (!keys.includes("newName") || keys.length !== 1) return res.status(400).json({ message: "Error en los datos, ingresar solo la variable 'newName'" });

    const userId = req.user.id;
    const { newName } = req.body;

    const result = await db.sql(`UPDATE Account 
        SET name = '${escape(newName)}'
        WHERE id = ${escape(userId)}`
    );

    if (result.changes === 0) return res.status(404).json({ message: "Error, cuenta no encontrada en lista" });

    return res.status(200).json({ message: `Tu nombre fue actualizado` });
})

//TODO: Funcionando en DB
//* Actualiza correctamente y bloquea inyections, variables extra y datos incorrectos.
app.put("/updateNumberPhone", verifyToken, authorizationRole(["user"]), validatePhone("newNumberPhone"), sanitizeBody, validateBody, async (req, res) => {

    const keys = Object.keys(req.body);
    if (!keys.includes("newNumberPhone") || keys.length !== 1) return res.status(400).json({ message: "Error en los datos, ingresar solo la variable 'newNumberPhone'" });

    const userId = req.user.id;
    const { newNumberPhone } = req.body;

    const result = await db.sql(`UPDATE Account 
        SET numberPhone = '${escape(newNumberPhone)}'
        WHERE id = ${escape(userId)}`
    );

    if (result.changes === 0) return res.status(404).json({ message: "Error: Cuenta no encontrada en lista" });

    return res.status(200).json({ message: `Tu numero de telefono fue actualizado` });
})

//TODO: Funcionando en DB
//* Actualiza correctamente y bloquea inyections, variables extra y datos incorrectos.
app.put("/updateLastName", verifyToken, authorizationRole(["user"]), validateName("newLastName"), sanitizeBody, validateBody, async (req, res) => {
    const keys = Object.keys(req.body);
    if (!keys.includes("newLastName") || keys.length !== 1) return res.status(400).json({ message: "Error en los datos, ingresar solo la variable 'newLastName'" });

    const userId = req.user.id;
    const { newLastName } = req.body;

    await db.sql(`UPDATE Account 
        SET lastName = '${escape(newLastName)}'
        WHERE id = ${escape(userId)}`
    );

    return res.status(200).json({ message: `Tu apellido fue actualizado` });
})

//TODO: Funcionando en DB
//* Actualiza correctamente y bloquea inyections, variables extra y datos incorrectos.
app.put("/updateEmail", verifyToken, authorizationRole(["user"]), validateEmail("newEmail"), sanitizeBody, validatePassword("verifyPassword"), validateBody, async (req, res) => {
    const keys = Object.keys(req.body);
    if (!keys.includes("newEmail") || !keys.includes("verifyPassword") || keys.length !== 2) return res.status(400).json({ message: "Error en los datos, ingresar solo las variables 'newEmail' & 'password'" });

    const userId = req.user.id;
    const { newEmail, verifyPassword } = req.body;

    const accountResults = await db.sql(`
        SELECT
        id,
        cuil,
        name,
        lastName,
        email,
        dni,
        password,
        role
        FROM Account
        WHERE id = '${escape(userId)}'`
    );

    const userData = accountResults.rows || accountResults;
    if (!userData[0]) return res.status(401).json({ message: "Error: no se encontro la cuenta" });

    const isMatch = await bcrypt.compare(verifyPassword, userData?.[0]?.password);
    if (!isMatch) return res.status(401).json({ message: "Error: la contraseña es incorrecta" })

    await db.sql(`
        UPDATE Account 
        SET email = '${escape(newEmail)}'
        WHERE id = ${escape(userId)}`
    );

    await sendN8nEvent("email_update", userData?.[0]?.name, userData?.[0]?.lastName, userData?.[0]?.cuil, newEmail);

    return res.status(200).json({ message: `Tu email fue actualizado` });
})

//TODO: Funcionando en DB
//* Actualiza correctamente y bloquea inyections, variables extra y datos incorrectos.
app.put("/updatePassword", verifyToken, authorizationRole(["user"]), newPasswordRules, sanitizeBody, validateBody, async (req, res) => {

    const keys = Object.keys(req.body);
    if (!keys.includes("password") || !keys.includes("newPassword") || !keys.includes("checkPassword") || keys.length !== 3) return res.status(400).json({ message: "Error en los datos, ingresar solo las variables 'newPassword' & 'checkPassword" });

    const userId = req.user.id;
    const { password, newPassword, checkPassword } = req.body;

    if (newPassword != checkPassword) return res.status(400).json({ message: "Error: las contraseñas no coinciden, intentelo de nuevo" });

    const accountResults = await db.sql(`
        SELECT
        id,
        dni,
        cuil,
        name,
        lastName,
        email,
        password,
        role
        FROM Account
        WHERE id = '${escape(userId)}'`
    );

    const userData = accountResults.rows || accountResults;
    if (!userData[0]) return res.status(401).json({ message: "Error: no se encontro la cuenta" });

    const isMatch = await bcrypt.compare(password, userData?.[0]?.password);
    if (!isMatch) return res.status(401).json({ message: "Error: la contraseña es incorrecta" })


    const hashNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.sql(`UPDATE Account 
        SET password = '${escape(hashNewPassword)}'
        WHERE id = ${escape(userId)}`
    );

    await sendN8nEvent("password_update", userData?.[0]?.name, userData?.[0]?.lastName, userData?.[0]?.cuil, userData?.[0]?.email);

    return res.status(200).json({ message: `Tu contraseña fue actualizada` });
})

//TODO: Funcionando en DB
//* Ok, Funciona correctamente
app.get("/showCertificate", verifyToken, authorizationRole(["user"]), async (req, res) => {
    const dni = req.user.dni;

    const result = await db.sql(`
        SELECT
        ac.dni,
        ac.cuil,
        ac.name,
        ac.lastName,
        ac.birthDate,
        ac.numberPhone,
        ac.email,
        cr.certificateName,
        cr.certificateType
        FROM Account_Certificate acr
        INNER JOIN Account ac ON ac.id = acr.accountId
        INNER JOIN Certificate cr ON cr.id = acr.certificateId
        WHERE
        ac.dni = ${escape(dni)}
    `)

    if (!result || result.length === 0) {
        return res.status(404).json({ message: 'No hay certificados al nombre del usuario' });
    }
    return res.status(201).json({ result });
})

//TODO: Funcionando en DB
//* Ok, Funciona correctamente
app.get("/showLicence", verifyToken, authorizationRole(["user"]), async (req, res) => {
    const dni = req.user.dni;

    const result = await db.sql(`
        SELECT
        ac.dni,
        ac.cuil,
        ac.name,
        ac.lastName,
        ac.birthDate,
        ac.numberPhone,
        ac.email,
        lc.licenceName,
        lc.licenceType
        FROM Account_Licence alc
        INNER JOIN Account ac ON ac.id = alc.accountId
        INNER JOIN Licence lc ON lc.id = alc.licenceId
        WHERE
        ac.dni = ${escape(dni)}
    `)

    if (!result || result.length === 0) {
        return res.status(404).json({ message: 'No hay Licencias al nombre del usuario' });
    }
    return res.status(201).json({ result });
})

//TODO: Funcionando en DB
//* Ok, Funciona correctamente
app.get("/showTurn", verifyToken, authorizationRole(["user"]), async (req, res) => {
    const dni = req.user.dni;

    const result = await db.sql(`
        SELECT
        ac.dni,
        ac.cuil,
        ac.name,
        ac.lastName,
        ac.birthDate,
        ac.numberPhone,
        ac.email,
        tn.turnName,
        tn.turnType,
        tn.description
        FROM Account_Turn atn
        INNER JOIN Account ac ON ac.id = atn.accountId
        INNER JOIN Turn tn ON tn.id = atn.turnId
        WHERE
        ac.dni = ${escape(dni)}
    `)

    if (!result || result.length === 0) {
        return res.status(404).json({ message: 'No hay turnos registrados para el usuario' });
    }
    return res.status(201).json({ result });
})

//TODO: Funcionando en DB
//* Es Correcto
app.post("/createCertificate", verifyToken, authorizationRole(["ops"]), certificateRules, sanitizeBody, validateBody, async (req, res) => {
    try {
        const { certificateName, certificateType, description } = req.body;

        let result = await db.sql(`
        SELECT
        certificateName,
        certificateType
        FROM Certificate
        `
        );
        const certificateData = result.rows || result;

        const thisCertificateNameExist = certificateData.find((u) => u.certificateName === String(certificateName));
        const thisCertificateTypeExist = certificateData.find(u => u.certificateType === String(certificateType));

        if (thisCertificateNameExist && thisCertificateTypeExist) return res.status(400).json({ message: 'El tipo de certificado ya existe' });

        await db.sql(`
            INSERT INTO Certificate (
            certificateName, certificateType, description
            )
            VALUES (
            '${escape(certificateName)}',
            '${escape(certificateType)}',
            '${escape(description)}'
            )`);

        return res.status(201).json({ message: `Certificado creado exitosamente!` });

    } catch (error) {
        return res.status(400).json({ message: `Error: Revise los datos e intentelo de nuevo! ${error.message}` })
    }
})

//TODO: Funcionando en DB
//* Es Correcto
app.post("/createLicence", verifyToken, authorizationRole(["ops"]), licenceRules, sanitizeBody, validateBody, async (req, res) => {
    try {
        const { licenceName, licenceType, description } = req.body;

        let result = await db.sql(`
        SELECT
        licenceName,
        licenceType
        FROM Licence
        `
        );
        const licenceData = result.rows || result;

        const thisLicenceNameExist = licenceData.find((u) => u.licenceName === String(licenceName));
        const thisLicenceTypeExist = licenceData.find(u => u.licenceType === String(licenceType));

        if (thisLicenceNameExist && thisLicenceTypeExist) return res.status(400).json({ message: 'El tipo de licencia ya existe' });

        await db.sql(`
            INSERT INTO Licence (
            licenceName, licenceType, description
            )
            VALUES (
            '${escape(licenceName)}',
            '${escape(licenceType)}',
            '${escape(description)}'
            )`);

        return res.status(201).json({ message: `Licencia creada exitosamente!` });

    } catch (error) {
        return res.status(400).json({ message: `Error: Revise los datos e intentelo de nuevo! ${error.message}` })
    }
})

//TODO: Funcionando en DB
//* Es Correcto
app.post("/createTurn", verifyToken, authorizationRole(["ops"]), turnRules, sanitizeBody, validateBody, async (req, res) => {
    try {
        const { turnName, turnType, description } = req.body;

        let result = await db.sql(`
        SELECT
        turnName,
        turnType
        FROM Turn
        `
        );
        const turnData = result.rows || result;

        const thisTurnNameExist = turnData.find((u) => u.turnName === String(turnName));
        const thisTurnTypeExist = turnData.find(u => u.turnType === String(turnType));

        if (thisTurnNameExist && thisTurnTypeExist) return res.status(400).json({ message: 'El tipo de turno ya existe' });

        await db.sql(`
            INSERT INTO Turn (
            turnName, turnType, description
            )
            VALUES (
            '${escape(turnName)}',
            '${escape(turnType)}',
            '${escape(description)}'
            )`);

        return res.status(201).json({ message: `Turno creado exitosamente!` });

    } catch (error) {
        return res.status(400).json({ message: `Error: Revise los datos e intentelo de nuevo! ${error.message}` })
    }
})

//TODO: Funcionando en DB
//*Funciona correctamente, verificar inyect!
app.post("/generateCertificate", verifyToken, authorizationRole(["ops"]), generateCertificateRules, sanitizeBody, validateBody, async (req, res) => {
    try {
        const { accountDni, certificateName, certificateType } = req.body;

        const certificateResult = await db.sql(`
            SELECT
            cr.*
            FROM Certificate cr
            WHERE
            cr.certificateName = '${escape(certificateName)}'
            AND cr.certificateType = '${escape(certificateType)}'
        `);

        const certificateData = certificateResult.rows || certificateResult;

        if (!certificateData[0]) return res.status(404).json({ message: "Error: El certificado seleccionado no existe, revise los datos ingresados y vuelva a intentarlo" })

        const accountResult = await db.sql(`
            SELECT
            ac.*
            FROM Account ac
            WHERE
            ac.dni = '${escape(accountDni)}'
        `);

        const accountData = accountResult.rows || accountResult;

        if (!accountData[0]) return res.status(404).json({ message: "Error: La cuenta seleccionada no existe, revise los datos ingresados y vuelva a intentarlo" })

        const certificateId = certificateData[0]?.id;
        const accountId = accountData[0]?.id


        let verifyResult = await db.sql(`
        SELECT
        *
        FROM Account_Certificate
        WHERE
        accountId = '${escape(accountId)}'
        AND certificateId = '${escape(certificateId)}'
        `
        );
        const assignData = verifyResult.rows || verifyResult;

        if (assignData[0]) return res.status(400).json({ message: 'El certificado ya se encuentra asignado al usuario especificado.' });


        await db.sql(`
            INSERT INTO Account_Certificate (
            accountId, certificateId
            )
            VALUES (
            '${escape(accountId)}',
            '${escape(certificateId)}'
            )`);

        return res.status(201).json({ message: `Certificado generado exitosamente para el usuario ${accountId}` });

    } catch (error) {
        return res.status(400).json({ message: `Error: Revise los datos e intentelo de nuevo! ${error.message}` })
    }
})

//TODO: Funcionando en DB
//*Funciona correctamente, verificar inyect!
app.post("/generateLicence", verifyToken, authorizationRole(["ops"]), generateLicenceRules, sanitizeBody, validateBody, async (req, res) => {
    try {
        const { accountDni, licenceName, licenceType } = req.body;

        const licenceResult = await db.sql(`
            SELECT
            lc.*
            FROM Licence lc
            WHERE
            lc.licenceName = '${escape(licenceName)}'
            AND lc.licenceType = '${escape(licenceType)}'
        `);

        const licenceData = licenceResult.rows || licenceResult;

        if (!licenceData[0]) return res.status(404).json({ message: "Error: La licencia seleccionada no existe, revise los datos ingresados y vuelva a intentarlo" })

        const accountResult = await db.sql(`
            SELECT
            ac.*
            FROM Account ac
            WHERE
            ac.dni = '${escape(accountDni)}'
        `);

        const accountData = accountResult.rows || accountResult;

        if (!accountData[0]) return res.status(404).json({ message: "Error: La cuenta seleccionada no existe, revise los datos ingresados y vuelva a intentarlo" })

        const licenceId = licenceData[0]?.id;
        const accountId = accountData[0]?.id


        let verifyResult = await db.sql(`
        SELECT
        *
        FROM Account_Licence
        WHERE
        accountId = '${escape(accountId)}'
        AND licenceId = '${escape(licenceId)}'
        `
        );
        const assignData = verifyResult.rows || verifyResult;

        if (assignData[0]) return res.status(400).json({ message: 'La licencia ya se encuentra asignado al usuario especificado.' });


        await db.sql(`
            INSERT INTO Account_Licence (
            accountId, licenceId
            )
            VALUES (
            '${escape(accountId)}',
            '${escape(licenceId)}'
            )`);

        return res.status(201).json({ message: `Licencia generada exitosamente para el usuario ${accountId}` });

    } catch (error) {
        return res.status(400).json({ message: `Error: Revise los datos e intentelo de nuevo! ${error.message}` })
    }
})

//TODO: Funcionando en DB
//*Funciona correctamente, verificar inyect!
app.post("/generateTurn", verifyToken, authorizationRole(["user"]), generateTurnRules, sanitizeBody, validateBody, async (req, res) => {
    try {
        const accountId = req.user.id;
        const { turnName, turnType } = req.body;

        const turnResult = await db.sql(`
            SELECT
            tn.*
            FROM Turn tn
            WHERE
            tn.turnName = '${escape(turnName)}'
            AND tn.turnType = '${escape(turnType)}'
        `);

        const turnData = turnResult.rows || turnResult;
        if (!turnData[0]) return res.status(404).json({ message: "Error: El turno seleccionado no existe, revise los datos ingresados y vuelva a intentarlo!" })

        const turnId = turnData[0]?.id;


        let verifyResult = await db.sql(`
        SELECT
        *
        FROM Account_Turn
        WHERE
        accountId = '${escape(accountId)}'
        AND turnId = '${escape(turnId)}'
        `
        );
        const assignData = verifyResult.rows || verifyResult;

        if (assignData[0]) return res.status(400).json({ message: 'El turno ya se encuentra asignado al usuario especificado.' });


        await db.sql(`
            INSERT INTO Account_Turn (
            accountId, turnId
            )
            VALUES (
            '${escape(accountId)}',
            '${escape(turnId)}'
            )`);

        return res.status(201).json({ message: `Turno generado exitosamente` });
    } catch (error) {
        return res.status(400).json({ message: `Error: Revise los datos e intentelo de nuevo! ${error.message}` })
    }
})

app.get("/availableTurns", verifyToken, authorizationRole(["user", "ops"]), async (req, res) => {

    const result = await db.sql(`
        SELECT
        id,
        turnName,
        turnType,
        description
        FROM Turn
        ORDER BY turnName
    `);

    return res.status(200).json({ result });
});

app.get(
    "/availableCertificates", verifyToken, authorizationRole(["ops"]), async (req, res) => {

        const result = await db.sql(`
            SELECT
            id,
            certificateName,
            certificateType,
            description
            FROM Certificate
            ORDER BY certificateName
        `);

        return res.status(200).json({ result });
    }
);

app.get("/availableLicences", verifyToken, authorizationRole(["ops"]), async (req, res) => {

    const result = await db.sql(`
            SELECT
            id,
            licenceName,
            licenceType,
            description
            FROM Licence
            ORDER BY licenceName
        `);

    return res.status(200).json({ result });
}
);

app.post("/recoveryPassword", validateCuil(), sanitizeBody, validateBody, async (req, res) => {

    try {
        const { cuil } = req.body;

        const result = await db.sql(`
                SELECT
                name,
                lastName,
                cuil,
                email
                FROM Account
                WHERE cuil = '${escape(cuil)}'
            `);

        const accountData = result.rows || result;

        if (accountData[0]) {
            await sendN8nEvent("recovery_password", accountData[0].name, accountData[0].lastName, accountData[0].cuil, accountData[0].email);
        }

        return res.status(200).json({
            message: "Enviamos un mail de recuperación a su correo electrónico."
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }
}
);