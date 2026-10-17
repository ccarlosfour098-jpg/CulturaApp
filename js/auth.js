
document.addEventListener("DOMContentLoaded", () => {
    // LOGIN
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
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        correo: correo.value.trim(),
                        contrasena: contrasena.value
                    })
                });

                const datos = await respuesta.json();

                if (!respuesta.ok) {
                    mensaje.textContent = datos.mensaje ||
                        "No fue posible iniciar sesión.";
                    return;
                }

                mensaje.style.color = "#087443";
                mensaje.textContent =
                    `¡Bienvenido, ${datos.usuario.nombre}!`;

                const destinos = {
                    Cliente: "../index.html",
                    Organizador: "gestionEventos.html",
                    Administrador: "gestionUsuarios.html"
                };

                const destino = destinos[datos.usuario.rol];

                if (!destino) {
                    mensaje.style.color = "#b42318";
                    mensaje.textContent = "El rol de la cuenta no es reconocido.";
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

    // REGISTRO
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
        const terminos = document.getElementById("aceptaTerminos");
        const mensaje = document.getElementById("mensajeRegistro");
        const boton = document.getElementById("botonRegistro");

        formularioRegistro.addEventListener("submit", async (evento) => {
            evento.preventDefault();

            mensaje.textContent = "";
            mensaje.style.color = "#b42318";

            if (contrasena.value !== confirmar.value) {
                mensaje.textContent = "Las contraseñas no coinciden.";
                confirmar.focus();
                return;
            }

            if (!terminos.checked) {
                mensaje.textContent =
                    "Debes aceptar los términos para continuar.";
                return;
            }

            boton.disabled = true;
            boton.textContent = "Creando cuenta...";

            try {
                const respuesta = await fetch("/api/auth/registro", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        nombre: nombre.value.trim(),
                        apellido: apellido.value.trim(),
                        correo: correo.value.trim(),
                        contrasena: contrasena.value,
                        confirmarContrasena: confirmar.value
                    })
                });

                const datos = await respuesta.json();

                if (!respuesta.ok) {
                    mensaje.textContent = datos.mensaje ||
                        "No fue posible crear la cuenta.";
                    return;
                }

                mensaje.style.color = "#087443";
                mensaje.textContent = datos.mensaje;

                formularioRegistro.reset();

                window.setTimeout(() => {
                    window.location.href = "login.html";
                }, 1800);

            } catch (error) {
                console.error("Error en registro:", error);
                mensaje.textContent =
                    "No se pudo conectar con el servidor.";
            } finally {
                boton.disabled = false;
                boton.textContent = "Crear cuenta →";
            }
        });
    }
});
