
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;

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

app.post("/api/eventos", async (req, res) => {
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
                precio
            ) VALUES (?, ?, ?, ?, 'Borrador', ?, ?, ?)`,
            [
                nombre_evento.trim(),
                descripcion_evento.trim(),
                fecha_evento,
                hora_evento,
                usuario.id,
                ubicacionId,
                precioNumero
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

app.put("/api/eventos/:id", async (req, res) => {
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
            `SELECT id_usuario
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
                 precio = ?
             WHERE id_evento = ?`,
            [
                nombre_evento.trim(),
                descripcion_evento.trim(),
                fecha_evento,
                hora_evento,
                ubicacionId,
                precioNumero,
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


app.listen(PORT, () => {
    console.log(`CulturaApp disponible en http://localhost:${PORT}`);
});


app.post("/api/auth/registro", async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            correo,
            contrasena,
            confirmarContrasena
        } = req.body;

        // Validar campos obligatorios
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
                mensaje: "Todos los campos son obligatorios."
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

        if (contrasena.length < 8) {
            return res.status(400).json({
                mensaje: "La contraseña debe tener al menos 8 caracteres."
            });
        }

        if (Buffer.byteLength(contrasena, "utf8") > 72) {
            return res.status(400).json({
                mensaje: "La contraseña es demasiado larga."
            });
        }

        if (contrasena !== confirmarContrasena) {
            return res.status(400).json({
                mensaje: "Las contraseñas no coinciden."
            });
        }

        // Verificar que el correo no esté registrado
        const [usuariosExistentes] = await db.execute(
            "SELECT id_usuario FROM usuarios WHERE correo_electronico = ?",
            [correoLimpio]
        );

        if (usuariosExistentes.length > 0) {
            return res.status(409).json({
                mensaje: "Este correo ya está registrado."
            });
        }

        // Buscar el rol Cliente desde la base de datos
        const [roles] = await db.execute(
            "SELECT id_rol FROM roles WHERE nombre_rol = ?",
            ["Cliente"]
        );

        if (roles.length === 0) {
            return res.status(500).json({
                mensaje: "No se encontró el rol de cliente."
            });
        }

        // Nunca guardar la contraseña original
        const hash = await bcrypt.hash(contrasena, 12);

        // Crear la cuenta como pendiente de activación
        await db.execute(
            `INSERT INTO usuarios
            (nombre_usuario, apellido_usuario, correo_electronico,
            contrasena, telefono, id_rol, estado)
            VALUES (?, ?, ?, ?, NULL, ?, 'Pendiente')`,
            [
                nombreLimpio,
                apellidoLimpio,
                correoLimpio,
                hash,
                roles[0].id_rol
            ]
        );

        return res.status(201).json({
            mensaje: "Cuenta creada. Está pendiente de activación."
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "Este correo ya está registrado."
            });
        }

        console.error("Error en registro:", error.code || error.message);

        return res.status(500).json({
            mensaje: "No fue posible crear la cuenta."
        });
    }
});

