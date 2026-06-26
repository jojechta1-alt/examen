// firestore-service.js
// Encapsula todo el acceso a Firestore para que index.js y ml-model.js
// no hablen directo con la base de datos.

const admin = require('firebase-admin');

function getDb() {
  return admin.firestore();
}

/**
 * Obtiene los datos del sitio (ubicación, categoría, nombre).
 */
async function getSitio(sitioId) {
  const doc = await getDb().collection('sitios').doc(sitioId).get();
  if (!doc.exists) return null;
  return { sitio_id: doc.id, ...doc.data() };
}

/**
 * Busca el registro histórico más cercano al año objetivo para ese sitio.
 * Si no hay ninguno, retorna null (el modelo deberá usar un fallback genérico).
 */
async function getRegistroHistoricoMasCercano(sitioId, anioObjetivo) {
  const snap = await getDb()
    .collection('registros_historicos')
    .where('sitio_id', '==', sitioId)
    .get();

  if (snap.empty) return null;

  let mejor = null;
  let menorDiferencia = Infinity;

  snap.forEach(doc => {
    const data = doc.data();
    const diferencia = Math.abs(data.anio - anioObjetivo);
    if (diferencia < menorDiferencia) {
      menorDiferencia = diferencia;
      mejor = { registro_id: doc.id, ...data };
    }
  });

  return mejor;
}

/**
 * Guarda el resultado de la reconstrucción para auditoría / cache futuro.
 */
async function guardarReconstruccion(exploracionId, registroId, jsonResultado) {
  const ref = getDb().collection('reconstrucciones').doc();
  await ref.set({
    reconstruccion_id: ref.id,
    exploracion_id: exploracionId || null,
    registro_id: registroId || null,
    resultado: jsonResultado,
    estado: 'completado',
    creado_en: admin.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

module.exports = {
  getSitio,
  getRegistroHistoricoMasCercano,
  guardarReconstruccion
};
