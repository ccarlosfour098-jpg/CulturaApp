
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

async function probarGemini() {
    if (!process.env.GEMINI_API_KEY) {
        console.error("ERROR: No se encontró GEMINI_API_KEY en .env");
        process.exitCode = 1;
        return;
    }

    const genAI = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });

    const comentarios = [
        "La música tradicional fue excelente y el ambiente muy agradable.",
        "Me gustó la organización, pero faltó información sobre los horarios.",
        "El evento fue interesante y disfruté las actividades culturales."
    ];

    try {
        console.log("Enviando comentarios de prueba a Gemini...");

        const respuesta = await genAI.models.generateContent({
            model: "gemini-3.8-flash",
            contents: `
Analiza estos comentarios ficticios sobre un evento cultural:
${JSON.stringify(comentarios)}

Responde en español con:
1. Sentimiento general.
2. Puntuación de percepción de 1 a 10.
3. Dos fortalezas.
4. Dos recomendaciones de mejora.

Indica que el análisis es demostrativo porque los comentarios son ficticios.
`
        });

        console.log("\nRESPUESTA DE GEMINI:\n");
        console.log(respuesta.text);

    } catch (error) {
        console.error("\nNo fue posible consultar Gemini.");

        console.error(
            "Código:",
            error.status || error.code || "No disponible"
        );

        console.error(
            "Detalle:",
            error.message
        );

        process.exitCode = 1;
    }
}

probarGemini();
