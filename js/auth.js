
document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // INICIO DE SESIÓN
    // ==========================================
    const formularioLogin = document.getElementById("formularioLogin");

    if (formularioLogin) {
        const correo = document.getElementById("correo");
        const contrasena = document.getElementById("contrasena");
        const mensaje = document.getElementById("mensajeLogin");
        const boton = document.getElementById("botonLogin");

        formularioLogin.addEventListener("submit", async (evento) => {
            evento.preventDefault();

            mensaje.textContent = "";
            mensaje.style.color = "#b42318";

            boton.disabled = true;
            boton.textContent = "Verificando...";

            try {
                const respuesta = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        correo: correo.value.trim(),
                        contrasena: contrasena.value
                    })
                });

                const datos = await respuesta.json();

                if (!respuesta.ok) {
                    mensaje.textContent =
                        datos.mensaje ||
                        "No fue posible iniciar sesión.";
                    return;
                }

                mensaje.style.color = "#087443";
                mensaje.textContent =
                    `¡Bienvenido, ${datos.usuario.nombre}!`;

                
const destinos = {
    Cliente: "../index.html",
    Organizador: "gestionEventos.html",
    Administrador: "administracion.html"
};


                const destino = destinos[datos.usuario.rol];

                if (!destino) {
                    mensaje.style.color = "#b42318";
                    mensaje.textContent =
                        "El rol de la cuenta no es reconocido.";
                    return;
                }

                window.setTimeout(() => {
                    window.location.href = destino;
                }, 700);

            } catch (error) {
                console.error("Error en login:", error);

                mensaje.textContent =
                    "No se pudo conectar con el servidor.";

            } finally {
                boton.disabled = false;
                boton.textContent = "Iniciar sesión →";
            }
        });
    }

    // ==========================================
    // REGISTRO DE USUARIOS
    // ==========================================
    const formularioRegistro =
        document.getElementById("formularioRegistro");

    if (formularioRegistro) {
        const nombre = document.getElementById("nombre");
        const apellido = document.getElementById("apellido");
        const correo = document.getElementById("correoRegistro");

        const contrasena =
            document.getElementById("contrasenaRegistro");

        const confirmar =
            document.getElementById("confirmarContrasena");

        const terminos =
            document.getElementById("aceptaTerminos");

        const mensaje =
            document.getElementById("mensajeRegistro");

        const boton =
            document.getElementById("botonRegistro");

        // Opciones de tipo de registro
        const tipoCliente =
            document.getElementById("tipoCliente");

        const tipoOrganizador =
            document.getElementById("tipoOrganizador");

        const opcionesRegistro =
            document.querySelectorAll(
                'input[name="tipoRegistro"]'
            );

        // Campos adicionales del organizador
        const camposOrganizador =
            document.getElementById("camposOrganizador");

        const tipoOrganizadorDetalle =
            document.getElementById("tipoOrganizadorDetalle");

        const grupoNombreOrganizacion =
            document.getElementById("grupoNombreOrganizacion");

        const nombreOrganizacion =
            document.getElementById("nombreOrganizacion");

        const tipoActividades =
            document.getElementById("tipoActividades");

        const descripcionOrganizador =
            document.getElementById("descripcionOrganizador");

        // Mostrar u ocultar los campos del organizador
        function actualizarTipoRegistro() {
            const esOrganizador = tipoOrganizador.checked;

            camposOrganizador.hidden = !esOrganizador;

            tipoOrganizadorDetalle.required = esOrganizador;
            tipoActividades.required = esOrganizador;
            descripcionOrganizador.required = esOrganizador;

            actualizarNombreOrganizacion();
        }

        // Mostrar el nombre de la organización solo cuando corresponda
        function actualizarNombreOrganizacion() {
            const esOrganizador = tipoOrganizador.checked;

            const representaOrganizacion =
                tipoOrganizadorDetalle.value === "organizacion" ||
                tipoOrganizadorDetalle.value === "colectivo";

            const mostrarNombre =
                esOrganizador && representaOrganizacion;

            grupoNombreOrganizacion.hidden = !mostrarNombre;
            nombreOrganizacion.required = mostrarNombre;
        }

        // Escuchar los cambios en las opciones de registro
        opcionesRegistro.forEach((opcion) => {
            opcion.addEventListener(
                "change",
                actualizarTipoRegistro
            );
        });

        tipoOrganizadorDetalle.addEventListener(
            "change",
            actualizarNombreOrganizacion
        );

        // Establecer el estado inicial del formulario
        actualizarTipoRegistro();

        // ==========================================
        // ENVIAR FORMULARIO DE REGISTRO
        // ==========================================
        formularioRegistro.addEventListener(
            "submit",
            async (evento) => {
                evento.preventDefault();

                mensaje.textContent = "";
                mensaje.style.color = "#b42318";

                // Validar que las contraseñas coincidan
                if (contrasena.value !== confirmar.value) {
                    mensaje.textContent =
                        "Las contraseñas no coinciden.";

                    confirmar.focus();
                    return;
                }

                // Validar aceptación de términos
                if (!terminos.checked) {
                    mensaje.textContent =
                        "Debes aceptar los términos para continuar.";

                    return;
                }

                // Evitar el envío repetido
                boton.disabled = true;
                boton.textContent = "Creando cuenta...";

                try {
                    const respuesta = await fetch(
                        "/api/auth/registro",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            credentials: "same-origin",
                            body: JSON.stringify({
    nombre: nombre.value.trim(),
    apellido: apellido.value.trim(),
    correo: correo.value.trim(),
    contrasena: contrasena.value,
    confirmarContrasena: confirmar.value,

    tipoRegistro: tipoOrganizador.checked
        ? "organizador"
        : "cliente",

    tipoOrganizadorDetalle: tipoOrganizadorDetalle.value,
    nombreOrganizacion: nombreOrganizacion.value.trim(),
    tipoActividades: tipoActividades.value,
    descripcionOrganizador: descripcionOrganizador.value.trim()
})
                        }
                    );

                    const datos = await respuesta.json();

                    if (!respuesta.ok) {
                        mensaje.textContent =
                            datos.mensaje ||
                            "No fue posible crear la cuenta.";

                        return;
                    }

                    mensaje.style.color = "#087443";
mensaje.textContent =
    datos.mensaje ||
    "Registro realizado correctamente.";

formularioRegistro.reset();

                    // Restaurar los campos al estado inicial
                    actualizarTipoRegistro();

                    window.setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1800);

                } catch (error) {
                    console.error(
                        "Error en registro:",
                        error
                    );

                    mensaje.textContent =
                        "No se pudo conectar con el servidor.";

                } finally {
                    boton.disabled = false;
                    boton.textContent = "Crear cuenta →";
                }
            }
        );
    }
});
