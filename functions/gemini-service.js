// gemini-service.js
// Etapa 1 del pipeline: recibe la URL de la imagen (subida a Storage/S3) y le
// pregunta a Gemini dónde está y cuál es su historia. Devuelve un JSON de
// contexto que alimentará al modelo de TensorFlow en la etapa 2.

const fetch = require('node-fetch');

const GEMINI_API_KEY = "AQ.Ab8RN6Js7OA8rIKSuFcX1GttXQJljEId78-yAtdl-tFoxgB0Ig";
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Pide a Gemini que identifique el lugar y resuma su historia a partir de la imagen.
 * Le exigimos que responda SOLO JSON para poder parsear sin fricción.
 */
async function obtenerContextoHistorico(urlImagen, anioObjetivo) {
  const prompt = `Eres un asistente de un sistema de reconstrucción histórica llamado Chrono-Vision.
Dada la imagen en esta URL: ${urlImagen}
1. Identifica dónde está ubicado este lugar (ciudad/distrito si es posible).
2. Cuéntame brevemente su historia, enfocándote en cómo era alrededor del año ${anioObjetivo}.
3. Describe qué estructuras o elementos (edificios, vegetación, calles) probablemente existían en esa época.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, con esta forma exacta:
{
  "ubicacion_estimada": "string",
  "resumen_historico": "string",
  "elementos_probables": [
    {"tipo": "edificio|vegetacion|calle", "descripcion": "string"}
  ],
  "confianza_identificacion": 0.0
}`;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${"AQ.Ab8RN6Js7OA8rIKSuFcX1GttXQJljEId78-yAtdl-tFoxgB0Ig"}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini respondió con error ${res.status}`);
  }

  const data = await res.json();
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  return parsearJsonSeguro(texto);
}

function parsearJsonSeguro(texto) {
  try {
    // Gemini a veces envuelve el JSON en ```json ... ``` aunque se le pida que no lo haga
    const limpio = texto.replace(/```json|```/g, '').trim();
    return JSON.parse(limpio);
  } catch (err) {
    console.warn('No se pudo parsear la respuesta de Gemini, usando fallback:', err.message);
    return {
      ubicacion_estimada: 'desconocida',
      resumen_historico: '',
      elementos_probables: [],
      confianza_identificacion: 0.3
    };
  }
}

module.exports = { obtenerContextoHistorico };
