
document.addEventListener("DOMContentLoaded", async () => {
    const parametros = new URLSearchParams(window.location.search);
    const idEvento = Number(parametros.get("id"));

    const estadoEvento = document.getElementById("estadoEvento");
    const detalleEvento = document.getElementById("detalleEvento");
    const listaResenas = document.getElementById("listaResenas");
    const mensajeResenas = document.getElementById("mensajeResenas");
    const formulario = document.getElementById("formularioResena");
    const mensajeFormulario = document.getElementById("mensajeFormulario");

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
        estadoEvento.textContent = "No se recibió un identificador de evento válido.";
        formulario.hidden = true;
        return;
    }

    function escaparHTML(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, caracter => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[caracter]);
    }

    function mostrarEstrellas(calificacion) {
        const valor = Number(calificacion) || 0;
        const completas = Math.round(valor);
        return "★".repeat(completas) + "☆".repeat(5 - completas);
    }

    function formatearFecha(fecha) {
        if (!fecha) return "Fecha no disponible";

        const partes = String(fecha).slice(0, 10).split("-");
        if (partes.length !== 3) return fecha;

        const fechaLocal = new Date(
            Number(partes[0]),
            Number(partes[1]) - 1,
            Number(partes[2])
        );

        return fechaLocal.toLocaleDateString("es-CO", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function formatearHora(hora) {
        if (!hora) return "Hora no disponible";

        const partes = String(hora).split(":");
        if (partes.length < 2) return hora;

        const fecha = new Date();
        fecha.setHours(Number(partes[0]), Number(partes[1]), 0, 0);

        return fecha.toLocaleTimeString("es-CO", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    }

    async function cargarEvento() {
        const respuesta = await fetch("/api/eventos");
        if (!respuesta.ok) throw new Error("No se pudieron consultar los eventos.");

        const eventos = await respuesta.json();
        const evento = eventos.find(
            item => Number(item.id_evento) === idEvento
        );

        if (!evento) {
            throw new Error("Este evento no existe en la base de datos.");
        }

        document.getElementById("nombreEvento").textContent =
            evento.nombre_evento;

        document.getElementById("categoriaEvento").textContent =
            evento.categorias || "Evento cultural";

        document.getElementById("ubicacionEvento").textContent =
            [evento.nombre_lugar, evento.direccion, evento.barrio, evento.ciudad]
                .filter(Boolean).join(" · ");

        document.getElementById("fechaEvento").textContent =
            `${formatearFecha(evento.fecha_evento)} · ${formatearHora(evento.hora_evento)}`;

        document.getElementById("organizadorEvento").textContent =
            `Organiza: ${evento.organizador || "No especificado"}`;

        document.getElementById("precioEvento").textContent =
            Number(evento.precio) === 0
                ? "Entrada gratuita"
                : `Entrada: $${Number(evento.precio).toLocaleString("es-CO")} COP`;

        document.getElementById("descripcionEvento").textContent =
            evento.descripcion_evento || "No hay descripción disponible.";

        estadoEvento.hidden = true;
        detalleEvento.hidden = false;
    }

    async function cargarResenas() {
        const respuesta = await fetch(`/api/eventos/${idEvento}/resenas`);
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.mensaje || "No se pudieron cargar las reseñas.");
        }

        document.getElementById("promedioResenas").textContent =
            datos.promedio === null ? "—" : `${datos.promedio}/5`;

        const estrellas = document.getElementById("estrellasPromedio");
        estrellas.textContent = datos.promedio === null
            ? "☆☆☆☆☆"
            : mostrarEstrellas(datos.promedio);

        estrellas.setAttribute(
            "aria-label",
            datos.promedio === null
                ? "Sin calificaciones"
                : `Promedio de ${datos.promedio} sobre 5 estrellas`
        );

        document.getElementById("totalResenas").textContent =
            datos.total_resenas === 1
                ? "1 reseña"
                : `${datos.total_resenas} reseñas`;

        if (!datos.resenas.length) {
            listaResenas.innerHTML =
                "<p>Sé la primera persona en compartir su experiencia.</p>";
            return;
        }

        listaResenas.innerHTML = datos.resenas.map(resena => `
            <article class="tarjeta-resena">
                <h4>${escaparHTML(resena.nombre_usuario)} ${escaparHTML(resena.apellido_usuario)}</h4>
                <p class="estrellas-resena" aria-label="${Number(resena.calificacion)} de 5 estrellas">
                    ${mostrarEstrellas(resena.calificacion)}
                </p>
                <p>${escaparHTML(resena.comentario)}</p>
                <small>${escaparHTML(formatearFecha(resena.fecha_resena))}</small>
            </article>
        `).join("");
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        mensajeFormulario.textContent = "Publicando reseña...";

        const calificacion = Number(
            document.getElementById("calificacionResena").value
        );
        const comentario =
            document.getElementById("comentarioResena").value.trim();

        try {
            const respuesta = await fetch(`/api/eventos/${idEvento}/resenas`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({ calificacion, comentario })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.mensaje || "No se pudo publicar la reseña.");
            }

            mensajeFormulario.textContent = datos.mensaje;
            formulario.reset();
            await cargarResenas();

        } catch (error) {
            mensajeFormulario.textContent = error.message;
        }
    });

    try {
        await cargarEvento();
        await cargarResenas();
    } catch (error) {
        estadoEvento.hidden = false;
        estadoEvento.textContent = error.message;
        detalleEvento.hidden = true;
        console.error("Error en los detalles:", error);
    }
});
