
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

    <button type="button" class="btn-cancelar-evento" data-id="${idEvento}">
        Cancelar evento
    </button>
</div>

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

    // Mostrar formulario
    btnMostrar?.addEventListener("click", async () => {
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
        mensajeFormulario.textContent = "";
    });

    // Guardar evento
    formulario?.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        mensajeFormulario.textContent = "Guardando evento...";

        const botonGuardar = formulario.querySelector(
            'button[type="submit"]'
        );

        botonGuardar.disabled = true;

        const datos = {
            nombre_evento: document.getElementById("nombreEvento").value.trim(),
            descripcion_evento: document.getElementById("descripcionEvento").value.trim(),
            fecha_evento: document.getElementById("fechaEvento").value,
            hora_evento: document.getElementById("horaEvento").value,
            id_ubicacion: selectUbicacion.value,
            id_categoria: selectCategoria.value,
            precio: document.getElementById("precioEvento").value
        };

        try {
            
            const url = idEventoEditando
                ? `/api/eventos/${idEventoEditando}`
                : "/api/eventos";

            const metodo = idEventoEditando ? "PUT" : "POST";

            const respuesta = await fetch(url, {
                method: metodo,
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify(datos)
            });


            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    resultado.mensaje || "No se pudo crear el evento."
                );
            }

            mensajeFormulario.style.color = "#087443";
            mensajeFormulario.textContent =
                `${resultado.mensaje} Código: ${resultado.id_evento}`;

                        formulario.reset();

            idEventoEditando = null;

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
