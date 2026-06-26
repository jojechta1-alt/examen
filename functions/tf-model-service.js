// tf-model-service.js
// Cliente liviano que llama al servicio Cloud Run "ML (tensorflow)" en vez
// de cargar el modelo dentro de la Cloud Function. Esto evita el cold start
// pesado de tfjs-node en Functions y deja la inferencia donde corresponde:
// un servicio con más memoria/CPU dedicado, que escala independientemente.

const fetch = require('node-fetch');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL; // ej: https://chrono-vision-ml-xxxxx-uc.a.run.app

/**
 * Clasifica la imagen del sitio llamando al servicio Cloud Run.
 * Devuelve { tipo_escena, confianza_modelo } igual que antes — el contrato
 * con ml-model.js no cambia, solo cambia dónde corre la inferencia.
 */
async function clasificarImagen(urlImagen) {
  if (!ML_SERVICE_URL) {
    throw new Error('ML_SERVICE_URL no está configurada (variable de entorno de la Cloud Function)');
  }

  const res = await fetch(`${ML_SERVICE_URL}/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url_imagen: urlImagen }),
    timeout: 15000
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(`Servicio ML respondió ${res.status}: ${detalle}`);
  }

  const data = await res.json();
  return { tipo_escena: data.tipo_escena, confianza_modelo: data.confianza_modelo };
}

module.exports = { clasificarImagen };
