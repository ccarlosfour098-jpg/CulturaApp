document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // ELEMENTOS DEL PANEL
  // ==========================================

  const nombreAdministrador = document.getElementById("nombreAdministrador");

  const totalSolicitudes = document.getElementById("totalSolicitudes");

  const totalUsuarios = document.getElementById("totalUsuarios");

  const totalEventos = document.getElementById("totalEventos");

  const contadorSolicitudes = document.getElementById("contadorSolicitudes");

  const tablaSolicitudes = document.getElementById("tablaSolicitudes");

  const mensajeAdmin = document.getElementById("mensajeAdmin");

  const botonActualizar = document.getElementById("botonActualizar");

  const botonCerrarSesion = document.getElementById("botonCerrarSesion");

  // Elementos de gestión de usuarios
  const buscarUsuario = document.getElementById("buscarUsuario");
  const filtroRol = document.getElementById("filtroRol");
  const filtroEstado = document.getElementById("filtroEstado");
  const filtroSolicitud = document.getElementById("filtroSolicitud");
  const botonLimpiarFiltros = document.getElementById("botonLimpiarFiltros");
  const resultadoUsuarios = document.getElementById("resultadoUsuarios");

  const tablaUsuarios = document.getElementById("tablaUsuarios");
  const tablaClientes = document.getElementById("tablaClientes");
  const tablaOrganizadores = document.getElementById("tablaOrganizadores");
  const tablaAdministradores = document.getElementById("tablaAdministradores");

  let listaUsuarios = [];

  // ==========================================
  // MENSAJES
  // ==========================================

  function mostrarMensaje(texto, tipo = "error") {
    if (!mensajeAdmin) return;

    mensajeAdmin.textContent = texto;
    mensajeAdmin.className = `admin-message ${tipo}`;
  }

  function limpiarMensaje() {
    if (!mensajeAdmin) return;

    mensajeAdmin.textContent = "";
    mensajeAdmin.className = "admin-message";
  }

  // ==========================================
  // PETICIONES AL SERVIDOR
  // ==========================================

  async function solicitarAPI(url, opciones = {}) {
    const respuesta = await fetch(url, {
      ...opciones,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...opciones.headers,
      },
    });

    const datos = await respuesta.json().catch(() => ({}));

    if (respuesta.status === 401) {
      window.location.href = "login.html";
      throw new Error("Debes iniciar sesión para continuar.");
    }

    if (respuesta.status === 403) {
      throw new Error(
        datos.mensaje ||
          "No tienes permisos para acceder al panel administrativo.",
      );
    }

    if (!respuesta.ok) {
      throw new Error(
        datos.mensaje || "No fue posible completar la operación.",
      );
    }

    return datos;
  }

  // ==========================================
  // VERIFICAR ACCESO ADMINISTRATIVO
  // ==========================================

  async function verificarAdministrador() {
    const datos = await solicitarAPI("/api/auth/me");

    if (!datos.autenticado || datos.usuario?.rol !== "Administrador") {
      mostrarMensaje(
        "Acceso denegado. Inicia sesión con una cuenta administradora.",
      );

      window.location.href = "login.html";
      return false;
    }

    if (nombreAdministrador) {
      const nombre = datos.usuario.nombre || "Administrador";
      const apellido = datos.usuario.apellido || "";

      nombreAdministrador.textContent = `${nombre} ${apellido}`.trim();
    }

    return true;
  }

  // ==========================================
  // MOSTRAR SOLICITUDES
  // ==========================================

  function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto ?? "No especificado";
    return celda;
  }

  function crearEstado(estado) {
    const etiqueta = document.createElement("span");
    etiqueta.classList.add("admin-status");

    const clases = {
      Pendiente: "admin-status-pending",
      Aprobada: "admin-status-approved",
      Rechazada: "admin-status-rejected",
    };

    etiqueta.classList.add(clases[estado] || "admin-status-pending");

    etiqueta.textContent = estado || "Desconocido";

    return etiqueta;
  }

  function mostrarSolicitudes(solicitudes) {
    if (!tablaSolicitudes) return;

    tablaSolicitudes.replaceChildren();

    if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
      const fila = document.createElement("tr");
      const celda = document.createElement("td");

      celda.colSpan = 6;
      celda.textContent = "No hay solicitudes de organizadores.";

      fila.appendChild(celda);
      tablaSolicitudes.appendChild(fila);
      return;
    }

    solicitudes.forEach((solicitud) => {
      const fila = document.createElement("tr");

      const solicitante = [solicitud.nombre_usuario, solicitud.apellido_usuario]
        .filter(Boolean)
        .join(" ");

      fila.appendChild(crearCelda(solicitante));
      fila.appendChild(crearCelda(solicitud.tipo_organizador));
      fila.appendChild(crearCelda(solicitud.tipo_actividades));

      fila.appendChild(
        crearCelda(
          solicitud.fecha_solicitud
            ? new Date(solicitud.fecha_solicitud).toLocaleDateString("es-CO")
            : "Sin fecha",
        ),
      );

      const celdaEstado = document.createElement("td");
      celdaEstado.appendChild(crearEstado(solicitud.estado));
      fila.appendChild(celdaEstado);

      const celdaAcciones = document.createElement("td");

      if (solicitud.estado === "Pendiente") {
        const botonAprobar = document.createElement("button");
        botonAprobar.type = "button";
        botonAprobar.textContent = "Aprobar";
        botonAprobar.className = "admin-button-approve";

        botonAprobar.addEventListener("click", () => {
          resolverSolicitud(solicitud.id_solicitud, "aprobar");
        });

        const botonRechazar = document.createElement("button");
        botonRechazar.type = "button";
        botonRechazar.textContent = "Rechazar";
        botonRechazar.className = "admin-button-reject";

        botonRechazar.addEventListener("click", () => {
          resolverSolicitud(solicitud.id_solicitud, "rechazar");
        });

        celdaAcciones.append(botonAprobar, botonRechazar);
      } else {
        celdaAcciones.textContent = "Solicitud revisada";
      }

      fila.appendChild(celdaAcciones);
      tablaSolicitudes.appendChild(fila);
    });
  }

  function mostrarConfirmacion(titulo, mensaje, textoBoton, tipo) {
    return new Promise((resolve) => {
      const dialogo = document.createElement("dialog");
      dialogo.className = "admin-confirm-dialog";

      const contenido = document.createElement("div");
      contenido.className = "admin-confirm-content";

      const icono = document.createElement("div");
      icono.className = `admin-confirm-icon ${tipo}`;
      icono.textContent = tipo === "aprobar" ? "✓" : "!";
      icono.setAttribute("aria-hidden", "true");

      const encabezado = document.createElement("h2");
      encabezado.textContent = titulo;

      const descripcion = document.createElement("p");
      descripcion.textContent = mensaje;

      const acciones = document.createElement("div");
      acciones.className = "admin-confirm-actions";

      const cancelar = document.createElement("button");
      cancelar.type = "button";
      cancelar.className = "admin-confirm-cancel";
      cancelar.textContent = "Cancelar";

      const confirmar = document.createElement("button");
      confirmar.type = "button";
      confirmar.className = `admin-confirm-submit ${tipo}`;
      confirmar.textContent = textoBoton;

      acciones.append(cancelar, confirmar);
      contenido.append(icono, encabezado, descripcion, acciones);
      dialogo.appendChild(contenido);
      document.body.appendChild(dialogo);

      let finalizado = false;

      function cerrar(resultado) {
        if (finalizado) return;
        finalizado = true;
        dialogo.close();
        dialogo.remove();
        resolve(resultado);
      }

      cancelar.addEventListener("click", () => cerrar(false));
      confirmar.addEventListener("click", () => cerrar(true));

      dialogo.addEventListener("cancel", (evento) => {
        evento.preventDefault();
        cerrar(false);
      });

      dialogo.addEventListener("click", (evento) => {
        if (evento.target === dialogo) cerrar(false);
      });

      dialogo.showModal();
      cancelar.focus();
    });
  }

  async function resolverSolicitud(idSolicitud, accion) {
    const esAprobacion = accion === "aprobar";
    const operacion = esAprobacion ? "aprobar" : "rechazar";

    const confirmado = await mostrarConfirmacion(
      esAprobacion ? "¿Aprobar solicitud?" : "¿Rechazar solicitud?",
      esAprobacion
        ? "El usuario podrá acceder a CulturaApp con permisos de organizador."
        : "La solicitud será rechazada y el usuario continuará como cliente.",
      esAprobacion ? "Confirmar aprobación" : "Confirmar rechazo",
      operacion,
    );

    // Si cancela, no se modifica nada.
    if (!confirmado) return;

    try {
      const resultado = await solicitarAPI(
        `/api/admin/solicitudes-organizadores/${idSolicitud}/${operacion}`,
        { method: "POST" },
      );

      // Actualizar los datos y mostrar después el resultado.
      await actualizarPanel();
      mostrarMensaje(resultado.mensaje, "success");
    } catch (error) {
      console.error("Error al resolver solicitud:", error);
      mostrarMensaje(error.message, "error");
    }
  }

  // ==========================================
  // GESTIÓN Y FILTRADO DE USUARIOS
  // ==========================================

  function normalizar(valor) {
    return String(valor ?? "")
      .trim()
      .toLocaleLowerCase("es");
  }

  function nombreCompleto(usuario) {
    return [usuario.nombre_usuario, usuario.apellido_usuario]
      .filter(Boolean)
      .join(" ");
  }

  function formatearFecha(fecha) {
    if (!fecha) return "Sin fecha";

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) return "Sin fecha";

    return valor.toLocaleDateString("es-CO");
  }

  function crearCeldaEstadoUsuario(estado) {
    const celda = document.createElement("td");
    const etiqueta = document.createElement("span");
    const valor = estado || "Sin solicitud";

    etiqueta.classList.add("admin-status");

    const clases = {
      Activo: "admin-status-approved",
      Pendiente: "admin-status-pending",
      Inactivo: "admin-status-rejected",
      Aprobada: "admin-status-approved",
      Rechazada: "admin-status-rejected",
      "Sin solicitud": "admin-status-neutral",
    };

    etiqueta.classList.add(clases[valor] || "admin-status-neutral");

    etiqueta.textContent = valor;
    celda.appendChild(etiqueta);

    return celda;
  }

  function dibujarFilaVacia(tabla, columnas, mensaje) {
    if (!tabla) return;

    tabla.replaceChildren();

    const fila = document.createElement("tr");
    const celda = document.createElement("td");

    celda.colSpan = columnas;
    celda.textContent = mensaje;

    fila.appendChild(celda);
    tabla.appendChild(fila);
  }

  function crearFilaGeneral(usuario) {
    const fila = document.createElement("tr");

    fila.appendChild(crearCelda(nombreCompleto(usuario)));
    fila.appendChild(crearCelda(usuario.correo_electronico));
    fila.appendChild(crearCelda(usuario.rol));
    fila.appendChild(crearCeldaEstadoUsuario(usuario.estado));

    fila.appendChild(
      crearCeldaEstadoUsuario(usuario.estado_solicitud || "Sin solicitud"),
    );

    fila.appendChild(crearCelda(formatearFecha(usuario.fecha_registro)));

    return fila;
  }

  function crearFilaSimple(usuario, incluirSolicitud = false) {
    const fila = document.createElement("tr");

    fila.appendChild(crearCelda(nombreCompleto(usuario)));
    fila.appendChild(crearCelda(usuario.correo_electronico));
    fila.appendChild(crearCeldaEstadoUsuario(usuario.estado));

    if (incluirSolicitud) {
      fila.appendChild(
        crearCeldaEstadoUsuario(usuario.estado_solicitud || "Sin solicitud"),
      );
    }

    fila.appendChild(crearCelda(formatearFecha(usuario.fecha_registro)));

    return fila;
  }

  function renderizarTabla(tabla, usuarios, columnas, crearFila, etiqueta) {
    if (!tabla) return;

    tabla.replaceChildren();

    if (usuarios.length === 0) {
      dibujarFilaVacia(tabla, columnas, `No hay ${etiqueta} para mostrar.`);
      return;
    }

    usuarios.forEach((usuario) => {
      tabla.appendChild(crearFila(usuario));
    });
  }

  function obtenerUsuariosFiltrados() {
    const busqueda = normalizar(buscarUsuario?.value);
    const rolSeleccionado = filtroRol?.value || "";
    const estadoSeleccionado = filtroEstado?.value || "";
    const solicitudSeleccionada = filtroSolicitud?.value || "";

    return listaUsuarios.filter((usuario) => {
      const nombre = normalizar(nombreCompleto(usuario));
      const correo = normalizar(usuario.correo_electronico);

      const coincideBusqueda =
        !busqueda || nombre.includes(busqueda) || correo.includes(busqueda);

      const coincideRol = !rolSeleccionado || usuario.rol === rolSeleccionado;

      const coincideEstado =
        !estadoSeleccionado ||
        normalizar(usuario.estado) === normalizar(estadoSeleccionado);

      const estadoSolicitud = usuario.estado_solicitud || "Sin solicitud";

      const coincideSolicitud =
        !solicitudSeleccionada ||
        normalizar(estadoSolicitud) === normalizar(solicitudSeleccionada);

      return (
        coincideBusqueda && coincideRol && coincideEstado && coincideSolicitud
      );
    });
  }

  function mostrarUsuarios() {
    const filtrados = obtenerUsuariosFiltrados();

    renderizarTabla(
      tablaUsuarios,
      filtrados,
      6,
      crearFilaGeneral,
      "usuarios que coincidan con los filtros",
    );

    renderizarTabla(
      tablaClientes,
      listaUsuarios.filter((usuario) => usuario.rol === "Cliente"),
      4,
      (usuario) => crearFilaSimple(usuario),
      "clientes",
    );

    renderizarTabla(
      tablaOrganizadores,
      listaUsuarios.filter((usuario) => usuario.rol === "Organizador"),
      5,
      (usuario) => crearFilaSimple(usuario, true),
      "organizadores",
    );

    renderizarTabla(
      tablaAdministradores,
      listaUsuarios.filter((usuario) => usuario.rol === "Administrador"),
      4,
      (usuario) => crearFilaSimple(usuario),
      "administradores",
    );

    if (resultadoUsuarios) {
      resultadoUsuarios.textContent =
        `Se muestran ${filtrados.length} de ` +
        `${listaUsuarios.length} usuarios.`;
    }
  }

  async function cargarUsuarios() {
    listaUsuarios = await solicitarAPI("/api/admin/usuarios");
    mostrarUsuarios();
  }

  function limpiarFiltrosUsuarios() {
    if (buscarUsuario) buscarUsuario.value = "";
    if (filtroRol) filtroRol.value = "";
    if (filtroEstado) filtroEstado.value = "";
    if (filtroSolicitud) filtroSolicitud.value = "";

    mostrarUsuarios();
  }

  [buscarUsuario, filtroRol, filtroEstado, filtroSolicitud].forEach(
    (control) => {
      if (!control) return;

      control.addEventListener(
        control.tagName === "INPUT" ? "input" : "change",
        mostrarUsuarios,
      );
    },
  );

  if (botonLimpiarFiltros) {
    botonLimpiarFiltros.addEventListener("click", limpiarFiltrosUsuarios);
  }

  // ==========================================
  // CARGAR DATOS DEL PANEL
  // ==========================================

  async function cargarSolicitudes() {
    const solicitudes = await solicitarAPI(
      "/api/admin/solicitudes-organizadores",
    );

    mostrarSolicitudes(solicitudes);

    if (totalSolicitudes) {
      totalSolicitudes.textContent = solicitudes.filter(
        (solicitud) => solicitud.estado === "Pendiente",
      ).length;
    }

    if (contadorSolicitudes) {
      contadorSolicitudes.textContent = solicitudes.filter(
        (solicitud) => solicitud.estado === "Pendiente",
      ).length;
    }
  }

  async function cargarEstadisticas() {
    const datos = await solicitarAPI("/api/admin/estadisticas");

    if (totalUsuarios) {
      totalUsuarios.textContent = datos.totalUsuarios;
    }

    if (totalEventos) {
      totalEventos.textContent = datos.totalEventos;
    }
  }

  // ==========================================
  // ACTUALIZAR PANEL
  // ==========================================

  async function actualizarPanel() {
    limpiarMensaje();

    if (botonActualizar) {
      botonActualizar.disabled = true;
      botonActualizar.textContent = "Actualizando...";
    }

    try {
      await Promise.all([
        cargarSolicitudes(),
        cargarEstadisticas(),
        cargarUsuarios(),
      ]);
    } catch (error) {
      console.error("Error al actualizar el panel:", error);
      mostrarMensaje(error.message);
    } finally {
      if (botonActualizar) {
        botonActualizar.disabled = false;
        botonActualizar.textContent = "Actualizar";
      }
    }
  }

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  if (botonCerrarSesion) {
    botonCerrarSesion.addEventListener("click", async () => {
      botonCerrarSesion.disabled = true;

      try {
        await solicitarAPI("/api/auth/logout", {
          method: "POST",
        });

        window.location.href = "login.html";
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        mostrarMensaje(error.message);
        botonCerrarSesion.disabled = false;
      }
    });
  }

  if (botonActualizar) {
    botonActualizar.addEventListener("click", actualizarPanel);
  }

  // ==========================================
  // INICIAR PANEL
  // ==========================================

  async function iniciarPanel() {
    try {
      const autorizado = await verificarAdministrador();

      if (!autorizado) return;

      await actualizarPanel();
    } catch (error) {
      console.error("Error al iniciar administración:", error);

      if (error.message !== "Debes iniciar sesión para continuar.") {
        mostrarMensaje(error.message);
      }
    }
  }

  iniciarPanel();
});
