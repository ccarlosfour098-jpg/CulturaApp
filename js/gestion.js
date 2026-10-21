
document.addEventListener("DOMContentLoaded", () => {

    
    // Mostrar y ocultar el formulario de creación
    const btnMostrarFormulario =
        document.getElementById("btnMostrarFormulario");

    const btnCancelarFormulario =
        document.getElementById("btnCancelarFormulario");

    const panelFormulario =
        document.getElementById("panelFormularioEvento");

    const formularioEvento =
        document.getElementById("formularioEvento");

    if (btnMostrarFormulario && panelFormulario) {
        btnMostrarFormulario.addEventListener("click", () => {
            panelFormulario.hidden = false;
            panelFormulario.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }

    if (btnCancelarFormulario && panelFormulario) {
        btnCancelarFormulario.addEventListener("click", () => {
            panelFormulario.hidden = true;
            formularioEvento?.reset();
        });
    }


    const lista = document.getElementById("listaEventos");
    const contador = document.getElementById("contadorEventos");
    const mensaje = document.getElementById("mensajeEventos");

    
    // Referencias de la ventana flotante de análisis
    const modalAnalisis = document.getElementById("modalAnalisisResenas");
    const contenidoModal = document.getElementById("contenidoModalAnalisis");
    const tituloModal = document.getElementById("tituloModalAnalisis");
    const subtituloModal = document.getElementById("subtituloModalAnalisis");
    const btnCerrarModal = document.getElementById("cerrarModalAnalisis");

    let elementoAnteriorModal = null;

    function abrirModalAnalisis() {
        elementoAnteriorModal = document.activeElement;
        modalAnalisis.hidden = false;
        modalAnalisis.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        btnCerrarModal.focus();
    }

    function cerrarModalAnalisis() {
        modalAnalisis.hidden = true;
        modalAnalisis.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        if (elementoAnteriorModal?.isConnected) {
            elementoAnteriorModal.focus();
        }
    }

    btnCerrarModal?.addEventListener("click", cerrarModalAnalisis);

    modalAnalisis?.addEventListener("click", (evento) => {
        if (evento.target === modalAnalisis) {
            cerrarModalAnalisis();
        }
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && modalAnalisis && !modalAnalisis.hidden) {
            cerrarModalAnalisis();
        }
    });


    // Evita ejecutar el código si la página no tiene la lista de eventos.
    if (!lista || !contador || !mensaje) {
        return;
    }

    // Evita interpretar los datos recibidos como código HTML.
    function escaparHTML(valor) {
        const elemento = document.createElement("span");
        elemento.textContent = valor ?? "";
        return elemento.innerHTML;
    }

    // Convierte la fecha de MySQL a una fecha legible.
    function formatearFecha(fecha) {
        if (!fecha) {
            return "Sin fecha";
        }

        const partes = String(fecha).slice(0, 10).split("-");

        if (partes.length !== 3) {
            return "Fecha no disponible";
        }

        const anio = Number(partes[0]);
        const mes = Number(partes[1]);
        const dia = Number(partes[2]);

        const fechaLocal = new Date(anio, mes - 1, dia);

        return fechaLocal.toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    }

    // Convierte la hora de MySQL a formato de 12 horas.
    function formatearHora(hora) {
        if (!hora) {
            return "Sin hora";
        }

        const partes = String(hora).split(":");

        if (partes.length < 2) {
            return "Hora no disponible";
        }

        const fecha = new Date();

        fecha.setHours(
            Number(partes[0]),
            Number(partes[1]),
            0,
            0
        );

        return fecha.toLocaleTimeString("es-CO", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    }

    // Muestra el precio en pesos colombianos.
    function formatearPrecio(precio) {
        const valor = Number(precio);

        if (!Number.isFinite(valor) || valor === 0) {
            return "Entrada gratuita";
        }

        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        }).format(valor);
    }


    // Datos del último informe generado por Gemini.
    let datosAnalisisActual = null;

    // Descarga el informe como un archivo HTML.
    function descargarInformeHTML(datos) {
        if (!datos || !datos.informe) {
            alert("No hay un informe disponible para descargar.");
            return;
        }

        const informe = datos.informe;

        

        const crearListaInforme = (elementos) => {
            if (!Array.isArray(elementos) || elementos.length === 0) {
                return "<li>No se identificaron elementos.</li>";
            }

            return elementos
                .map(item => `<li>${escaparHTML(item)}</li>`)
                .join("");
        };

        const nombreEvento = escaparHTML(
            datos.evento?.nombre_evento ||
            datos.evento?.nombre ||
            "Evento cultural"
        );

        const fechaGeneracion = new Date().toLocaleString("es-CO");

        const contenidoHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe de reseñas - ${nombreEvento}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 850px;
            margin: 40px auto;
            padding: 0 24px;
            color: #222;
            line-height: 1.6;
        }
        h1, h2 { color: #243447; }
        .cabecera {
            border-bottom: 3px solid #243447;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .indicadores {
            background: #f2f4f7;
            padding: 16px;
            border-radius: 8px;
        }
        .nota {
            margin-top: 30px;
            color: #666;
            font-size: 13px;
            border-top: 1px solid #ddd;
            padding-top: 12px;
        }
        @media print {
            body { margin: 15mm auto; }
        }
    </style>
</head>
<body>
    <header class="cabecera">
        <h1>Informe de análisis de reseñas</h1>
        <h2>${nombreEvento}</h2>
        <p>Generado el: ${escaparHTML(fechaGeneracion)}</p>
    </header>

    <section class="indicadores">
        <p><strong>Reseñas analizadas:</strong>
            ${Number(datos.total_resenas) || 0}</p>
        <p><strong>Percepción estimada:</strong>
            ${Number(informe.puntuacion_percepcion) || 0}/10</p>
        <p><strong>Sentimiento general:</strong>
            ${escaparHTML(informe.sentimiento_general || "No disponible")}</p>
    </section>

    <h2>Fortalezas</h2>
    <ul>${crearListaInforme(informe.fortalezas)}</ul>

    <h2>Oportunidades de mejora</h2>
    <ul>${crearListaInforme(informe.mejoras)}</ul>

    <h2>Recomendaciones</h2>
    <ul>${crearListaInforme(informe.recomendaciones)}</ul>

    <h2>Resumen</h2>
    <p>${escaparHTML(informe.resumen || "Sin resumen disponible")}</p>

    <footer class="nota">
        Resultado orientativo generado por inteligencia artificial
        a partir de las reseñas del evento. No sustituye una evaluación
        humana.
    </footer>
</body>
</html>`;

        const archivo = new Blob(
            [contenidoHTML],
            { type: "text/html;charset=utf-8" }
        );

        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement("a");

        const nombreArchivo = String(
            datos.evento?.nombre_evento ||
            datos.evento?.nombre ||
            "evento"
        )
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 60);

        enlace.href = url;
        enlace.download = `Informe_resenas_${nombreArchivo || "evento"}.html`;

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }


// Eventos consultados desde MySQL
let eventosCargados = [];

// Código del evento que estamos editando.
// Si es null, estamos creando uno nuevo.
let idEventoEditando = null;

    // Construye la tarjeta de un evento.
    function crearTarjeta(evento) {

        const tarjeta = document.createElement("article");
        tarjeta.className = "solicitud";
        const idEvento = Number(evento.id_evento);

        const estado = escaparHTML(evento.estado);
        const nombre = escaparHTML(evento.nombre_evento);
        const descripcion = escaparHTML(evento.descripcion_evento);
        const organizador = escaparHTML(evento.organizador);
        const categorias = escaparHTML(
            evento.categorias || "Sin categoría asignada"
        );
        const lugar = escaparHTML(evento.nombre_lugar);
        const direccion = escaparHTML(evento.direccion);
        const barrio = escaparHTML(evento.barrio || "");
        const ciudad = escaparHTML(evento.ciudad);

        const fecha = escaparHTML(
            formatearFecha(evento.fecha_evento)
        );

        const hora = escaparHTML(
            formatearHora(evento.hora_evento)
        );

        const precio = escaparHTML(
            formatearPrecio(evento.precio)
        );

        tarjeta.innerHTML = `
            <div class="solicitud-info">

                <span class="estado">
                    ${estado}
                </span>

                <small>
                    Código de evento: ${idEvento}
                </small>

                <h3>${nombre}</h3>

                <p>${descripcion}</p>

                <p>
                    <strong>Organizador:</strong>
                    ${organizador}
                </p>

                <p>
                    <strong>Categoría:</strong>
                    ${categorias}
                </p>

                <p>
                    <strong>Lugar:</strong>
                    ${lugar}
                </p>

                <p>
                    <strong>Dirección:</strong>
                    ${direccion}
                    ${barrio ? " · " + barrio : ""}
                    · ${ciudad}
                </p>

                <p>
                    <strong>Fecha:</strong> ${fecha}
                    &nbsp; | &nbsp;
                    <strong>Hora:</strong> ${hora}
                </p>

                <p>
    <strong>Precio:</strong> ${precio}
</p>


<div class="acciones-evento">
    <button type="button" class="btn-editar" data-id="${idEvento}">
        Editar
    </button>

    ${evento.estado === "Borrador" ? `
    <button
        type="button"
        class="btn-aprobar-evento"
        data-id="${idEvento}"
    >
        Aprobar evento
    </button>

    <button
        type="button"
        class="btn-rechazar-evento"
        data-id="${idEvento}"
    >
        Rechazar evento
    </button>
` : ""}

    <button type="button" class="btn-cancelar-evento" data-id="${idEvento}">
        Cancelar evento
    </button>

    <button
        type="button"
        class="btn-analizar-resenas"
        data-id="${idEvento}"
    >
        Analizar reseñas con IA
    </button>
</div>

<section
    class="panel-analisis-resenas"
    id="analisis-resenas-${idEvento}"
    hidden
    aria-live="polite"
></section>


</div>
`;

        return tarjeta;
    }

    // Consulta los eventos al servidor Express.
    async function cargarEventos() {

        contador.textContent = "Cargando eventos...";
        lista.textContent = "Consultando la base de datos...";
        mensaje.textContent = "";

        try {

            const respuesta = await fetch("/api/eventos", {
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!respuesta.ok) {
                throw new Error(
                    `El servidor respondió con el código ${respuesta.status}`
                );
            }

            const eventos = await respuesta.json();

            eventosCargados = eventos;

            if (!Array.isArray(eventos)) {
                throw new Error(
                    "El servidor no devolvió una lista válida de eventos."
                );
            }

            lista.replaceChildren();

            const cantidad = eventos.length;

            contador.textContent =
                `${cantidad} evento${cantidad === 1 ? "" : "s"} registrado${cantidad === 1 ? "" : "s"}`;

            if (cantidad === 0) {
                lista.textContent =
                    "Todavía no hay eventos registrados en CulturaApp.";
                return;
            }

            eventos.forEach((evento) => {
                const tarjeta = crearTarjeta(evento);
                lista.appendChild(tarjeta);
            });

        } catch (error) {

            console.error(
                "Error al cargar los eventos:",
                error
            );

            contador.textContent = "Error de consulta";

            lista.textContent =
                "No fue posible cargar los eventos desde el servidor.";

            mensaje.textContent =
                "Verifica que Node.js esté ejecutándose y que la ruta /api/eventos funcione.";
        }
    }

    
    // Referencias del formulario
    const btnMostrar = document.getElementById("btnMostrarFormulario");
    const btnCancelar = document.getElementById("btnCancelarFormulario");
    const panel = document.getElementById("panelFormularioEvento");
    const formulario = document.getElementById("formularioEvento");

    const selectUbicacion = document.getElementById("ubicacionEvento");
    const selectCategoria = document.getElementById("categoriaEvento");
    const mensajeFormulario = document.getElementById("mensajeFormularioEvento");
        
    const inputImagen = document.getElementById("imagenEvento");
    const vistaPreviaImagen = document.getElementById("vistaPreviaImagen");
    const imagenSeleccionada = document.getElementById("imagenSeleccionada");

let urlVistaPrevia = null;


inputImagen?.addEventListener("change", () => {
    if (urlVistaPrevia) {
        URL.revokeObjectURL(urlVistaPrevia);
        urlVistaPrevia = null;
    }

    const archivo = inputImagen.files?.[0];

    if (!archivo) {
        return;
    }

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
        inputImagen.value = "";
        mensajeFormulario.textContent =
            "Selecciona una imagen JPG, PNG o WebP.";
        return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
        inputImagen.value = "";
        mensajeFormulario.textContent =
            "La imagen no puede superar los 5 MB.";
        return;
    }

    urlVistaPrevia = URL.createObjectURL(archivo);
    imagenSeleccionada.src = urlVistaPrevia;
    vistaPreviaImagen.hidden = false;
    mensajeFormulario.textContent = "";
});
    
 // Mostrar formulario para crear un evento nuevo
btnMostrar?.addEventListener("click", async () => {
    idEventoEditando = null;
    formulario.reset();

    
inputImagen.required = true;

if (urlVistaPrevia) {
    URL.revokeObjectURL(urlVistaPrevia);
    urlVistaPrevia = null;
}

vistaPreviaImagen.hidden = true;
imagenSeleccionada.removeAttribute("src");
mensajeFormulario.textContent = "";

    formulario.querySelector(
        'button[type="submit"]'
    ).textContent = "Guardar evento";

    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });

    await cargarOpciones(
        "/api/ubicaciones",
        selectUbicacion,
        "id_ubicacion",
        "nombre_lugar"
    );

    await cargarOpciones(
        "/api/categorias",
        selectCategoria,
        "id_categoria",
        "nombre_categoria"
    );
});


    // Cargar opciones de ubicación y categoría desde el servidor
    async function cargarOpciones(url, select, campoId, campoNombre) {
        if (!select) return;

        try {
            const respuesta = await fetch(url);

            if (!respuesta.ok) {
                throw new Error(`Error HTTP ${respuesta.status}`);
            }

            const datos = await respuesta.json();

            select.replaceChildren(
                new Option("Selecciona una opción", "")
            );

            datos.forEach((item) => {
                select.add(new Option(
                    item[campoNombre],
                    item[campoId]
                ));
            });

        } catch (error) {
            console.error(`Error cargando ${url}:`, error);
            mensajeFormulario.textContent =
                "No se pudieron cargar las ubicaciones o categorías.";
        }
    }

    // Cancelar formulario
    
btnCancelar?.addEventListener("click", () => {
    panel.hidden = true;
    formulario.reset();

    idEventoEditando = null;
    inputImagen.required = true;

    if (urlVistaPrevia) {
        URL.revokeObjectURL(urlVistaPrevia);
        urlVistaPrevia = null;
    }

    imagenSeleccionada.removeAttribute("src");
    vistaPreviaImagen.hidden = true;
    mensajeFormulario.textContent = "";

    formulario.querySelector(
        'button[type="submit"]'
    ).textContent = "Guardar evento";
});


    // Guardar evento
    formulario?.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        mensajeFormulario.textContent = "Guardando evento...";

        const botonGuardar = formulario.querySelector(
            'button[type="submit"]'
        );

        botonGuardar.disabled = true;

        
        const datos = new FormData(formulario);


        try {
            
            const url = idEventoEditando
                ? `/api/eventos/${idEventoEditando}`
                : "/api/eventos";

            const metodo = idEventoEditando ? "PUT" : "POST";

            
const respuesta = await fetch(url, {
    method: metodo,
    credentials: "same-origin",
    body: datos
});


            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    resultado.mensaje || "No se pudo guardar el evento."
                );
            }

            

mensajeFormulario.style.color = "#087443";
mensajeFormulario.textContent =
    `${resultado.mensaje} Código: ${resultado.id_evento}`;

formulario.reset();
idEventoEditando = null;
inputImagen.required = true;

if (urlVistaPrevia) {
    URL.revokeObjectURL(urlVistaPrevia);
    urlVistaPrevia = null;
}

imagenSeleccionada.removeAttribute("src");
vistaPreviaImagen.hidden = true;

formulario.querySelector(
    'button[type="submit"]'
).textContent = "Guardar evento";

await cargarEventos();

        } catch (error) {
            mensajeFormulario.style.color = "#b42318";
            mensajeFormulario.textContent = error.message;
        } finally {
            botonGuardar.disabled = false;
        }
    });    
    
    // Detectar clics en los botones de cada evento
    lista.addEventListener("click", async (evento) => {
        const botonEditar = evento.target.closest(".btn-editar");
        const botonCancelarEvento =
            evento.target.closest(".btn-cancelar-evento");

        const botonAnalizar =
    evento.target.closest(".btn-analizar-resenas");
        const botonAprobar = evento.target.closest(".btn-aprobar-evento");
        const botonRechazar = evento.target.closest(".btn-rechazar-evento");
        if (botonAnalizar) {
            const id = Number(botonAnalizar.dataset.id);
            const datosEvento = eventosCargados.find(
                item => Number(item.id_evento) === id
            );

            if (!datosEvento || botonAnalizar.disabled) {
                return;
            }

            abrirModalAnalisis();

            tituloModal.textContent = "Análisis de reseñas";
            subtituloModal.textContent = datosEvento.nombre_evento;
            contenidoModal.textContent =
                "Gemini está analizando las reseñas. Si el servicio está ocupado, puede tardar hasta unos minutos. No cierres esta ventana.";

            botonAnalizar.disabled = true;
            botonAnalizar.textContent = "Analizando...";

            try {
                const respuesta = await fetch(
                    `/api/eventos/${id}/analizar-resenas`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        credentials: "same-origin",
                        body: JSON.stringify({})
                    }
                );

                const datos = await respuesta.json();

                if (!respuesta.ok) {
                    throw new Error(
                        datos.mensaje || "No fue posible analizar las reseñas."
                    );
                }

                const informe = datos.informe;

                datosAnalisisActual = datos;

                datosAnalisisActual.evento = {
    nombre_evento: datosEvento.nombre_evento
};

                const crearLista = (elementos) => {
                    if (!Array.isArray(elementos) || elementos.length === 0) {
                        return "<p>No se identificaron elementos.</p>";
                    }

                    return `<ul>${elementos.map(item =>
                        `<li>${escaparHTML(item)}</li>`
                    ).join("")}</ul>`;
                };

                contenidoModal.innerHTML = `
                    <div class="resumen-analisis">
                        <div class="dato-analisis">
                            <span>Percepción estimada por IA</span>
                            <strong>${Number(informe.puntuacion_percepcion)}/10</strong>
                        </div>

                        <div class="dato-analisis">
                            <span>Reseñas analizadas</span>
                            <strong>${Number(datos.total_resenas)}</strong>
                        </div>
                    </div>

                    <p class="sentimiento-analisis">
                        <strong>Sentimiento general:</strong>
                        ${escaparHTML(informe.sentimiento_general)}
                    </p>

                    <h3>Fortalezas</h3>
                    ${crearLista(informe.fortalezas)}

                    <h3>Oportunidades de mejora</h3>
                    ${crearLista(informe.mejoras)}

                    <h3>Recomendaciones</h3>
                    ${crearLista(informe.recomendaciones)}

                    <h3>Resumen</h3>
                    <p>${escaparHTML(informe.resumen)}</p>

                    <p><small>
                        Resultado orientativo generado por IA a partir de las reseñas.
                    </small></p>
                    <button
    type="button"
    id="btnDescargarInforme"
>
    Descargar informe
</button>
                `;

                const btnDescargarInforme = document.getElementById(
    "btnDescargarInforme"
);

btnDescargarInforme?.addEventListener("click", () => {
    descargarInformeHTML(datosAnalisisActual);
});

            } catch (error) {
                console.error("Error al analizar reseñas:", error);

                contenidoModal.textContent =
                    error.message ||
                    "No fue posible generar el análisis. Inténtalo más tarde.";
            } finally {
                botonAnalizar.disabled = false;
                botonAnalizar.textContent = "Analizar reseñas con IA";
            }

            return;
        }
        
if (botonAprobar || botonRechazar) {
    const boton = botonAprobar || botonRechazar;
    const id = Number(boton.dataset.id);

    const accion = botonAprobar ? "aprobar" : "rechazar";
    const confirmacion = botonAprobar
        ? "¿Deseas aprobar este evento?"
        : "¿Deseas rechazar este evento?";

    if (!Number.isInteger(id) || id <= 0) {
        alert("El identificador del evento no es válido.");
        return;
    }

    if (!confirm(confirmacion)) {
        return;
    }

    try {
        boton.disabled = true;

        const respuesta = await fetch(
            `/api/admin/eventos/${id}/${accion}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje || "No fue posible actualizar el evento."
            );
        }

        alert(resultado.mensaje);

        await cargarEventos();
    } catch (error) {
        console.error("Error al gestionar el evento:", error);
        alert(error.message || "Ocurrió un error al gestionar el evento.");
    } finally {
        boton.disabled = false;
    }

    return;
}

        if (botonEditar) {
            const id = Number(botonEditar.dataset.id);

            const datosEvento = eventosCargados.find(
                (item) => Number(item.id_evento) === id
            );

            if (!datosEvento) {
                alert("No se encontraron los datos del evento.");
                return;
            }

            idEventoEditando = id;

            // La imagen es opcional durante la edición
inputImagen.required = false;

// Mostrar la imagen que ya tiene el evento
if (urlVistaPrevia) {
    URL.revokeObjectURL(urlVistaPrevia);
    urlVistaPrevia = null;
}

if (datosEvento.imagen_url) {
    imagenSeleccionada.src = datosEvento.imagen_url;
    vistaPreviaImagen.hidden = false;
} else {
    imagenSeleccionada.removeAttribute("src");
    vistaPreviaImagen.hidden = true;
}

            panel.hidden = false;
            panel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            formulario.querySelector(
                'button[type="submit"]'
            ).textContent = "Guardar cambios";

            document.getElementById("nombreEvento").value =
                datosEvento.nombre_evento || "";

            document.getElementById("descripcionEvento").value =
                datosEvento.descripcion_evento || "";

            document.getElementById("fechaEvento").value =
                String(datosEvento.fecha_evento).slice(0, 10);

            document.getElementById("horaEvento").value =
                String(datosEvento.hora_evento).slice(0, 5);

            document.getElementById("precioEvento").value =
                datosEvento.precio ?? 0;

            await cargarOpciones(
                "/api/ubicaciones",
                selectUbicacion,
                "id_ubicacion",
                "nombre_lugar"
            );

            await cargarOpciones(
                "/api/categorias",
                selectCategoria,
                "id_categoria",
                "nombre_categoria"
            );

            selectUbicacion.value = String(
                datosEvento.id_ubicacion
            );

            selectCategoria.value = String(
                datosEvento.id_categoria
            );

            mensajeFormulario.textContent =
                `Editando el evento ${id}.`;

            return;
        }

        if (botonCancelarEvento) {
            const id = Number(botonCancelarEvento.dataset.id);

            // La cancelación real la conectaremos en el siguiente paso.
            alert(`Evento seleccionado para cancelar: ${id}`);
        }
    });


    // Ejecuta la consulta inicial.
    cargarEventos();

});
