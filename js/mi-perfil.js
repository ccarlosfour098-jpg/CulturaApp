
document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formularioPerfil");
    const mensaje = document.getElementById("mensajePerfil");
    const botonGuardar = document.getElementById("guardarPerfil");

    const campos = {
        nombre: document.getElementById("nombre"),
        apellido: document.getElementById("apellido"),
        correo: document.getElementById("correo"),
        telefono: document.getElementById("telefono")
    };

    function mostrarMensaje(texto, error = false) {
        mensaje.textContent = texto;
        mensaje.classList.toggle("error", error);
        mensaje.classList.toggle("exito", !error);
    }

    function actualizarResumen(usuario) {
        const nombreCompleto =
            `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim();

        document.getElementById("resumenNombre").textContent = nombreCompleto;
        document.getElementById("resumenCorreo").textContent = usuario.correo || "";
        document.getElementById("resumenRol").textContent = usuario.rol || "";
        document.getElementById("avatarGrande").textContent =
            (usuario.nombre || "U").charAt(0).toLocaleUpperCase("es");

        document.getElementById("fechaRegistro").textContent =
            usuario.fecha_registro
                ? `Miembro desde ${new Date(usuario.fecha_registro).toLocaleDateString("es-CO")}`
                : "";
    }

    async function cargarPerfil() {
        try {
            const respuesta = await fetch("/api/perfil", {
                credentials: "same-origin"
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                if (respuesta.status === 401) {
                    window.location.replace("/paginas/login.html");
                    return;
                }

                throw new Error(datos.mensaje || "No se pudo cargar el perfil.");
            }

            const usuario = datos.usuario;

            campos.nombre.value = usuario.nombre_usuario || "";
            campos.apellido.value = usuario.apellido_usuario || "";
            campos.correo.value = usuario.correo_electronico || "";
            campos.telefono.value = usuario.telefono || "";

            actualizarResumen({
                nombre: usuario.nombre_usuario,
                apellido: usuario.apellido_usuario,
                correo: usuario.correo_electronico,
                rol: usuario.rol,
                fecha_registro: usuario.fecha_registro
            });
        } catch (error) {
            mostrarMensaje(error.message, true);
        }
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        botonGuardar.disabled = true;
        botonGuardar.textContent = "Guardando...";

        try {
            const respuesta = await fetch("/api/perfil", {
                method: "PUT",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    nombre: campos.nombre.value.trim(),
                    apellido: campos.apellido.value.trim(),
                    correo: campos.correo.value.trim(),
                    telefono: campos.telefono.value.trim()
                })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.mensaje || "No se pudieron guardar los cambios.");
            }

            actualizarResumen(datos.usuario);
            mostrarMensaje(datos.mensaje || "Perfil actualizado correctamente.");
        } catch (error) {
            mostrarMensaje(error.message, true);
        } finally {
            botonGuardar.disabled = false;
            botonGuardar.textContent = "Guardar cambios";
        }
    });

    
    const formularioContrasena = document.getElementById("formularioContrasena");
    const mensajeContrasena = document.getElementById("mensajeContrasena");
    const botonCambiarContrasena = document.getElementById("cambiarContrasena");

    if (formularioContrasena) {
        formularioContrasena.addEventListener("submit", async (evento) => {
            evento.preventDefault();

            const contrasenaActual =
                document.getElementById("contrasenaActual").value;
            const nuevaContrasena =
                document.getElementById("nuevaContrasena").value;
            const confirmarContrasena =
                document.getElementById("confirmarContrasena").value;

            if (mensajeContrasena) {
                mensajeContrasena.textContent = "";
                mensajeContrasena.classList.remove("error", "exito");
            }

            if (botonCambiarContrasena) {
                botonCambiarContrasena.disabled = true;
                botonCambiarContrasena.textContent = "Actualizando...";
            }

            try {
                const respuesta = await fetch("/api/perfil/cambiar-contrasena", {
                    method: "PUT",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        contrasenaActual,
                        nuevaContrasena,
                        confirmarContrasena
                    })
                });

                const datos = await respuesta.json();

                if (!respuesta.ok) {
                    throw new Error(
                        datos.mensaje || "No se pudo actualizar la contraseña."
                    );
                }

                if (mensajeContrasena) {
                    mensajeContrasena.textContent =
                        datos.mensaje || "Contraseña actualizada correctamente.";
                    mensajeContrasena.classList.add("exito");
                }

                formularioContrasena.reset();

            } catch (error) {
                if (mensajeContrasena) {
                    mensajeContrasena.textContent = error.message;
                    mensajeContrasena.classList.add("error");
                } else {
                    alert(error.message);
                }
            } finally {
                if (botonCambiarContrasena) {
                    botonCambiarContrasena.disabled = false;
                    botonCambiarContrasena.textContent = "Cambiar contraseña";
                }
            }
        });
    }

    cargarPerfil();
});
