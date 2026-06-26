// server.js — Servicio Cloud Run "ML (tensorflow)" del diagrama de arquitectura.
// Expone POST /classify: recibe la URL de una imagen y devuelve la
// clasificación de tipo de escena usando el modelo entrenado (transfer
// learning sobre MobileNet, ver dataset/train_model.js en la raíz del repo).

const express = require('express');
const tf = require('@tensorflow/tfjs-node');
const mobilenet = require('@tensorflow-models/mobilenet');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const MODEL_DIR = path.join(__dirname, 'model');
const PORT = process.env.PORT || 8080;

let modeloBase = null;
let modeloClasificador = null;
let clases = null;
let listo = false;

async function inicializarModelos() {
  console.log('Cargando MobileNet...');
  modeloBase = await mobilenet.load({ version: 2, alpha: 1.0 });

  console.log('Cargando clasificador entrenado...');
  clases = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'clases.json'), 'utf-8'));
  modeloClasificador = await tf.loadLayersModel(`file://${MODEL_DIR}/model.json`);

  listo = true;
  console.log('Modelos listos.');
}

async function descargarImagenComoTensor(urlImagen) {
  const res = await fetch(urlImagen);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const imagenDecodificada = tf.node.decodeImage(buffer, 3);
  const redimensionada = tf.image.resizeBilinear(imagenDecodificada, [224, 224]);
  imagenDecodificada.dispose();
  return redimensionada;
}

// Healthcheck — Cloud Run lo usa para saber si la instancia está lista
app.get('/health', (req, res) => {
  res.status(listo ? 200 : 503).json({ listo });
});

app.post('/classify', async (req, res) => {
  if (!listo) {
    return res.status(503).json({ error: 'El modelo todavía se está cargando, intenta en unos segundos' });
  }

  const { url_imagen } = req.body || {};
  if (!url_imagen) {
    return res.status(400).json({ error: 'url_imagen es obligatorio' });
  }

  let tensorImagen, embedding, prediccion;
  try {
    tensorImagen = await descargarImagenComoTensor(url_imagen);
    embedding = modeloBase.infer(tensorImagen, true);
    prediccion = modeloClasificador.predict(embedding);

    const probabilidades = await prediccion.data();
    const indiceMax = probabilidades.indexOf(Math.max(...probabilidades));

    res.status(200).json({
      tipo_escena: clases[indiceMax],
      confianza_modelo: Math.round(probabilidades[indiceMax] * 100) / 100,
      distribucion: clases.reduce((acc, c, i) => ({ ...acc, [c]: Math.round(probabilidades[i] * 100) / 100 }), {})
    });
  } catch (err) {
    console.error('Error clasificando imagen:', err);
    res.status(500).json({ error: 'No se pudo clasificar la imagen' });
  } finally {
    tensorImagen?.dispose();
    embedding?.dispose();
    prediccion?.dispose();
  }
});

inicializarModelos()
  .then(() => {
    app.listen(PORT, () => console.log(`Servicio ML escuchando en puerto ${PORT}`));
  })
  .catch(err => {
    console.error('No se pudieron cargar los modelos al iniciar:', err);
    process.exit(1);
  });
