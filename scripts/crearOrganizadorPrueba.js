
require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("../config/db");

async function crearOrganizador() {
    const correo = "organizador.demo@culturapp.local";
    const contrasena = "OrganizadorDemo2026!";

    try {
        const [existentes] = await db.execute(
            "SELECT id_usuario FROM usuarios WHERE correo_electronico = ?",
            [correo]
        );

        if (existentes.length > 0) {
            console.log("El organizador de prueba ya existe.");
            return;
        }

        const [roles] = await db.execute(
            "SELECT id_rol FROM roles WHERE nombre_rol = ?",
            ["Organizador"]
        );

        if (roles.length === 0) {
            throw new Error("No existe el rol Organizador.");
        }

        const hash = await bcrypt.hash(contrasena, 12);

        await db.execute(
            `INSERT INTO usuarios (
                nombre_usuario,
                apellido_usuario,
                correo_electronico,
                contrasena,
                id_rol,
                estado
            ) VALUES (?, ?, ?, ?, ?, 'Activo')`,
            [
                "Organizador",
                "Demo",
                correo,
                hash,
                roles[0].id_rol
            ]
        );

        console.log("Organizador de prueba creado correctamente.");
        console.log("Correo:", correo);
        console.log("Contraseña:", contrasena);

    } catch (error) {
        console.error("Error:", error.code || error.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

crearOrganizador();
