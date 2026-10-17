
/**
 * CulturaApp - Validaciones de formularios
 */

// Validar que un correo tenga un formato básico correcto
function validarCorreo(correo) {
    const expresion = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return expresion.test(correo.trim());
}

// Validar la longitud mínima de una contraseña
function validarContrasena(contrasena) {
    return typeof contrasena === "string"
        && contrasena.length >= 8;
}

// Validar que un campo no esté vacío
function validarCampoObligatorio(valor) {
    return typeof valor === "string"
        && valor.trim().length > 0;
}

// Validar que dos contraseñas coincidan
function coincidenContrasenas(contrasena, confirmacion) {
    return contrasena === confirmacion;
}

// Obtener un mensaje de error para el correo
function obtenerErrorCorreo(correo) {
    if (!validarCampoObligatorio(correo)) {
        return "El correo electrónico es obligatorio.";
    }

    if (!validarCorreo(correo)) {
        return "Ingresa un correo electrónico válido.";
    }

    return "";
}

// Obtener un mensaje de error para la contraseña
function obtenerErrorContrasena(contrasena) {
    if (!validarCampoObligatorio(contrasena)) {
        return "La contraseña es obligatoria.";
    }

    if (!validarContrasena(contrasena)) {
        return "La contraseña debe tener al menos 8 caracteres.";
    }

    return "";
}
