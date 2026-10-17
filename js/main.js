
document.addEventListener("DOMContentLoaded", () => {
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
    const tarjetas = Array.from(
        contenedorEventos.querySelectorAll(".tarjeta-evento")
    );

    let categoriaSeleccionada = "Todas";
    let filtroSeleccionado = "Próximos";

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
            /(\d{1,2})\s+([a-záéíóúñ]+)[,.]?\s+(\d{4})/i
        );

        if (!coincidencia) return null;

        const meses = {
            ene: 0, enero: 0,
            feb: 1, febrero: 1,
            mar: 2, marzo: 2,
            abr: 3, abril: 3,
            may: 4, mayo: 4,
            jun: 5, junio: 5,
            jul: 6, julio: 6,
            ago: 7, agosto: 7,
            sep: 8, septiembre: 8,
            oct: 9, octubre: 9,
            nov: 10, noviembre: 10,
            dic: 11, diciembre: 11
        };

        const dia = Number(coincidencia[1]);
        const mesTexto = normalizar(coincidencia[2]);
        const anio = Number(coincidencia[3]);
        const mes = meses[mesTexto];

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

    // Primera aplicación de los filtros.
    aplicarFiltros();

    console.log("CulturApp: catálogo inicializado correctamente.");
});
