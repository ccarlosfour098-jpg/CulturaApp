
document.addEventListener("DOMContentLoaded", () => {
    const listaFavoritos = document.getElementById("listaFavoritos");
    const contadorFavoritos = document.getElementById("contadorFavoritos");
    const mensajeFavoritos = document.getElementById("mensajeFavoritos");

    const notificacion = document.getElementById("notificacionCulturApp");
    const notificacionIcono = document.getElementById("notificacionIcono");
    const notificacionTitulo = document.getElementById("notificacionTitulo");
    const notificacionMensaje = document.getElementById("notificacionMensaje");
    const cerrarNotificacion = document.getElementById("cerrarNotificacion");

    function mostrarNotificacion(titulo, mensaje, tipo = "exito") {
        if (!notificacion) return;

        notificacionTitulo.textContent = titulo;
        notificacionMensaje.textContent = mensaje;
        notificacionIcono.textContent = tipo === "error" ? "!" : "✓";
        notificacion.dataset.tipo = tipo;
        notificacion.hidden = false;
    }

    cerrarNotificacion?.addEventListener("click", () => {
        notificacion.hidden = true;
    });

    function mostrarMensaje(mensaje) {
        mensajeFavoritos.textContent = mensaje;
        mensajeFavoritos.hidden = false;
    }

    function formatearFecha(fecha, hora) {
        if (!fecha) return "Fecha por confirmar";

        const fechaFormateada = new Date(fecha).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC"
        });

        const horaFormateada = hora
            ? String(hora).slice(0, 5)
            : "";

        return horaFormateada
            ? `${fechaFormateada} • ${horaFormateada}`
            : fechaFormateada;
    }

    async function cargarFavoritos() {
        listaFavoritos.replaceChildren();
        mensajeFavoritos.hidden = true;
        contadorFavoritos.textContent = "Cargando favoritos...";

        try {
            const respuesta = await fetch("/api/favoritos", {
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            });

            if (respuesta.status === 401 || respuesta.status === 403) {
                contadorFavoritos.textContent = "Inicia sesión para continuar";
                mostrarMensaje("Inicia sesión con tu cuenta de cliente para consultar tus eventos favoritos.");
                return;
            }

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.mensaje ||
                    datos.error ||
                    "No fue posible consultar tus favoritos."
                );
            }

            if (!Array.isArray(datos) || datos.length === 0) {
                contadorFavoritos.textContent = "0 eventos guardados";
                mostrarMensaje("Todavía no tienes favoritos. Explora los eventos de Popayán y guarda los que te interesen.");
                return;
            }

            contadorFavoritos.textContent =
                `${datos.length} ${datos.length === 1 ? "evento guardado" : "eventos guardados"}`;

            datos.forEach(evento => {
                const tarjeta = document.createElement("article");
                tarjeta.className = "tarjeta-evento";

                const imagen = document.createElement("img");
                imagen.className = "imagen-evento";
                imagen.alt = `Imagen de ${evento.nombre_evento || "evento"}`;
                imagen.src = evento.imagen_url || "../img/evento1.jpg";

                const informacion = document.createElement("div");
                informacion.className = "informacion-evento";

                const etiquetas = document.createElement("div");
                etiquetas.className = "etiquetas";

                const categoria = document.createElement("span");
                categoria.className = "etiqueta-evento";
                categoria.textContent = "Favorito";

                const precio = document.createElement("span");
                precio.className = "etiqueta-gratis";
                precio.textContent = Number(evento.precio) === 0
                    ? "Entrada libre"
                    : `$${Number(evento.precio).toLocaleString("es-CO")} COP`;

                etiquetas.append(categoria, precio);

                const fecha = document.createElement("p");
                fecha.className = "dato-evento";
                fecha.textContent = formatearFecha(
                    evento.fecha_evento,
                    evento.hora_evento
                );

                const nombre = document.createElement("h3");
                nombre.textContent = evento.nombre_evento || "Evento sin nombre";

                const lugar = document.createElement("p");
                lugar.className = "dato-evento";
                lugar.textContent = evento.nombre_lugar || "";

                const pie = document.createElement("div");
                pie.className = "pie-tarjeta";

                const botonDetalles = document.createElement("button");
                botonDetalles.type = "button";
                botonDetalles.className = "btn-detalles";
                botonDetalles.textContent = "Ver detalles";

                botonDetalles.addEventListener("click", () => {
                    window.location.href =
                        `detallesEventos.html?id=${encodeURIComponent(evento.id_evento)}`;
                });

                const botonQuitar = document.createElement("button");
                botonQuitar.type = "button";
                botonQuitar.className = "btn-favorito";
                botonQuitar.textContent = "♥ Quitar";
                botonQuitar.setAttribute(
                    "aria-label",
                    `Quitar ${evento.nombre_evento} de favoritos`
                );

                botonQuitar.addEventListener("click", async () => {
                    try {
                        botonQuitar.disabled = true;

                        const respuestaEliminar = await fetch(
                            `/api/favoritos/${encodeURIComponent(evento.id_evento)}`,
                            {
                                method: "DELETE",
                                credentials: "same-origin",
                                headers: {
                                    Accept: "application/json"
                                }
                            }
                        );

                        const resultado = await respuestaEliminar.json();

                        if (respuestaEliminar.status === 401 ||
                            respuestaEliminar.status === 403) {
                            mostrarNotificacion(
                                "Inicia sesión",
                                "Necesitas una cuenta de cliente para gestionar tus favoritos.",
                                "error"
                            );
                            return;
                        }

                        if (!respuestaEliminar.ok) {
                            throw new Error(
                                resultado.mensaje ||
                                resultado.error ||
                                "No fue posible quitar el favorito."
                            );
                        }

                        tarjeta.remove();

                        const restantes =
                            listaFavoritos.querySelectorAll(".tarjeta-evento").length;

                        contadorFavoritos.textContent =
                            `${restantes} ${restantes === 1 ? "evento guardado" : "eventos guardados"}`;

                        if (restantes === 0) {
                            mostrarMensaje("Ya no tienes eventos guardados. Explora la agenda para encontrar nuevas actividades.");
                        }

                        mostrarNotificacion(
                            "Favorito eliminado",
                            `${evento.nombre_evento} se quitó de tus favoritos.`
                        );
                    } catch (error) {
                        console.error("Error al quitar favorito:", error);

                        mostrarNotificacion(
                            "No se pudo quitar",
                            error.message || "Inténtalo nuevamente.",
                            "error"
                        );
                    } finally {
                        botonQuitar.disabled = false;
                    }
                });

                pie.append(botonDetalles, botonQuitar);
                informacion.append(etiquetas, fecha, nombre, lugar, pie);
                tarjeta.append(imagen, informacion);
                listaFavoritos.append(tarjeta);
            });

        } catch (error) {
            console.error("Error al cargar favoritos:", error);
            contadorFavoritos.textContent = "Error al cargar";
            mostrarMensaje("No fue posible cargar tus favoritos. Recarga la página e inténtalo nuevamente.");
        }
    }

    cargarFavoritos();
});
