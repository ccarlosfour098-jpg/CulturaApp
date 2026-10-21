
/* =========================================
   CULTURAAPP - MODO CLARO Y MODO OSCURO
========================================= */

(() => {
    const claveTema = "culturapp-tema";
    const raiz = document.documentElement;

    function obtenerTemaGuardado() {
        try {
            return localStorage.getItem(claveTema);
        } catch (error) {
            return null;
        }
    }

    function aplicarTema(tema) {
        const modoOscuro = tema === "oscuro";

        raiz.dataset.tema = modoOscuro ? "oscuro" : "claro";

        const boton = document.getElementById("botonTema");
        const icono = document.getElementById("iconoTema");
        const texto = boton?.querySelector(".texto-tema");

        if (boton) {
            boton.setAttribute(
                "aria-label",
                modoOscuro ? "Activar modo claro" : "Activar modo oscuro"
            );

            boton.setAttribute(
                "title",
                modoOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
            );
        }

        if (icono) {
            icono.textContent = modoOscuro ? "☀️" : "🌙";
        }

        if (texto) {
            texto.textContent = modoOscuro ? "Modo claro" : "Modo oscuro";
        }
    }

    // Recuperar el tema elegido anteriormente.
    let tema = obtenerTemaGuardado();

    if (tema !== "claro" && tema !== "oscuro") {
        tema = "claro";
    }

    aplicarTema(tema);

    // Escuchar el botón cuando cargue la página.
    document.addEventListener("DOMContentLoaded", () => {
        const boton = document.getElementById("botonTema");

        if (!boton) {
            return;
        }

        boton.addEventListener("click", () => {
            const siguienteTema =
                raiz.dataset.tema === "oscuro" ? "claro" : "oscuro";

            aplicarTema(siguienteTema);

            try {
                localStorage.setItem(claveTema, siguienteTema);
            } catch (error) {
                console.warn(
                    "No fue posible guardar la preferencia del tema."
                );
            }
        });
    });
})();
