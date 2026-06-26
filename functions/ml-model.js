// ml-model.js
// Etapa 2 del pipeline ("ML tensorflow" en el diagrama): recibe la imagen +
// el contexto histórico que ya devolvió Gemini (ubicación, resumen, elementos
// probables) y genera el JSON final de geometría 3D que consume A-Frame.
//
// La clasificación de imagen real corre en tf-model-service.js (modelo
// entrenado con transfer learning sobre MobileNet, ver dataset/train_model.js).
// Aquí solo se combina esa clasificación con el contexto de Gemini.

const { clasificarImagen } = require('./tf-model-service');

const TIPO_A_GEOMETRIA = {
  edificio: { dimensiones: { alto: 10, ancho: 7, profundidad: 7 }, color: '#cdbfa0' },
  vegetacion: { escala: 1 },
  calle: { dimensiones: { alto: 0.1, ancho: 6, profundidad: 20 }, color: '#444444' }
};

function ubicarElementos(elementosProbables) {
  return elementosProbables.map((el, i) => {
    const base = TIPO_A_GEOMETRIA[el.tipo] || TIPO_A_GEOMETRIA.edificio;
    const offsetX = (i % 3 - 1) * 4;
    const offsetZ = -5 - Math.floor(i / 3) * 4;

    return {
      tipo: el.tipo,
      descripcion: el.descripcion,
      posicion: { x: offsetX, y: 0, z: offsetZ },
      ...base
    };
  });
}

/**
 * Función principal de la etapa TensorFlow.
 * - urlImagen: foto actual del sitio (entra al clasificador real)
 * - contextoGemini: { ubicacion_estimada, resumen_historico, elementos_probables, confianza_identificacion }
 * - sitio: datos del sitio en Firestore
 * - anioObjetivo
 */
async function generarReconstruccion({ urlImagen, sitio, contextoGemini, anioObjetivo }) {
  let clasificacion = { tipo_escena: null, confianza_modelo: 0.5 };
  try {
    clasificacion = await clasificarImagen(urlImagen);
  } catch (err) {
    console.warn('Clasificador TensorFlow no disponible, se usa fallback por categoría del sitio:', err.message);
  }

  const tipoEscena = clasificacion.tipo_escena
    || (sitio?.categoria === 'natural' ? 'paisaje_natural' : 'calle_urbana');

  const elementosProbables = contextoGemini?.elementos_probables?.length
    ? contextoGemini.elementos_probables
    : [{ tipo: 'edificio', descripcion: 'estructura genérica' }];

  const elementos = ubicarElementos(elementosProbables);

  // Confianza final: promedio entre lo que dice Gemini (identificación del lugar)
  // y lo que dice TensorFlow (clasificación visual de la escena).
  const confianzaGemini = contextoGemini?.confianza_identificacion ?? 0.5;
  const confianza = Math.round(((confianzaGemini + clasificacion.confianza_modelo) / 2) * 100) / 100;

  return {
    sitio_id: sitio?.sitio_id || 'desconocido',
    anio_objetivo: anioObjetivo,
    confianza,
    ubicacion_estimada: contextoGemini?.ubicacion_estimada || null,
    resumen_historico: contextoGemini?.resumen_historico || null,
    escena: {
      tipo: tipoEscena,
      elementos,
      cielo: { color: '#87ceeb', hora: 'dia' }
    }
  };
}

module.exports = { generarReconstruccion };
