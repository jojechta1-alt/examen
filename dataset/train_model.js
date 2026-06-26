// train_model.js
// Entrena un clasificador de tipo de escena usando transfer learning sobre MobileNet.
// Estrategia: MobileNet congelado extrae características (embeddings) de cada foto,
// y solo entrenamos una capa densa pequeña encima para las 4 clases del dataset.
// Esto es viable con pocas decenas de imágenes (a diferencia de entrenar una CNN completa).
//
// Uso:
//   npm install @tensorflow/tfjs-node @tensorflow-models/mobilenet
//   node train_model.js
//
// Salida: ./model/ con el modelo entrenado en formato TFJS, listo para
// cargarse desde la Cloud Function (ver model-service.js).

const tf = require("@tensorflow/tfjs");
const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');
const path = require('path');

const DATASET_PATH = path.join(__dirname, 'dataset', 'dataset.json');
const MODEL_OUTPUT_DIR = path.join(__dirname, 'model');

async function cargarImagenComoTensor(rutaOUrl) {
  // En este script asumimos imágenes locales ya descargadas en ./dataset/imagenes/
  // (descargar las imagen_url del dataset.json antes de entrenar).
  const buffer = fs.readFileSync(rutaOUrl);
  const imagenDecodificada = tf.node.decodeImage(buffer, 3);
  const redimensionada = tf.image.resizeBilinear(imagenDecodificada, [224, 224]);
  imagenDecodificada.dispose();
  return redimensionada;
}

async function extraerEmbeddings(modeloBase, muestras, carpetaImagenes) {
  const embeddings = [];
  const etiquetas = [];

  for (const muestra of muestras) {
    const nombreArchivo = path.basename(muestra.imagen_url);
    const rutaLocal = path.join(carpetaImagenes, nombreArchivo);

    if (!fs.existsSync(rutaLocal)) {
      console.warn(`Falta la imagen local: ${rutaLocal} (descárgala desde ${muestra.imagen_url})`);
      continue;
    }

    const tensorImagen = await cargarImagenComoTensor(rutaLocal);
    const embedding = modeloBase.infer(tensorImagen, true); // true = devuelve embedding, no clasificación final
    embeddings.push(embedding);
    etiquetas.push(muestra.label);
    tensorImagen.dispose();
  }

  return { embeddings, etiquetas };
}

async function entrenar() {
  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
  const clases = dataset.clases;
  const carpetaImagenes = path.join(__dirname, 'dataset', 'imagenes');

  console.log('Cargando MobileNet (modelo base congelado)...');
  const modeloBase = await mobilenet.load({ version: 2, alpha: 1.0 });

  console.log(`Extrayendo embeddings de ${dataset.muestras.length} muestras...`);
  const { embeddings, etiquetas } = await extraerEmbeddings(modeloBase, dataset.muestras, carpetaImagenes);

  if (embeddings.length < clases.length) {
    console.error('No hay suficientes imágenes descargadas para entrenar. Revisa dataset/imagenes/.');
    process.exit(1);
  }

  const xs = tf.concat(embeddings, 0);
  const ys = tf.tensor2d(
    etiquetas.map(label => clases.map(c => (c === label ? 1 : 0)))
  );

  // Cabeza de clasificación pequeña: esto es lo único que se entrena.
  const modelo = tf.sequential();
  modelo.add(tf.layers.dense({ inputShape: [xs.shape[1]], units: 32, activation: 'relu' }));
  modelo.add(tf.layers.dense({ units: clases.length, activation: 'softmax' }));

  modelo.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  console.log('Entrenando la capa de clasificación...');
  await modelo.fit(xs, ys, {
    epochs: 30,
    batchSize: 8,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => console.log(`Época ${epoch + 1}: loss=${logs.loss.toFixed(3)} acc=${logs.acc.toFixed(3)}`)
    }
  });

  fs.mkdirSync(MODEL_OUTPUT_DIR, { recursive: true });
  await modelo.save(`file://${MODEL_OUTPUT_DIR}`);

  fs.writeFileSync(
    path.join(MODEL_OUTPUT_DIR, 'clases.json'),
    JSON.stringify(clases, null, 2)
  );

  console.log(`Modelo guardado en ${MODEL_OUTPUT_DIR}`);
}

entrenar().catch(err => {
  console.error('Error durante el entrenamiento:', err);
  process.exit(1);
});
