
document.addEventListener("DOMContentLoaded", () => {
    console.log("CulturApp: eventos.js está funcionando");

    const botones = document.querySelectorAll(".btn-detalles");

    console.log("Botones encontrados:", botones.length);

    botones.forEach((boton) => {
        boton.addEventListener("click", () => {
            const idEvento = boton.dataset.idEvento;

            console.log("Evento seleccionado:", idEvento);

            if (!idEvento) {
                alert("Este evento no tiene un identificador.");
                return;
            }

            window.location.href =
                `/paginas/detallesEventos.html?id=${encodeURIComponent(idEvento)}`;
        });
    });
});
