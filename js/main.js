
document.addEventListener("DOMContentLoaded", () => {

    
    // Sistema de notificaciones personalizadas de CulturaApp
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


    // Elementos principales del catálogo
    const buscador = document.querySelector(".input-busqueda");
    const selectorSector = document.querySelector(".select-sector");
    const botonExplorar = document.querySelector(".btn-explorar");

    const botonesCategorias = document.querySelectorAll(".categoria");
    const botonesFiltros = document.querySelectorAll(".filtro");

    const contenedorEventos = document.querySelector(".eventos");
    const tituloEventos = document.querySelector(".titulo-seccion h2");
    const descripcionEventos = document.querySelector(".titulo-seccion p");

    if (!contenedorEventos) {
        console.error("No se encontró el contenedor de eventos.");
        return;
    }

    // Guardamos las tarjetas originales para poder filtrarlas.
    // Las tarjetas se actualizarán cuando lleguen los eventos de MySQL.
let tarjetas = [];

    let categoriaSeleccionada = "Todas";
    let filtroSeleccionado = "Próximos";

    
    // Consultar los favoritos guardados por el usuario
    async function obtenerFavoritos() {
        try {
            const respuesta = await fetch("/api/favoritos", {
                credentials: "same-origin"
            });

            if (!respuesta.ok) {
                return [];
            }

            const favoritos = await respuesta.json();

            return Array.isArray(favoritos)
                ? favoritos.map(favorito => Number(favorito.id_evento))
                : [];
        } catch (error) {
            console.error("Error al consultar favoritos:", error);
            return [];
        }
    }



    // Cargar los eventos desde el servidor.
    async function cargarEventos() {
        try {
            const respuesta = await fetch("/api/eventos");

            if (!respuesta.ok) {
                throw new Error("No fue posible consultar los eventos.");
            }

            const eventos = await respuesta.json();
            const favoritosGuardados = await obtenerFavoritos();

            // Mostrar eventos activos o publicados, excluyendo borradores.
const eventosPublicados = eventos.filter(
    evento => ["Publicado", "Activo"].includes(evento.estado)
);

            contenedorEventos.replaceChildren();

            eventosPublicados.forEach(evento => {
                const tarjeta = document.createElement("article");
                tarjeta.className = "tarjeta-evento";

                const imagen = document.createElement("img");
                imagen.className = "imagen-evento";
                imagen.alt = `Imagen de ${evento.nombre_evento}`;
                imagen.src = evento.imagen_url || "img/evento1.jpg";

                const informacion = document.createElement("div");
                informacion.className = "informacion-evento";

                const etiquetas = document.createElement("div");
                etiquetas.className = "etiquetas";

                const categoria = document.createElement("span");
                categoria.className = "etiqueta-evento";
                categoria.textContent = evento.categorias || "Cultura";

                const precio = document.createElement("span");
                precio.className = "etiqueta-gratis";
                precio.textContent = Number(evento.precio) === 0
                    ? "Entrada libre"
                    : `$${Number(evento.precio).toLocaleString("es-CO")} COP`;

                etiquetas.append(categoria, precio);

                const fecha = document.createElement("p");
                fecha.className = "dato-evento";
                const fechaEvento = new Date(evento.fecha_evento);

const fechaFormateada = fechaEvento.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
});

const horaFormateada = evento.hora_evento
    ? String(evento.hora_evento).slice(0, 5)
    : "";

fecha.textContent = horaFormateada
    ? `${fechaFormateada} • ${horaFormateada}`
    : fechaFormateada;

                const nombre = document.createElement("h3");
                nombre.textContent = evento.nombre_evento;

                const lugar = document.createElement("p");
                lugar.className = "dato-evento";
                lugar.textContent = evento.nombre_lugar || "";

                const pie = document.createElement("div");
                pie.className = "pie-tarjeta";

                const organizador = document.createElement("span");
                organizador.textContent = evento.organizador || "";

                const boton = document.createElement("button");
                boton.type = "button";
                boton.className = "btn-detalles";
                boton.dataset.idEvento = evento.id_evento;
                boton.textContent = "Ver detalles";

                boton.addEventListener("click", () => {
                    window.location.href =
                        `/paginas/detallesEventos.html?id=${encodeURIComponent(evento.id_evento)}`;
                });

                
const botonFavorito = document.createElement("button");
botonFavorito.type = "button";
botonFavorito.className = "btn-favorito";
const yaEsFavorito = favoritosGuardados.includes(
    Number(evento.id_evento)
);

botonFavorito.textContent = yaEsFavorito
    ? "♥ Guardado"
    : "♡ Favorito";
botonFavorito.setAttribute(
    "aria-pressed",
    String(yaEsFavorito)
);
botonFavorito.setAttribute(
    "aria-label",
    yaEsFavorito
        ? `Quitar ${evento.nombre_evento} de favoritos`
        : `Agregar ${evento.nombre_evento} a favoritos`
);botonFavorito.setAttribute("aria-label", `Agregar ${evento.nombre_evento} a favoritos`);


botonFavorito.addEventListener("click", async () => {
    try {
        botonFavorito.disabled = true;

        const estabaGuardado =
            botonFavorito.getAttribute("aria-pressed") === "true";

        const respuesta = await fetch(
            `/api/favoritos/${encodeURIComponent(evento.id_evento)}`,
            {
                method: estabaGuardado ? "DELETE" : "POST",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const resultado = await respuesta.json();

        if (respuesta.status === 401 || respuesta.status === 403) {
            mostrarNotificacion(
                "Inicia sesión",
                "Necesitas una cuenta de cliente para gestionar tus favoritos.",
                "error"
            );
            return;
        }

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje ||
                resultado.error ||
                "No fue posible actualizar tus favoritos."
            );
        }

        const ahoraGuardado = !estabaGuardado;

        botonFavorito.textContent = ahoraGuardado
            ? "♥ Guardado"
            : "♡ Favorito";

        botonFavorito.setAttribute(
            "aria-pressed",
            String(ahoraGuardado)
        );

        botonFavorito.setAttribute(
            "aria-label",
            ahoraGuardado
                ? `Quitar ${evento.nombre_evento} de favoritos`
                : `Agregar ${evento.nombre_evento} a favoritos`
        );

        mostrarNotificacion(
            ahoraGuardado
                ? "¡Agregado a favoritos!"
                : "Favorito eliminado",
            ahoraGuardado
                ? `${evento.nombre_evento} se guardó correctamente.`
                : `${evento.nombre_evento} se quitó de tus favoritos.`
        );

    } catch (error) {
        console.error("Error al actualizar favoritos:", error);

        mostrarNotificacion(
            "No se pudo actualizar",
            error.message || "Inténtalo nuevamente.",
            "error"
        );
    } finally {
        botonFavorito.disabled = false;
    }
});


pie.append(organizador, boton, botonFavorito);
informacion.append(etiquetas, fecha, nombre, lugar, pie);
tarjeta.append(imagen, informacion);
contenedorEventos.append(tarjeta);

            });

            tarjetas = Array.from(
                contenedorEventos.querySelectorAll(".tarjeta-evento")
            );

            aplicarFiltros();

        } catch (error) {
            console.error("Error al cargar el catálogo:", error);

            if (tituloEventos) {
                tituloEventos.textContent =
                    "No fue posible cargar los eventos";
            }
        }
    }

    // Normaliza texto para facilitar las búsquedas.
    function normalizar(texto) {
        return texto
            .toLocaleLowerCase("es")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    // Convierte la fecha escrita en las tarjetas en una fecha real.
    
function obtenerFecha(tarjeta) {
    const textoFecha = tarjeta
        .querySelector(".dato-evento")
        ?.textContent.trim();

    if (!textoFecha) return null;

    const coincidencia = textoFecha.match(
        /(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i
    );

    if (!coincidencia) return null;

    const meses = {
        enero: 0,
        febrero: 1,
        marzo: 2,
        abril: 3,
        mayo: 4,
        junio: 5,
        julio: 6,
        agosto: 7,
        septiembre: 8,
        octubre: 9,
        noviembre: 10,
        diciembre: 11
    };

    const dia = Number(coincidencia[1]);
    const mes = meses[normalizar(coincidencia[2])];
    const anio = Number(coincidencia[3]);

    if (mes === undefined) return null;

    return new Date(anio, mes, dia);
}


    // Comprueba si una tarjeta corresponde al filtro temporal.
    function cumpleFiltroFecha(tarjeta) {
        const textoTarjeta = normalizar(tarjeta.textContent);
        const fechaEvento = obtenerFecha(tarjeta);

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (filtroSeleccionado === "Gratis / Entrada Libre") {
            return /gratis|entrada libre/.test(textoTarjeta);
        }

        if (filtroSeleccionado === "Próximos") {
            return fechaEvento !== null && fechaEvento >= hoy;
        }

        if (filtroSeleccionado === "Eventos Pasados") {
            return fechaEvento !== null && fechaEvento < hoy;
        }

        if (filtroSeleccionado === "Hoy") {
            return fechaEvento !== null &&
                fechaEvento.getTime() === hoy.getTime();
        }

        if (filtroSeleccionado === "Fin de semana") {
            if (!fechaEvento) return false;

            const diaSemana = hoy.getDay();
            const sabado = new Date(hoy);
            sabado.setDate(hoy.getDate() + (6 - diaSemana));

            const domingo = new Date(sabado);
            domingo.setDate(sabado.getDate() + 1);

            // Si hoy es domingo, usamos el sábado y domingo actuales.
            if (diaSemana === 0) {
                sabado.setDate(hoy.getDate() - 1);
                domingo.setTime(hoy.getTime());
            }

            return fechaEvento >= sabado && fechaEvento <= domingo;
        }

        return true;
    }

    // Aplica búsqueda, categoría, sector y filtro temporal.
    function aplicarFiltros() {
        const textoBusqueda = normalizar(buscador?.value || "");
        const sector = selectorSector?.selectedOptions[0]?.textContent || "";
        const sectorSeleccionado = normalizar(sector);

        let cantidadVisible = 0;

        tarjetas.forEach((tarjeta) => {
            const textoTarjeta = normalizar(tarjeta.textContent);

            const textoCoincide =
                !textoBusqueda || textoTarjeta.includes(textoBusqueda);

            const categoriaTarjeta = normalizar(
                tarjeta.querySelector(".etiqueta-evento")?.textContent || ""
            );

            const categoriaCoincide =
                categoriaSeleccionada === "Todas" ||
                categoriaTarjeta.includes(normalizar(categoriaSeleccionada));

            const sectorCoincide =
                !sectorSeleccionado ||
                sectorSeleccionado.includes("(todos)") ||
                textoTarjeta.includes(sectorSeleccionado);

            const fechaCoincide = cumpleFiltroFecha(tarjeta);

            const visible =
                textoCoincide &&
                categoriaCoincide &&
                sectorCoincide &&
                fechaCoincide;

            tarjeta.hidden = !visible;

            if (visible) cantidadVisible++;
        });

        if (descripcionEventos) {
            descripcionEventos.textContent =
                `Mostrando ${cantidadVisible} de ${tarjetas.length} eventos`;
        }

        if (tituloEventos) {
            tituloEventos.textContent =
                cantidadVisible > 0
                    ? "Eventos en Popayán"
                    : "No encontramos eventos";
        }
    }

    // Búsqueda mientras el usuario escribe.
    buscador?.addEventListener("input", aplicarFiltros);

    // Botón para aplicar la búsqueda.
    botonExplorar?.addEventListener("click", aplicarFiltros);

    // Filtros por categoría.
    botonesCategorias.forEach((boton) => {
        boton.addEventListener("click", () => {
            categoriaSeleccionada = boton.textContent.trim();

            botonesCategorias.forEach((otroBoton) => {
                const activo = otroBoton === boton;
                otroBoton.classList.toggle("activa", activo);
                otroBoton.setAttribute("aria-pressed", String(activo));
            });

            aplicarFiltros();
        });
    });

    // Filtros temporales y de entrada.
    botonesFiltros.forEach((boton) => {
        boton.addEventListener("click", () => {
            filtroSeleccionado = boton.textContent.trim();

            botonesFiltros.forEach((otroBoton) => {
                const activo = otroBoton === boton;
                otroBoton.classList.toggle("activo", activo);
                otroBoton.setAttribute("aria-pressed", String(activo));
            });

            aplicarFiltros();
        });
    });

    // Filtro por sector.
    selectorSector?.addEventListener("change", aplicarFiltros);

    // Cargar los eventos desde MySQL.
    cargarEventos();

    console.log("CulturApp: catálogo inicializado correctamente.");
});
