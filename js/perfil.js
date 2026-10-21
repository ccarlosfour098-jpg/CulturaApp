
document.addEventListener("DOMContentLoaded", () => {
    const enlaceIngresar = document.getElementById("enlaceIngresar");
    const contenedor = document.getElementById("contenedorPerfil");
    const botonPerfil = document.getElementById("botonPerfil");
    const panel = document.getElementById("panelPerfil");
    const botonCerrarSesion = document.getElementById("botonCerrarSesion");

    const nombreUsuario = document.getElementById("nombreUsuario");
    const rolUsuario = document.getElementById("rolUsuario");
    const avatarUsuario = document.getElementById("avatarUsuario");

    const nombrePanel = document.getElementById("nombrePanel");
    const correoPanel = document.getElementById("correoPanel");
    const rolPanel = document.getElementById("rolPanel");
    const avatarPanel = document.getElementById("avatarPanel");

    const enlaceOrganizador = document.getElementById("enlaceOrganizador");
    const enlaceAdministrador = document.getElementById("enlaceAdministrador");
    const enlaceMiPerfil = document.getElementById("enlaceMiPerfil");
    const enlaceFavoritos = document.getElementById("enlaceFavoritos");
const enlaceGestionEventos = document.getElementById("enlaceGestionEventos");
const enlaceGestionAdmin = document.getElementById("enlaceGestionAdmin");

    if (
        !enlaceIngresar || !contenedor || !botonPerfil ||
        !panel || !botonCerrarSesion
    ) {
        console.error("No se encontraron los elementos del perfil.");
        return;
    }

    function abrirPanel() {
        panel.hidden = false;
        contenedor.classList.add("abierto");
        botonPerfil.setAttribute("aria-expanded", "true");

        requestAnimationFrame(() => {
            panel.classList.add("visible");
        });
    }

    function cerrarPanel() {
        panel.classList.remove("visible");
        contenedor.classList.remove("abierto");
        botonPerfil.setAttribute("aria-expanded", "false");

        window.setTimeout(() => {
            if (!panel.classList.contains("visible")) {
                panel.hidden = true;
            }
        }, 180);
    }

    function alternarPanel() {
        if (panel.hidden) {
            abrirPanel();
        } else {
            cerrarPanel();
        }
    }

    // Mostrar u ocultar el panel con el botón.
    botonPerfil.addEventListener("click", alternarPanel);

    // También permitir abrirlo al pasar el cursor.
    contenedor.addEventListener("mouseenter", abrirPanel);

    contenedor.addEventListener("mouseleave", () => {
        if (window.matchMedia("(hover: hover)").matches) {
            cerrarPanel();
        }
    });

    // Cerrar al pulsar fuera del perfil.
    document.addEventListener("click", (evento) => {
        if (!contenedor.contains(evento.target)) {
            cerrarPanel();
        }
    });

    // Cerrar con Escape.
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            cerrarPanel();
            botonPerfil.focus();
        }
    });

    // Consultar la sesión real del servidor.
    async function cargarPerfil() {
        try {
            const respuesta = await fetch("/api/auth/me", {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            });

            if (respuesta.status === 401) {
                enlaceIngresar.hidden = false;
                contenedor.hidden = true;
                return;
            }

            if (!respuesta.ok) {
                throw new Error("No fue posible consultar la sesión.");
            }

            const datos = await respuesta.json();
            const usuario = datos.usuario;

            if (!datos.autenticado || !usuario) {
                enlaceIngresar.hidden = false;
                contenedor.hidden = true;
                return;
            }

            const nombreCompleto = [
                usuario.nombre,
                usuario.apellido
            ].filter(Boolean).join(" ");

            const nombre = nombreCompleto || "Usuario";
            const inicial = nombre.charAt(0).toLocaleUpperCase("es");
            const rol = usuario.rol;

            nombreUsuario.textContent = nombre;
            rolUsuario.textContent = rol;

            nombrePanel.textContent = nombre;
            correoPanel.textContent = usuario.correo || "";
            rolPanel.textContent = rol;

            avatarUsuario.textContent = inicial;
            avatarPanel.textContent = inicial;

            // Ocultar las opciones específicas del menú y del perfil.

if (enlaceOrganizador) enlaceOrganizador.hidden = true;
if (enlaceAdministrador) enlaceAdministrador.hidden = true;

if (enlaceFavoritos) enlaceFavoritos.hidden = true;
if (enlaceGestionEventos) enlaceGestionEventos.hidden = true;
if (enlaceGestionAdmin) enlaceGestionAdmin.hidden = true;



            // Mostrar las opciones correspondientes al rol.
            if (rol === "Cliente") {
                if (enlaceFavoritos) enlaceFavoritos.hidden = false;

            } else if (rol === "Organizador") {
                if (enlaceOrganizador) enlaceOrganizador.hidden = false;
                if (enlaceGestionEventos) enlaceGestionEventos.hidden = false;

            } else if (rol === "Administrador") {
                if (enlaceAdministrador) enlaceAdministrador.hidden = false;
                if (enlaceGestionAdmin) enlaceGestionAdmin.hidden = false;

            } else {
                throw new Error("El rol de la cuenta no es reconocido.");
            }


            enlaceIngresar.hidden = true;
            contenedor.hidden = false;
            panel.hidden = true;
            panel.classList.remove("visible");
            contenedor.classList.remove("abierto");
            botonPerfil.setAttribute("aria-expanded", "false");

        } catch (error) {
            console.error("Error al cargar el perfil:", error);
            // No inventar una sesión ni mostrar datos falsos.
            enlaceIngresar.hidden = false;
            contenedor.hidden = true;
        }
    }

    // Cerrar la sesión en el servidor.
    botonCerrarSesion.addEventListener("click", async () => {
        botonCerrarSesion.disabled = true;

        try {
            const respuesta = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            });

            if (!respuesta.ok) {
                throw new Error("No fue posible cerrar la sesión.");
            }

            window.location.replace("/paginas/login.html");

        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("No fue posible cerrar sesión. Inténtalo de nuevo.");
            botonCerrarSesion.disabled = false;
        }
    });

    
    // Abrir la página Mi perfil.
    if (enlaceMiPerfil) {
        enlaceMiPerfil.addEventListener("click", (evento) => {
            evento.preventDefault();
            window.location.href = "/paginas/perfil.html";
        });
    }


    cargarPerfil();
});
