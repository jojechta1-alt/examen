# 📦 Dataset - Chrono-Vision

## Estructura de archivos

```
dataset/
├── places.json          → 5 lugares históricos con datos completos
├── seed-firestore.js    → Script para subir todo a Firebase
├── firestore.rules      → Reglas de seguridad para Firestore
├── storage.rules        → Reglas de seguridad para Storage
└── placeholder-images/  → Crea esta carpeta y agrega tus imágenes
```

---

## 🚀 Pasos para cargar el dataset

### 1. Instalar dependencias
```bash
cd dataset
npm init -y
npm install firebase-admin
```

### 2. Obtener Service Account Key
1. Ve a Firebase Console → tu proyecto
2. ⚙️ Configuración del proyecto → Cuentas de servicio
3. Haz clic en **"Generar nueva clave privada"**
4. Guarda el archivo como `serviceAccountKey.json` en esta carpeta

### 3. Actualizar el bucket en seed-firestore.js
```js
// Línea ~14 en seed-firestore.js
storageBucket: "TU-PROJECT-ID.appspot.com"  // ← cambia esto
```

### 4. (Opcional) Agregar imágenes placeholder
Crea la carpeta `placeholder-images/` y agrega imágenes con estos nombres:
```
torre_central_ruins.jpg
torre_central_past.jpg
mercado_ruins.jpg
mercado_past.jpg
parque_ruins.jpg
parque_past.jpg
estacion_ruins.jpg
estacion_past.jpg
hospital_ruins.jpg
hospital_past.jpg
```

### 5. Ejecutar el seed
```bash
node seed-firestore.js
```

---

## 🗂️ Colecciones en Firestore

### `places` — Lugares históricos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | ID único del lugar |
| name | string | Nombre del lugar |
| description_ruins | string | Descripción en estado actual (2077) |
| description_past | string | Descripción en el pasado (2010) |
| coordinates | {x,y,z} | Posición en la escena A-Frame |
| category | string | arquitectura / comercio / transporte / salud / espacio_publico |
| historical_info | string | Historia detallada del lugar |
| ml_tags | string[] | Etiquetas para el modelo ML |
| events | array | Línea de tiempo de eventos del lugar |
| image_ruins | string | Path en Storage |
| image_past | string | Path en Storage |

### `timeline` — Eventos históricos globales
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | ID del evento |
| year | number | Año del evento |
| title | string | Título corto |
| description | string | Descripción del evento |
| impact | string | global / ciudad / tecnologia |

### `users` — Perfil del explorador
| Campo | Tipo | Descripción |
|-------|------|-------------|
| uid | string | ID de Firebase Auth |
| placesVisited | string[] | IDs de lugares visitados |
| progress | number | Porcentaje de exploración 0-100 |
| unlockedYears | number[] | Años desbloqueados con Chrono-Vision |

---

## 📍 Lugares incluidos

| ID | Lugar | Categoría | Coordenadas A-Frame |
|----|-------|-----------|---------------------|
| place_001 | Gran Torre Central | arquitectura | 0, 0, -20 |
| place_002 | Mercado Central | comercio | 15, 0, -10 |
| place_003 | Parque de la Memoria | espacio_publico | -20, 0, -15 |
| place_004 | Estación de Tren Norte | transporte | 25, 0, 10 |
| place_005 | Hospital San Rafael | salud | -10, 0, 20 |

---

## 🔗 Cómo acceder desde el frontend (app.js)

```javascript
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase-config.js";

// Obtener todos los lugares
const placesSnap = await getDocs(collection(db, "places"));
const places = placesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

// Obtener un lugar por ID
const placeRef = doc(db, "places", "place_001");
const placeSnap = await getDoc(placeRef);
const place = placeSnap.data();
```
