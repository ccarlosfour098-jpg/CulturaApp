
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const db = require("./config/db");
const { GoogleGenAI } = require("@google/genai");
const multer = require("multer");
const path = require("path");
const fs = require("fs");



const app = express();
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

app.use(express.static(__dirname));

// Configuración para guardar imágenes de eventos
const carpetaImagenes = path.join(
    __dirname,
    "uploads",
    "eventos"
);

fs.mkdirSync(carpetaImagenes, { recursive: true });

const almacenamientoImagenes = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, carpetaImagenes);
    },

    filename: (req, file, callback) => {
        const extensiones = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp"
        };

        const extension = extensiones[file.mimetype];

        if (!extension) {
            return callback(
                new Error("Solo se permiten imágenes JPG, PNG o WebP.")
            );
        }

        callback(null, `${require("crypto").randomUUID()}${extension}`);
    }
});

const subirImagenEvento = multer({
    storage: almacenamientoImagenes,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!tiposPermitidos.includes(file.mimetype)) {
            return callback(
                new Error("Solo se permiten imágenes JPG, PNG o WebP.")
            );
        }

        callback(null, true);
    }
});

// Estado del servidor
app.get("/api/estado", (req, res) => {
    res.json({
        proyecto: "CulturaApp",
        estado: "funcionando"
    });
});

// Estado de MySQL
app.get("/api/estado-bd", async (req, res) => {
    try {
        const [resultado] = await db.query(
            "SELECT DATABASE() AS base_datos, 1 AS conexion"
        );

        res.json({
            estado: "conectado",
            ...resultado[0]
        });
    } catch (error) {
        console.error("Error MySQL:", error.code);

        res.status(500).json({
            estado: "error",
            mensaje: "No fue posible conectar con la base de datos."
        });
    }
});

// Inicio de sesión
app.post("/api/auth/login", async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

        if (
            typeof correo !== "string" ||
            typeof contrasena !== "string" ||
            !correo.trim() ||
            !contrasena
        ) {
            return res.status(400).json({
                mensaje: "Ingresa tu correo y contraseña."
            });
        }

        const [usuarios] = await db.execute(
            `SELECT u.id_usuario, u.nombre_usuario,
                    u.apellido_usuario, u.correo_electronico,
                    u.contrasena, u.estado, r.nombre_rol
             FROM usuarios u
             INNER JOIN roles r ON u.id_rol = r.id_rol
             WHERE u.correo_electronico = ?
             LIMIT 1`,
            [correo.trim().toLowerCase()]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos."
            });
        }

        const usuario = usuarios[0];

        if (usuario.estado !== "Activo") {
            return res.status(403).json({
                mensaje: "La cuenta no está activa."
            });
        }

        const coincide = await bcrypt.compare(
            contrasena,
            usuario.contrasena
        );

        if (!coincide) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos."
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({
                    mensaje: "No fue posible iniciar la sesión."
                });
            }

            req.session.usuario = {
                id: usuario.id_usuario,
                nombre: usuario.nombre_usuario,
                apellido: usuario.apellido_usuario,
                correo: usuario.correo_electronico,
                rol: usuario.nombre_rol
            };

            req.session.save((errorGuardar) => {
                if (errorGuardar) {
                    return res.status(500).json({
                        mensaje: "No fue posible guardar la sesión."
                    });
                }

                res.json({
                    mensaje: "Inicio de sesión exitoso.",
                    usuario: req.session.usuario
                });
            });
        });
    } catch (error) {
        console.error("Error en login:", error.code || error.message);

        res.status(500).json({
            mensaje: "Ocurrió un error al procesar el inicio de sesión."
        });
    }
});


/* =========================================
   PERFIL DEL USUARIO
========================================= */

// Consultar los datos del perfil
app.get("/api/perfil", async (req, res) => {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión."
        });
    }

    try {
        const [usuarios] = await db.execute(
            `SELECT
                id_usuario,
                nombre_usuario,
                apellido_usuario,
                correo_electronico,
                telefono,
                estado,
                fecha_registro
             FROM usuarios
             WHERE id_usuario = ?`,
            [usuario.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró la cuenta."
            });
        }

        return res.json({
            usuario: {
                ...usuarios[0],
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error("Error al consultar el perfil:", error);

        return res.status(500).json({
            mensaje: "No fue posible cargar el perfil."
        });
    }
});


// Actualizar los datos personales
app.put("/api/perfil", async (req, res) => {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión."
        });
    }

    const nombre = String(req.body.nombre || "").trim();
    const apellido = String(req.body.apellido || "").trim();
    const correo = String(req.body.correo || "").trim().toLowerCase();
    const telefono = String(req.body.telefono || "").trim();

    if (!nombre || !apellido || !correo) {
        return res.status(400).json({
            mensaje: "Nombre, apellido y correo son obligatorios."
        });
    }

    if (nombre.length > 80 || apellido.length > 80 ||
        correo.length > 150 || telefono.length > 20) {
        return res.status(400).json({
            mensaje: "Uno o más campos superan la longitud permitida."
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return res.status(400).json({
            mensaje: "El correo electrónico no es válido."
        });
    }

    try {
        const [resultado] = await db.execute(
            `UPDATE usuarios
             SET nombre_usuario = ?,
                 apellido_usuario = ?,
                 correo_electronico = ?,
                 telefono = ?
             WHERE id_usuario = ?`,
            [
                nombre,
                apellido,
                correo,
                telefono || null,
                usuario.id
            ]
        );

        if (resultado.affectedRows === 0) {
            const [existentes] = await db.execute(
                `SELECT id_usuario
                 FROM usuarios
                 WHERE id_usuario = ?`,
                [usuario.id]
            );

            if (existentes.length === 0) {
                return res.status(404).json({
                    mensaje: "No se encontró la cuenta."
                });
            }
        }

        // Mantener actualizados los datos de la sesión.
        req.session.usuario.nombre = nombre;
        req.session.usuario.apellido = apellido;
        req.session.usuario.correo = correo;

        return res.json({
            mensaje: "Perfil actualizado correctamente.",
            usuario: {
                id: usuario.id,
                nombre,
                apellido,
                correo,
                rol: usuario.rol,
                telefono: telefono || null
            }
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "Ese correo ya está registrado en otra cuenta."
            });
        }

        console.error("Error al actualizar el perfil:", error);

        return res.status(500).json({
            mensaje: "No fue posible actualizar el perfil."
        });
    }
});


 // Cambiar la contraseña del usuario autenticado
app.put("/api/perfil/cambiar-contrasena", async (req, res) => {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión."
        });
    }

    const { contrasenaActual, nuevaContrasena, confirmarContrasena } = req.body;

    if (
        typeof contrasenaActual !== "string" ||
        typeof nuevaContrasena !== "string" ||
        typeof confirmarContrasena !== "string" ||
        !contrasenaActual ||
        !nuevaContrasena ||
        !confirmarContrasena
    ) {
        return res.status(400).json({
            mensaje: "Completa todos los campos de contraseña."
        });
    }

    if (
        nuevaContrasena.length < 8 ||
        Buffer.byteLength(nuevaContrasena, "utf8") > 72
    ) {
        return res.status(400).json({
            mensaje: "La nueva contraseña debe tener al menos 8 caracteres y respetar el límite permitido."
        });
    }

    if (nuevaContrasena !== confirmarContrasena) {
        return res.status(400).json({
            mensaje: "La nueva contraseña y su confirmación no coinciden."
        });
    }

    if (nuevaContrasena === contrasenaActual) {
        return res.status(400).json({
            mensaje: "La nueva contraseña debe ser diferente de la actual."
        });
    }

    try {
        const [usuarios] = await db.execute(
            `SELECT contrasena
             FROM usuarios
             WHERE id_usuario = ?
             LIMIT 1`,
            [usuario.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró la cuenta."
            });
        }

        const coincide = await bcrypt.compare(
            contrasenaActual,
            usuarios[0].contrasena
        );

        if (!coincide) {
            return res.status(400).json({
                mensaje: "La contraseña actual es incorrecta."
            });
        }

        const hash = await bcrypt.hash(nuevaContrasena, 12);

        await db.execute(
            `UPDATE usuarios
             SET contrasena = ?
             WHERE id_usuario = ?`,
            [hash, usuario.id]
        );

        return res.json({
            mensaje: "La contraseña se cambió correctamente."
        });

    } catch (error) {
        console.error(
            "Error al cambiar la contraseña:",
            error.code || error.message
        );

        return res.status(500).json({
            mensaje: "No fue posible cambiar la contraseña."
        });
    }
});


// Consultar la sesión actual
app.get("/api/auth/me", (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            autenticado: false
        });
    }

    res.json({
        autenticado: true,
        usuario: req.session.usuario
    });
});

// Cerrar sesión
app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                mensaje: "No fue posible cerrar la sesión."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            mensaje: "Sesión cerrada correctamente."
        });
    });
});


/* =========================================
   GESTIÓN DE EVENTOS
========================================= */

// Consultar eventos con ubicación, organizador y categorías
app.get("/api/eventos", async (req, res) => {
    try {
        const [eventos] = await db.execute(`
            SELECT
                e.id_evento,
                e.nombre_evento,
                e.descripcion_evento,
                e.fecha_evento,
                e.hora_evento,
                e.estado,
                e.precio,
                e.imagen_url,
                e.id_usuario,
                e.id_ubicacion,
                MIN(ec.id_categoria) AS id_categoria,
                u.nombre_lugar,
                u.direccion,
                u.barrio,
                u.ciudad,
                CONCAT(us.nombre_usuario, ' ', us.apellido_usuario)
                    AS organizador,
                GROUP_CONCAT(
                    DISTINCT c.nombre_categoria
                    ORDER BY c.nombre_categoria
                    SEPARATOR ', '
                ) AS categorias
            FROM eventos e
            INNER JOIN ubicaciones u
                ON e.id_ubicacion = u.id_ubicacion
            INNER JOIN usuarios us
                ON e.id_usuario = us.id_usuario
            LEFT JOIN eventos_categorias ec
                ON e.id_evento = ec.id_evento
            LEFT JOIN categorias c
                ON ec.id_categoria = c.id_categoria
            GROUP BY
                e.id_evento,
                e.nombre_evento,
                e.descripcion_evento,
                e.fecha_evento,
                e.hora_evento,
                e.estado,
                e.precio,
                e.imagen_url,
                e.id_usuario,
                e.id_ubicacion,
                u.nombre_lugar,
                u.direccion,
                u.barrio,
                u.ciudad,
                us.nombre_usuario,
                us.apellido_usuario
            ORDER BY e.fecha_evento ASC, e.hora_evento ASC
        `);

        res.json(eventos);
    } catch (error) {
        console.error("Error al consultar eventos:", error.code || error.message);

        res.status(500).json({
            mensaje: "No fue posible consultar los eventos."
        });
    }
});


/* =========================================
   FAVORITOS DE CULTURAAPP
========================================= */

// Consultar los favoritos del usuario autenticado
app.get("/api/favoritos", async (req, res) => {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Inicia sesión para consultar tus favoritos."
        });
    }

    if (usuario.rol !== "Cliente") {
        return res.status(403).json({
            mensaje: "Esta sección está disponible para clientes."
        });
    }

    try {
        const [favoritos] = await db.execute(
            `SELECT
                e.id_evento,
                e.nombre_evento,
                e.descripcion_evento,
                e.fecha_evento,
                e.hora_evento,
                e.precio,
                e.imagen_url,
                u.nombre_lugar,
                u.direccion,
                f.fecha_guardado
             FROM favoritos f
             INNER JOIN eventos e
                ON f.id_evento = e.id_evento
             INNER JOIN ubicaciones u
                ON e.id_ubicacion = u.id_ubicacion
             WHERE f.id_usuario = ?
               AND e.estado = 'Activo'
             ORDER BY f.fecha_guardado DESC`,
            [usuario.id]
        );

        return res.json(favoritos);

    } catch (error) {
        console.error(
            "Error al consultar favoritos:",
            error.code || error.message
        );

        return res.status(500).json({
            mensaje: "No fue posible consultar tus favoritos."
        });
    }
});


// Guardar un evento en favoritos
app.post("/api/favoritos/:id", async (req, res) => {
    const usuario = req.session?.usuario;
    const idEvento = Number(req.params.id);

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Inicia sesión para guardar favoritos."
        });
    }

    if (usuario.rol !== "Cliente") {
        return res.status(403).json({
            mensaje: "Esta función está disponible para clientes."
        });
    }

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
        return res.status(400).json({
            mensaje: "El identificador del evento no es válido."
        });
    }

    try {
        const [eventos] = await db.execute(
            `SELECT id_evento
             FROM eventos
             WHERE id_evento = ?
               AND estado = 'Activo'`,
            [idEvento]
        );

        if (eventos.length === 0) {
            return res.status(404).json({
                mensaje: "El evento no existe o no está disponible."
            });
        }

        const [existentes] = await db.execute(
            `SELECT id_evento
             FROM favoritos
             WHERE id_usuario = ? AND id_evento = ?`,
            [usuario.id, idEvento]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                mensaje: "Este evento ya está en tus favoritos."
            });
        }

        await db.execute(
            `INSERT INTO favoritos (id_usuario, id_evento)
             VALUES (?, ?)`,
            [usuario.id, idEvento]
        );

        return res.status(201).json({
            mensaje: "Evento agregado a tus favoritos.",
            id_evento: idEvento
        });

    } catch (error) {
        console.error(
            "Error al guardar favorito:",
            error.code || error.message
        );

        return res.status(500).json({
            mensaje: "No fue posible guardar el favorito."
        });
    }
});


// Eliminar un evento de favoritos
app.delete("/api/favoritos/:id", async (req, res) => {
    const usuario = req.session?.usuario;
    const idEvento = Number(req.params.id);

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Inicia sesión para modificar tus favoritos."
        });
    }

    if (usuario.rol !== "Cliente") {
        return res.status(403).json({
            mensaje: "Esta función está disponible para clientes."
        });
    }

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
        return res.status(400).json({
            mensaje: "El identificador del evento no es válido."
        });
    }

    try {
        const [resultado] = await db.execute(
            `DELETE FROM favoritos
             WHERE id_usuario = ? AND id_evento = ?`,
            [usuario.id, idEvento]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: "El evento no está en tus favoritos."
            });
        }

        return res.json({
            mensaje: "Evento eliminado de tus favoritos.",
            id_evento: idEvento
        });

    } catch (error) {
        console.error(
            "Error al eliminar favorito:",
            error.code || error.message
        );

        return res.status(500).json({
            mensaje: "No fue posible eliminar el favorito."
        });
    }
});


// Consultar categorías disponibles para los formularios
app.get("/api/categorias", async (req, res) => {
    try {
        const [categorias] = await db.execute(`
            SELECT id_categoria, nombre_categoria, descripcion
            FROM categorias
            ORDER BY nombre_categoria
        `);

        res.json(categorias);
    } catch (error) {
        console.error("Error al consultar categorías:", error.code || error.message);

        res.status(500).json({
            mensaje: "No fue posible consultar las categorías."
        });
    }
});

// Consultar ubicaciones disponibles
app.get("/api/ubicaciones", async (req, res) => {
    try {
        const [ubicaciones] = await db.execute(`
            SELECT id_ubicacion, nombre_lugar, direccion,
                    barrio, ciudad, referencia
            FROM ubicaciones
            ORDER BY nombre_lugar
        `);

        res.json(ubicaciones);
    } catch (error) {
        console.error("Error al consultar ubicaciones:", error.code || error.message);

        res.status(500).json({
            mensaje: "No fue posible consultar las ubicaciones."
        });
    }
});


/* =========================================
   CREAR EVENTOS
========================================= */


app.post(
    "/api/eventos",
    (req, res, next) => {
        subirImagenEvento.single("imagen")(req, res, (error) => {
            if (!error) {
                return next();
            }

            const mensaje = error.code === "LIMIT_FILE_SIZE"
                ? "La imagen no puede superar los 5 MB."
                : error.message || "No fue posible procesar la imagen.";

            return res.status(400).json({ mensaje });
        });
    },
    async (req, res) => {

    // Verificar sesión
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión para crear eventos."
        });
    }

    // Solo un organizador o administrador puede crear eventos
    if (!["Organizador", "Administrador"].includes(usuario.rol)) {
        return res.status(403).json({
            mensaje: "Tu cuenta no tiene permisos para crear eventos."
        });
    }

    const {
        nombre_evento,
        descripcion_evento,
        fecha_evento,
        hora_evento,
        id_ubicacion,
        id_categoria,
        precio
    } = req.body;

    if (!req.file) {
        return res.status(400).json({
            mensaje: "Debes seleccionar una imagen para el evento."
        });
    }

    const imagenUrl = `/uploads/eventos/${req.file.filename}`;

    if (
        !nombre_evento?.trim() ||
        !descripcion_evento?.trim() ||
        !fecha_evento ||
        !hora_evento ||
        !id_ubicacion ||
        !id_categoria ||
        precio === undefined ||
        precio === null ||
        precio === ""
    ) {
        return res.status(400).json({
            mensaje: "Completa todos los campos del evento."
        });
    }

    const precioNumero = Number(precio);
    const ubicacionId = Number(id_ubicacion);
    const categoriaId = Number(id_categoria);

    if (
        !Number.isFinite(precioNumero) ||
        precioNumero < 0 ||
        !Number.isInteger(ubicacionId) ||
        ubicacionId <= 0 ||
        !Number.isInteger(categoriaId) ||
        categoriaId <= 0
    ) {
        return res.status(400).json({
            mensaje: "Revisa el precio, la ubicación y la categoría."
        });
    }

    let conexion;

    try {
        conexion = await db.getConnection();
        await conexion.beginTransaction();

        const [ubicaciones] = await conexion.execute(
            "SELECT id_ubicacion FROM ubicaciones WHERE id_ubicacion = ?",
            [ubicacionId]
        );

        const [categorias] = await conexion.execute(
            "SELECT id_categoria FROM categorias WHERE id_categoria = ?",
            [categoriaId]
        );

        if (!ubicaciones.length || !categorias.length) {
            await conexion.rollback();

            return res.status(400).json({
                mensaje: "La ubicación o categoría seleccionada no existe."
            });
        }

                const [resultado] = await conexion.execute(
            `INSERT INTO eventos (
                nombre_evento,
                descripcion_evento,
                fecha_evento,
                hora_evento,
                estado,
                id_usuario,
                id_ubicacion,
                precio,
                imagen_url
            ) VALUES (?, ?, ?, ?, 'Borrador', ?, ?, ?, ?)`,
            [
                nombre_evento.trim(),
                descripcion_evento.trim(),
                fecha_evento,
                hora_evento,
                usuario.id,
                ubicacionId,
                precioNumero,
                imagenUrl
            ]
        );

        await conexion.execute(
            `INSERT INTO eventos_categorias (
                id_evento,
                id_categoria
            ) VALUES (?, ?)`,
            [resultado.insertId, categoriaId]
        );

        await conexion.commit();

        res.status(201).json({
            mensaje: "Evento creado correctamente como borrador.",
            id_evento: resultado.insertId
        });

    } catch (error) {
        if (conexion) {
            await conexion.rollback();
        }

        console.error("Error al crear evento:", error.code || error.message);

        res.status(500).json({
            mensaje: "No fue posible guardar el evento."
        });

    } finally {
        if (conexion) {
            conexion.release();
        }
    }
});


/* =========================================
   EDITAR EVENTOS
========================================= */


app.put(
    "/api/eventos/:id",
    (req, res, next) => {
        subirImagenEvento.single("imagen")(req, res, (error) => {
            if (!error) {
                return next();
            }

            const mensaje = error.code === "LIMIT_FILE_SIZE"
                ? "La imagen no puede superar los 5 MB."
                : error.message || "No fue posible procesar la imagen.";

            return res.status(400).json({ mensaje });
        });
    },
    async (req, res) => {

    const usuario = req.session?.usuario;
    const idEvento = Number(req.params.id);

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión."
        });
    }

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
        return res.status(400).json({
            mensaje: "El código del evento no es válido."
        });
    }

    const {
        nombre_evento,
        descripcion_evento,
        fecha_evento,
        hora_evento,
        id_ubicacion,
        id_categoria,
        precio
    } = req.body;

    if (
        typeof nombre_evento !== "string" ||
        !nombre_evento.trim() ||
        typeof descripcion_evento !== "string" ||
        !descripcion_evento.trim() ||
        !fecha_evento ||
        !hora_evento ||
        !id_ubicacion ||
        !id_categoria ||
        precio === undefined ||
        precio === null ||
        precio === ""
    ) {
        return res.status(400).json({
            mensaje: "Completa todos los campos del evento."
        });
    }

    const ubicacionId = Number(id_ubicacion);
    const categoriaId = Number(id_categoria);
    const precioNumero = Number(precio);

    if (
        !Number.isInteger(ubicacionId) || ubicacionId <= 0 ||
        !Number.isInteger(categoriaId) || categoriaId <= 0 ||
        !Number.isFinite(precioNumero) || precioNumero < 0
    ) {
        return res.status(400).json({
            mensaje: "Revisa la ubicación, categoría y precio."
        });
    }

    let conexion;

    try {
        conexion = await db.getConnection();
        await conexion.beginTransaction();

        const [eventos] = await conexion.execute(
            `SELECT id_usuario, imagen_url
             FROM eventos
             WHERE id_evento = ?
             FOR UPDATE`,
            [idEvento]
        );

        if (eventos.length === 0) {
            await conexion.rollback();

            return res.status(404).json({
                mensaje: "El evento no existe."
            });
        }

        const esAdministrador = [
            "Administrador",
            "Admin"
        ].includes(usuario.rol);

        const esPropietario =
            Number(eventos[0].id_usuario) === Number(usuario.id);

        if (!esAdministrador && !esPropietario) {
            await conexion.rollback();

            return res.status(403).json({
                mensaje: "No tienes permiso para editar este evento."
            });
        }

        const [ubicaciones] = await conexion.execute(
            "SELECT id_ubicacion FROM ubicaciones WHERE id_ubicacion = ?",
            [ubicacionId]
        );

        const [categorias] = await conexion.execute(
            "SELECT id_categoria FROM categorias WHERE id_categoria = ?",
            [categoriaId]
        );

        if (!ubicaciones.length || !categorias.length) {
            await conexion.rollback();

            return res.status(400).json({
                mensaje: "La ubicación o categoría no existe."
            });
        }

        
        await conexion.execute(
            `UPDATE eventos
             SET nombre_evento = ?,
                 descripcion_evento = ?,
                 fecha_evento = ?,
                 hora_evento = ?,
                 id_ubicacion = ?,
                 precio = ?,
                 imagen_url = COALESCE(?, imagen_url)
             WHERE id_evento = ?`,
            [
                nombre_evento.trim(),
                descripcion_evento.trim(),
                fecha_evento,
                hora_evento,
                ubicacionId,
                precioNumero,
                req.file ? `/uploads/eventos/${req.file.filename}` : null,
                idEvento
            ]
        );


        await conexion.execute(
            "DELETE FROM eventos_categorias WHERE id_evento = ?",
            [idEvento]
        );

        await conexion.execute(
            `INSERT INTO eventos_categorias
             (id_evento, id_categoria)
             VALUES (?, ?)`,
            [idEvento, categoriaId]
        );

        await conexion.commit();

        return res.json({
            mensaje: "Evento actualizado correctamente.",
            id_evento: idEvento
        });

    } catch (error) {
        if (conexion) {
            await conexion.rollback();
        }

        console.error("Error al editar evento:", error.code || error.message);

        return res.status(500).json({
            mensaje: "No fue posible actualizar el evento."
        });

    } finally {
        if (conexion) {
            conexion.release();
        }
    }
});


/* =========================================
   CANCELAR EVENTOS
========================================= */

app.patch("/api/eventos/:id/cancelar", async (req, res) => {
    const usuario = req.session?.usuario;
    const idEvento = Number(req.params.id);

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión."
        });
    }

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
        return res.status(400).json({
            mensaje: "El código del evento no es válido."
        });
    }

    let conexion;

    try {
        conexion = await db.getConnection();
        await conexion.beginTransaction();

        const [eventos] = await conexion.execute(
            `SELECT id_usuario, estado
             FROM eventos
             WHERE id_evento = ?
             FOR UPDATE`,
            [idEvento]
        );

        if (eventos.length === 0) {
            await conexion.rollback();

            return res.status(404).json({
                mensaje: "El evento no existe."
            });
        }

        const esAdministrador = [
            "Administrador",
            "Admin"
        ].includes(usuario.rol);

        const esPropietario =
            Number(eventos[0].id_usuario) === Number(usuario.id);

        if (!esAdministrador && !esPropietario) {
            await conexion.rollback();

            return res.status(403).json({
                mensaje: "No tienes permiso para cancelar este evento."
            });
        }

        if (eventos[0].estado === "Cancelado") {
            await conexion.rollback();

            return res.status(409).json({
                mensaje: "El evento ya está cancelado."
            });
        }

        await conexion.execute(
            `UPDATE eventos
             SET estado = 'Cancelado'
             WHERE id_evento = ?`,
            [idEvento]
        );

        await conexion.commit();

        return res.json({
            mensaje: "Evento cancelado correctamente.",
            id_evento: idEvento
        });

    } catch (error) {
        if (conexion) {
            await conexion.rollback();
        }

        console.error("Error al cancelar evento:", error.code || error.message);

        return res.status(500).json({
            mensaje: "No fue posible cancelar el evento."
        });

    } finally {
        if (conexion) {
            conexion.release();
        }
    }
});


/* =========================================
    RESEÑAS Y CALIFICACIONES
========================================= */

// Consultar reseñas y promedio de un evento
app.get("/api/eventos/:id/resenas", async (req, res) => {
    const idEvento = Number(req.params.id);

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
        return res.status(400).json({
            mensaje: "El código del evento no es válido."
        });
    }

    try {
        const [eventos] = await db.execute(
            `SELECT id_evento
             FROM eventos
             WHERE id_evento = ?`,
            [idEvento]
        );

        if (eventos.length === 0) {
            return res.status(404).json({
                mensaje: "El evento no existe."
            });
        }

        const [resenas] = await db.execute(
            `SELECT
                r.id_resena,
                r.id_usuario,
                r.id_evento,
                r.calificacion,
                r.comentario,
                r.fecha_resena,
                u.nombre_usuario,
                u.apellido_usuario
             FROM resenas r
             INNER JOIN usuarios u
                ON r.id_usuario = u.id_usuario
             WHERE r.id_evento = ?
             ORDER BY r.fecha_resena DESC`,
            [idEvento]
        );

        const [resumen] = await db.execute(
            `SELECT
                COUNT(*) AS total_resenas,
                ROUND(AVG(calificacion), 1) AS promedio
             FROM resenas
             WHERE id_evento = ?`,
            [idEvento]
        );

        return res.json({
            evento: idEvento,
            total_resenas: Number(resumen[0].total_resenas),
            promedio: resumen[0].promedio === null
                ? null
                : Number(resumen[0].promedio),
            resenas
        });

    } catch (error) {
        console.error(
            "Error al consultar reseñas:",
            error.code || error.message
        );

        return res.status(500).json({
            mensaje: "No fue posible consultar las reseñas."
        });
    }
});


// Publicar una reseña
app.post("/api/eventos/:id/resenas", async (req, res) => {
    const usuario = req.session?.usuario;
    const idEvento = Number(req.params.id);
    const { calificacion, comentario } = req.body;

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Inicia sesión para publicar una reseña."
        });
    }

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
        return res.status(400).json({
            mensaje: "El código del evento no es válido."
        });
    }

    const puntuacion = Number(calificacion);

    if (
        !Number.isInteger(puntuacion) ||
        puntuacion < 1 ||
        puntuacion > 5
    ) {
        return res.status(400).json({
            mensaje: "La calificación debe estar entre 1 y 5."
        });
    }

    if (
        typeof comentario !== "string" ||
        !comentario.trim() ||
        comentario.trim().length > 2000
    ) {
        return res.status(400).json({
            mensaje: "Escribe un comentario de máximo 2000 caracteres."
        });
    }

    try {
        const [eventos] = await db.execute(
            `SELECT id_evento
             FROM eventos
             WHERE id_evento = ?`,
            [idEvento]
        );

        if (eventos.length === 0) {
            return res.status(404).json({
                mensaje: "El evento no existe."
            });
        }

        await db.execute(
            `INSERT INTO resenas
                (id_usuario, id_evento, calificacion, comentario)
             VALUES (?, ?, ?, ?)`,
            [
                usuario.id,
                idEvento,
                puntuacion,
                comentario.trim()
            ]
        );

        return res.status(201).json({
            mensaje: "Tu reseña se publicó correctamente."
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "Ya publicaste una reseña para este evento."
            });
        }

        console.error(
            "Error al publicar reseña:",
            error.code || error.message
        );

        return res.status(500).json({
            mensaje: "No fue posible publicar tu reseña."
        });
    }
});


/* =========================================
    ANÁLISIS DE RESEÑAS CON GEMINI
========================================= */


function esErrorTemporalGemini(error) {
    const codigo = Number(error?.status ?? error?.code);

    const detalle = [
        error?.message,
        error?.status,
        error?.code
    ].join(" ");

    return (
        [429, 500, 502, 503, 504].includes(codigo) ||
        /\b(429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|rate limit/i.test(detalle)
    );
}


app.post("/api/eventos/:id/analizar-resenas", async (req, res) => {
    const usuario = req.session?.usuario;
    const idEvento = Number(req.params.id);

    // 1. Verificar que el usuario inició sesión
    if (!usuario) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión para analizar las reseñas."
        });
    }

    // 2. Validar el identificador del evento
    if (!Number.isInteger(idEvento) || idEvento <= 0) {
        return res.status(400).json({
            mensaje: "El código del evento no es válido."
        });
    }

    try {
        // 3. Consultar el evento y verificar sus permisos
        const [eventos] = await db.execute(
            `SELECT id_evento, nombre_evento, id_usuario
             FROM eventos
             WHERE id_evento = ?`,
            [idEvento]
        );

        if (eventos.length === 0) {
            return res.status(404).json({
                mensaje: "El evento no existe."
            });
        }

        const evento = eventos[0];

        const esAdministrador = [
            "Administrador",
            "Admin"
        ].includes(usuario.rol);

        const esPropietario =
            Number(evento.id_usuario) === Number(usuario.id);

        if (!esAdministrador && !esPropietario) {
            return res.status(403).json({
                mensaje: "No tienes permiso para analizar este evento."
            });
        }

        // 4. Consultar las reseñas de MySQL
        const [resenas] = await db.execute(
            `SELECT calificacion, comentario
             FROM resenas
             WHERE id_evento = ?
             ORDER BY fecha_resena DESC
             LIMIT 100`,
            [idEvento]
        );

        if (resenas.length < 3) {
            return res.status(400).json({
                mensaje: "Se necesitan al menos 3 reseñas para generar un análisis inicial.",
                total_resenas: resenas.length
            });
        }

        // 5. Preparar los comentarios sin datos personales
        const comentarios = resenas.map((resena, indice) => ({
            numero: indice + 1,
            calificacion: Number(resena.calificacion),
            comentario: resena.comentario
        }));

        
        // 6. Solicitar el análisis a Gemini con reintentos controlados
        const esperasReintento = [30_000, 60_000];
        let respuesta;

        for (let intento = 0; ; intento++) {
            try {
                respuesta = await genAI.models.generateContent({
                    model: "gemini-3.6-flash",
                    contents: `
Analiza las siguientes reseñas de un evento cultural.

Nombre del evento: ${evento.nombre_evento}
Cantidad de reseñas analizadas: ${comentarios.length}

Reseñas:
${JSON.stringify(comentarios)}

Devuelve un informe en español con estas secciones:
1. sentimiento_general: positivo, neutro o negativo.
2. puntuacion_percepcion: número entero de 1 a 10.
3. fortalezas: lista de aspectos positivos mencionados.
4. mejoras: lista de aspectos que deberían mejorarse.
5. recomendaciones: lista de acciones concretas para el organizador.
6. resumen: explicación breve del resultado.

La puntuación de percepción es una estimación orientativa.
Distingue las calificaciones numéricas de las opiniones escritas.
No inventes información que no aparezca en las reseñas.
Devuelve exclusivamente un objeto JSON válido.
`
                });

                // La solicitud funcionó: salir del ciclo.
                break;

            } catch (error) {
                // Los errores permanentes no deben reintentarse.
                if (
                    !esErrorTemporalGemini(error) ||
                    intento >= esperasReintento.length
                ) {
                    throw error;
                }

                const esperaMs = esperasReintento[intento];

                console.warn(
                    `Gemini no está disponible. Reintento ${intento + 1} de ${esperasReintento.length} en ${esperaMs / 1000} segundos.`
                );

                await new Promise(resolve =>
                    setTimeout(resolve, esperaMs)
                );
            }
        }


        // 7. Interpretar el informe generado
        const texto = respuesta.text;

        if (!texto) {
            throw new Error("Gemini no devolvió contenido.");
        }

        const textoLimpio = texto
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();

        const informe = JSON.parse(textoLimpio);

        // 8. Responder al frontend
        return res.json({
            evento: evento.nombre_evento,
            total_resenas: comentarios.length,
            informe
        });

    } catch (error) {
        console.error(
            "Error en análisis con Gemini:",
            error.message
        );

        return res.status(500).json({
            mensaje: "No fue posible generar el análisis de reseñas."
        });
    }
});

/* =========================================
   REGISTRO DE CLIENTES Y ORGANIZADORES
========================================= */

app.post("/api/auth/registro", async (req, res) => {
    let conexion;
    let transaccionIniciada = false;

    try {
        const {
            nombre,
            apellido,
            correo,
            contrasena,
            confirmarContrasena,
            tipoRegistro = "cliente",
            tipoOrganizadorDetalle,
            nombreOrganizacion,
            tipoActividades,
            descripcionOrganizador
        } = req.body;

        console.log("=== PRUEBA DE REGISTRO ===");
console.log("Correo:", correo);
console.log("Tipo recibido:", tipoRegistro);
console.log("Tipo de organizador:", tipoOrganizadorDetalle);
console.log("Actividad:", tipoActividades);

        // 1. Validar los datos personales
        if (
            typeof nombre !== "string" ||
            typeof apellido !== "string" ||
            typeof correo !== "string" ||
            typeof contrasena !== "string" ||
            typeof confirmarContrasena !== "string"
        ) {
            return res.status(400).json({
                mensaje: "Completa correctamente todos los campos."
            });
        }

        const nombreLimpio = nombre.trim();
        const apellidoLimpio = apellido.trim();
        const correoLimpio = correo.trim().toLowerCase();

        if (
            !nombreLimpio ||
            !apellidoLimpio ||
            !correoLimpio ||
            !contrasena
        ) {
            return res.status(400).json({
                mensaje: "Todos los campos personales son obligatorios."
            });
        }

        if (
            nombreLimpio.length > 80 ||
            apellidoLimpio.length > 80 ||
            correoLimpio.length > 150
        ) {
            return res.status(400).json({
                mensaje: "Uno de los campos supera la longitud permitida."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
            return res.status(400).json({
                mensaje: "Ingresa un correo electrónico válido."
            });
        }

        if (
            contrasena.length < 8 ||
            Buffer.byteLength(contrasena, "utf8") > 72
        ) {
            return res.status(400).json({
                mensaje: "La contraseña debe tener entre 8 caracteres y el límite permitido."
            });
        }

        if (contrasena !== confirmarContrasena) {
            return res.status(400).json({
                mensaje: "Las contraseñas no coinciden."
            });
        }

        // 2. Validar el tipo de registro solicitado
        if (!["cliente", "organizador"].includes(tipoRegistro)) {
            return res.status(400).json({
                mensaje: "El tipo de registro seleccionado no es válido."
            });
        }

        let tipoOrganizador = null;
        let organizacionLimpia = null;
        let actividadesLimpias = null;
        let descripcionLimpia = null;

        // 3. Validar los datos adicionales del organizador
        if (tipoRegistro === "organizador") {
            const tiposPermitidos = [
                "individual",
                "organizacion",
                "colectivo"
            ];

            const actividadesPermitidas = [
                "musica",
                "teatro",
                "danza",
                "artes",
                "deporte",
                "ferias",
                "otras"
            ];

            if (
                typeof tipoOrganizadorDetalle !== "string" ||
                !tiposPermitidos.includes(tipoOrganizadorDetalle)
            ) {
                return res.status(400).json({
                    mensaje: "Selecciona cómo organizas tus actividades."
                });
            }

            if (
                typeof tipoActividades !== "string" ||
                !actividadesPermitidas.includes(tipoActividades)
            ) {
                return res.status(400).json({
                    mensaje: "Selecciona el tipo de actividades que organizas."
                });
            }

            if (
                typeof descripcionOrganizador !== "string" ||
                !descripcionOrganizador.trim() ||
                descripcionOrganizador.trim().length > 1000
            ) {
                return res.status(400).json({
                    mensaje: "Describe tus actividades en un máximo de 1000 caracteres."
                });
            }

            tipoOrganizador = tipoOrganizadorDetalle;
            actividadesLimpias = tipoActividades;
            descripcionLimpia = descripcionOrganizador.trim();

            if (tipoOrganizador !== "individual") {
                if (
                    typeof nombreOrganizacion !== "string" ||
                    !nombreOrganizacion.trim() ||
                    nombreOrganizacion.trim().length > 150
                ) {
                    return res.status(400).json({
                        mensaje: "Escribe el nombre de la organización o colectivo."
                    });
                }

                organizacionLimpia = nombreOrganizacion.trim();
            }
        }

        // 4. Preparar contraseña y conexión a MySQL
        const hash = await bcrypt.hash(contrasena, 12);

        conexion = await db.getConnection();
        await conexion.beginTransaction();
        transaccionIniciada = true;

        // 5. Comprobar que el correo no esté registrado
        const [usuariosExistentes] = await conexion.execute(
            `SELECT id_usuario
             FROM usuarios
             WHERE correo_electronico = ?
             LIMIT 1`,
            [correoLimpio]
        );

        if (usuariosExistentes.length > 0) {
            await conexion.rollback();
            transaccionIniciada = false;

            return res.status(409).json({
                mensaje: "Este correo ya está registrado."
            });
        }

        // 6. Obtener siempre el rol Cliente para el registro público
        const [roles] = await conexion.execute(
            `SELECT id_rol
             FROM roles
             WHERE nombre_rol = ?
             LIMIT 1`,
            ["Cliente"]
        );

        if (roles.length === 0) {
            await conexion.rollback();
            transaccionIniciada = false;

            return res.status(500).json({
                mensaje: "No se encontró el rol de cliente en la base de datos."
            });
        }

        
        // 7. Crear la cuenta según el tipo de registro
        // Los clientes quedan activos; los organizadores esperan aprobación.
        const estadoInicial = tipoRegistro === "organizador"
            ? "Pendiente"
            : "Activo";

        const [resultadoUsuario] = await conexion.execute(
            `INSERT INTO usuarios (
                nombre_usuario,
                apellido_usuario,
                correo_electronico,
                contrasena,
                telefono,
                id_rol,
                estado
            )
            VALUES (?, ?, ?, ?, NULL, ?, ?)`,
            [
                nombreLimpio,
                apellidoLimpio,
                correoLimpio,
                hash,
                roles[0].id_rol,
                estadoInicial
            ]
        );

        const idUsuario = resultadoUsuario.insertId;

        // 8. Si es organizador, registrar su solicitud pendiente
        if (tipoRegistro === "organizador") {
            await conexion.execute(
                `INSERT INTO solicitudes_organizadores (
                    id_usuario,
                    tipo_organizador,
                    nombre_organizacion,
                    tipo_actividades,
                    descripcion,
                    estado
                )
                VALUES (?, ?, ?, ?, ?, 'Pendiente')`,
                [
                    idUsuario,
                    tipoOrganizador,
                    organizacionLimpia,
                    actividadesLimpias,
                    descripcionLimpia
                ]
            );
        }

        // 9. Confirmar las operaciones
        await conexion.commit();
        transaccionIniciada = false;

        if (tipoRegistro === "organizador") {
            return res.status(201).json({
                mensaje: "Tu cuenta y solicitud de organizador fueron registradas. El administrador debe revisar tu solicitud antes de activar tu cuenta."
            });
        }

        return res.status(201).json({
            mensaje: "¡Cuenta creada correctamente! Ya puedes iniciar sesión en CulturaApp."
        });

    } catch (error) {
        if (conexion && transaccionIniciada) {
            try {
                await conexion.rollback();
            } catch (errorRollback) {
                console.error(
                    "Error al revertir el registro:",
                    errorRollback.code || errorRollback.message
                );
            }
        }

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "Este correo o solicitud ya está registrado."
            });
        }

        console.error(
            "Error en registro:",
            error.code || error.message
        );

        return res.status(500).json({
            mensaje: "No fue posible completar el registro."
        });

    } finally {
        if (conexion) {
            conexion.release();
        }
    }
});


/* ==========================================
    PANEL DE ADMINISTRACIÓN
========================================== */

// Middleware: verificar que el usuario sea administrador
function verificarAdministrador(req, res, next) {
    const usuario = req.session?.usuario;

    if (!usuario) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión para acceder."
        });
    }

    if (usuario.rol !== "Administrador") {
        return res.status(403).json({
            mensaje: "No tienes permisos de administrador."
        });
    }

    next();
}


/* ==========================================
   APROBAR Y RECHAZAR EVENTOS
========================================== */

// Aprobar un evento pendiente
app.patch(
    "/api/admin/eventos/:id/aprobar",
    verificarAdministrador,
    async (req, res) => {
        const idEvento = Number(req.params.id);

        if (!Number.isInteger(idEvento) || idEvento <= 0) {
            return res.status(400).json({
                mensaje: "El identificador del evento no es válido."
            });
        }

        try {
            const [resultado] = await db.execute(
                `UPDATE eventos
                 SET estado = 'Activo'
                 WHERE id_evento = ?
                   AND estado = 'Borrador'`,
                [idEvento]
            );

            if (resultado.affectedRows === 0) {
                const [eventos] = await db.execute(
                    `SELECT estado
                     FROM eventos
                     WHERE id_evento = ?`,
                    [idEvento]
                );

                if (eventos.length === 0) {
                    return res.status(404).json({
                        mensaje: "El evento no existe."
                    });
                }

                return res.status(409).json({
                    mensaje: "El evento no está pendiente de aprobación."
                });
            }

            return res.json({
                mensaje: "Evento aprobado correctamente.",
                id_evento: idEvento,
                estado: "Activo"
            });
        } catch (error) {
            console.error(
                "Error al aprobar evento:",
                error.code || error.message
            );

            return res.status(500).json({
                mensaje: "No fue posible aprobar el evento."
            });
        }
    }
);

// Rechazar un evento pendiente
app.patch(
    "/api/admin/eventos/:id/rechazar",
    verificarAdministrador,
    async (req, res) => {
        const idEvento = Number(req.params.id);

        if (!Number.isInteger(idEvento) || idEvento <= 0) {
            return res.status(400).json({
                mensaje: "El identificador del evento no es válido."
            });
        }

        try {
            const [resultado] = await db.execute(
                `UPDATE eventos
                 SET estado = 'Inactivo'
                 WHERE id_evento = ?
                   AND estado = 'Borrador'`,
                [idEvento]
            );

            if (resultado.affectedRows === 0) {
                const [eventos] = await db.execute(
                    `SELECT estado
                     FROM eventos
                     WHERE id_evento = ?`,
                    [idEvento]
                );

                if (eventos.length === 0) {
                    return res.status(404).json({
                        mensaje: "El evento no existe."
                    });
                }

                return res.status(409).json({
                    mensaje: "El evento no está pendiente de aprobación."
                });
            }

            return res.json({
                mensaje: "Evento rechazado correctamente.",
                id_evento: idEvento,
                estado: "Inactivo"
            });
        } catch (error) {
            console.error(
                "Error al rechazar evento:",
                error.code || error.message
            );

            return res.status(500).json({
                mensaje: "No fue posible rechazar el evento."
            });
        }
    }
);


// ==========================================
// CONSULTAR SOLICITUDES DE ORGANIZADORES
// ==========================================

app.get(
    "/api/admin/solicitudes-organizadores",
    verificarAdministrador,
    async (req, res) => {
        try {
            const [solicitudes] = await db.execute(`
                SELECT
                    s.id_solicitud,
                    s.id_usuario,
                    s.tipo_organizador,
                    s.nombre_organizacion,
                    s.tipo_actividades,
                    s.descripcion,
                    s.estado,
                    s.fecha_solicitud,
                    u.nombre_usuario,
                    u.apellido_usuario,
                    u.correo_electronico
                FROM solicitudes_organizadores s
                INNER JOIN usuarios u
                    ON s.id_usuario = u.id_usuario
                ORDER BY
                    CASE
                        WHEN s.estado = 'Pendiente' THEN 0
                        ELSE 1
                    END,
                    s.fecha_solicitud DESC
            `);

            return res.json(solicitudes);

        } catch (error) {
            console.error(
                "Error al consultar solicitudes:",
                error.code || error.message
            );

            return res.status(500).json({
                mensaje: "No fue posible consultar las solicitudes."
            });
        }
    }
);

// ==========================================
// CONSULTAR ESTADÍSTICAS DEL PANEL
// ==========================================

app.get(
    "/api/admin/estadisticas",
    verificarAdministrador,
    async (req, res) => {
        try {
            const [usuarios] = await db.execute(`
                SELECT COUNT(*) AS total
                FROM usuarios
            `);

            const [eventos] = await db.execute(`
                SELECT COUNT(*) AS total
                FROM eventos
            `);

            const [solicitudes] = await db.execute(`
                SELECT COUNT(*) AS total
                FROM solicitudes_organizadores
                WHERE estado = 'Pendiente'
            `);

            return res.json({
                totalUsuarios: Number(usuarios[0].total),
                totalEventos: Number(eventos[0].total),
                totalSolicitudes: Number(solicitudes[0].total)
            });

        } catch (error) {
            console.error(
                "Error al consultar estadísticas:",
                error.code || error.message
            );

            return res.status(500).json({
                mensaje: "No fue posible consultar las estadísticas."
            });
        }
    }
);


/* APROBAR SOLICITUD DE ORGANIZADOR */
app.post(
    "/api/admin/solicitudes-organizadores/:id/aprobar",
    verificarAdministrador,
    async (req, res) => {
        const idSolicitud = Number(req.params.id);
        const idAdministrador = req.session.usuario.id;

        if (!Number.isInteger(idSolicitud) || idSolicitud <= 0) {
            return res.status(400).json({
                mensaje: "El identificador de la solicitud no es válido."
            });
        }

        let conexion;

        try {
            conexion = await db.getConnection();
            await conexion.beginTransaction();

            const [solicitudes] = await conexion.execute(
                `SELECT id_solicitud, id_usuario, estado
                 FROM solicitudes_organizadores
                 WHERE id_solicitud = ?
                 FOR UPDATE`,
                [idSolicitud]
            );

            if (solicitudes.length === 0) {
                await conexion.rollback();
                return res.status(404).json({
                    mensaje: "La solicitud no existe."
                });
            }

            const solicitud = solicitudes[0];

            if (solicitud.estado !== "Pendiente") {
                await conexion.rollback();
                return res.status(409).json({
                    mensaje: "Esta solicitud ya fue revisada."
                });
            }

            const [roles] = await conexion.execute(
                "SELECT id_rol FROM roles WHERE nombre_rol = ?",
                ["Organizador"]
            );

            if (roles.length === 0) {
                throw new Error("No existe el rol Organizador en la base de datos.");
            }

            await conexion.execute(
                `UPDATE usuarios
                 SET id_rol = ?, estado = 'Activo'
                 WHERE id_usuario = ?`,
                [roles[0].id_rol, solicitud.id_usuario]
            );

            await conexion.execute(
                `UPDATE solicitudes_organizadores
                 SET estado = 'Aprobada',
                     fecha_revision = CURRENT_TIMESTAMP,
                     revisado_por = ?
                 WHERE id_solicitud = ?`,
                [idAdministrador, idSolicitud]
            );

            await conexion.commit();

            return res.json({
                mensaje: "Solicitud aprobada. El usuario ya es organizador."
            });
        } catch (error) {
            if (conexion) await conexion.rollback();
            console.error("Error al aprobar solicitud:", error);

            return res.status(500).json({
                mensaje: "No fue posible aprobar la solicitud."
            });
        } finally {
            if (conexion) conexion.release();
        }
    }
);

/* RECHAZAR SOLICITUD DE ORGANIZADOR */
app.post(
    "/api/admin/solicitudes-organizadores/:id/rechazar",
    verificarAdministrador,
    async (req, res) => {
        const idSolicitud = Number(req.params.id);
        const idAdministrador = req.session.usuario.id;

        if (!Number.isInteger(idSolicitud) || idSolicitud <= 0) {
            return res.status(400).json({
                mensaje: "El identificador de la solicitud no es válido."
            });
        }

        let conexion;

        try {
            conexion = await db.getConnection();
            await conexion.beginTransaction();

            const [solicitudes] = await conexion.execute(
                `SELECT id_solicitud, id_usuario, estado
                 FROM solicitudes_organizadores
                 WHERE id_solicitud = ?
                 FOR UPDATE`,
                [idSolicitud]
            );

            if (solicitudes.length === 0) {
                await conexion.rollback();
                return res.status(404).json({
                    mensaje: "La solicitud no existe."
                });
            }

            const solicitud = solicitudes[0];

            if (solicitud.estado !== "Pendiente") {
                await conexion.rollback();
                return res.status(409).json({
                    mensaje: "Esta solicitud ya fue revisada."
                });
            }

            await conexion.execute(
                `UPDATE solicitudes_organizadores
                 SET estado = 'Rechazada',
                     fecha_revision = CURRENT_TIMESTAMP,
                     revisado_por = ?
                 WHERE id_solicitud = ?`,
                [idAdministrador, idSolicitud]
            );

            // El usuario puede seguir utilizando CulturaApp como cliente.
            await conexion.execute(
                `UPDATE usuarios
                 SET estado = 'Activo'
                 WHERE id_usuario = ? AND id_rol = (
                     SELECT id_rol FROM roles WHERE nombre_rol = 'Cliente'
                 )`,
                [solicitud.id_usuario]
            );

            await conexion.commit();

            return res.json({
                mensaje: "Solicitud rechazada. La cuenta continúa como cliente."
            });
        } catch (error) {
            if (conexion) await conexion.rollback();
            console.error("Error al rechazar solicitud:", error);

            return res.status(500).json({
                mensaje: "No fue posible rechazar la solicitud."
            });
        } finally {
            if (conexion) conexion.release();
        }
    }
);


/* ==========================================
   CONSULTAR TODOS LOS USUARIOS
========================================== */

app.get(
    "/api/admin/usuarios",
    verificarAdministrador,
    async (req, res) => {
        try {
            const [usuarios] = await db.execute(`
                SELECT
                    u.id_usuario,
                    u.nombre_usuario,
                    u.apellido_usuario,
                    u.correo_electronico,
                    u.estado,
                    u.fecha_registro,
                    r.nombre_rol AS rol,
                    s.estado AS estado_solicitud
                FROM usuarios u
                INNER JOIN roles r
                    ON u.id_rol = r.id_rol
                LEFT JOIN solicitudes_organizadores s
                    ON s.id_usuario = u.id_usuario
                ORDER BY
                    CASE r.nombre_rol
                        WHEN 'Administrador' THEN 1
                        WHEN 'Organizador' THEN 2
                        WHEN 'Cliente' THEN 3
                        ELSE 4
                    END,
                    u.fecha_registro DESC
            `);

            return res.json(usuarios);

        } catch (error) {
            console.error(
                "Error al consultar usuarios:",
                error.code || error.message
            );

            return res.status(500).json({
                mensaje: "No fue posible consultar los usuarios."
            });
        }
    }
);

app.listen(PORT, () => {
    console.log(`CulturaApp disponible en http://localhost:${PORT}`);
});