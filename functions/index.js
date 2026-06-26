const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Datos históricos de ejemplo por ubicación
const historicalDatabase = {
  "plaza-central": {
    year: 2010,
    description: "Plaza Central - Centro histórico bullicioso",
    population: 50000,
    landmarks: ["Fuente Principal", "Torre Comercial", "Palacio Municipal", "Biblioteca Antigua", "Plaza de Armas"]
  },
  "zona-industrial": {
    year: 2010,
    description: "Zona Industrial - Distrito manufacturero activo",
    population: 12000,
    landmarks: ["Fábrica Textil", "Puerto Fluvial", "Almacenes Centrales", "Taller Ferroviario", "Refinería"]
  },
  "mercado-historico": {
    year: 2010,
    description: "Mercado Histórico - Centro comercial tradicional",
    population: 8000,
    landmarks: ["Mercado Central", "Tiendas Coloniales", "Iglesia Parroquial", "Plazoleta del Arte", "Arcadas Antiguas"]
  },
  "parque-urbano": {
    year: 2010,
    description: "Parque Urbano - Espacio verde recreativo",
    population: 3000,
    landmarks: ["Lago Artificial", "Teatrino al Aire Libre", "Jardín Botánico", "Fuente de Cristal", "Paseo de Estatuas"]
  },
  "barrio-residencial": {
    year: 2010,
    description: "Barrio Residencial - Zona de viviendas tradicionales",
    population: 25000,
    landmarks: ["Casas Coloniales", "Escuela Pública", "Templo Antiguo", "Tiendas Locales", "Plazuela Tranquila"]
  }
};

/**
 * Cloud Function: Procesa imágenes detectadas por Chrono-Vision
 * - Recibe base64 de imagen, ubicación y datos del usuario
 * - Retorna datos históricos de esa ubicación
 * - Guarda registro en Firestore
 */
exports.processImage = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { imageBase64, location, userId, detected } = req.body;

    if (!imageBase64 || !location) {
      return res.status(400).json({ error: "Faltan parámetros: imageBase64, location" });
    }

    console.log(`📸 Procesando scan en ${location} por usuario ${userId}`);

    // Obtener datos históricos
    const historicalData = historicalDatabase[location] || {
      year: 2010,
      description: "Ubicación desconocida del pasado",
      population: 5000,
      landmarks: ["Estructura antigua", "Edificio histórico"]
    };

    // Guardar en Firestore (metadata)
    if (userId) {
      const scansRef = admin.firestore().collection("scans");
      await scansRef.add({
        userId,
        location,
        detected: detected || "desconocido",
        historicalData,
        imageSize: { width: 0, height: 0 }, // Agregado como placeholder
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: "processed"
      });
      console.log(`✓ Scan guardado en Firestore`);
    }

    // Responder con datos históricos
    return res.json({
      success: true,
      message: "Exploración completada",
      detected,
      location,
      historicalData,
      dimensions: { width: 1920, height: 1080 },
      reconstructionUrl: null
    });

  } catch (error) {
    console.error("❌ Error en processImage:", error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Cloud Function: Obtener escaneos del usuario
 */
exports.getUserScans = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "El usuario debe estar autenticado"
    );
  }

  try {
    const userId = context.auth.uid;
    const scansRef = admin.firestore().collection("scans");
    const query = scansRef.where("userId", "==", userId);
    const snapshot = await query.get();

    const scans = [];
    snapshot.forEach(doc => {
      scans.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, count: scans.length, scans };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

console.log("✓ Cloud Functions deployadas");