
require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("../config/db");

async function crearUsuarioPrueba() {
    try {
        const correo = "demo@culturapp.local";
        const contrasena = "CulturaDemo2026!";

        const [existentes] = await db.execute(
            "SELECT id_usuario FROM usuarios WHERE correo_electronico = ?",
            [correo]
        );

        if (existentes.length > 0) {
            console.log("La cuenta de demostración ya existe.");
            return;
        }

        const [roles] = await db.execute(
            "SELECT id_rol FROM roles WHERE nombre_rol = ?",
            ["Cliente"]
        );

        if (roles.length === 0) {
            throw new Error("No se encontró el rol Cliente.");
        }

        const hash = await bcrypt.hash(contrasena, 12);

        await db.execute(
            `INSERT INTO usuarios
             (nombre_usuario, apellido_usuario, correo_electronico,
              contrasena, telefono, id_rol, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                "Usuario",
                "Demostración",
                correo,
                hash,
                null,
                roles[0].id_rol,
                "Activo"
            ]
        );

        console.log("Cuenta de demostración creada correctamente.");
        console.log("Correo:", correo);
        console.log("Contraseña:", contrasena);
    } catch (error) {
        console.error("No se pudo crear la cuenta:", error.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

crearUsuarioPrueba();
