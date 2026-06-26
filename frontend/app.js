import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// ═══════════════════════════════════════════════════════════════
// 🔥 CONFIGURACIÓN FIREBASE
// ═══════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyB29Drmdr0vRNc1ocWS92iNnUB1QRCbx2o",
  authDomain: "chrono-vision-8cc8a.firebaseapp.com",
  projectId: "chrono-vision-8cc8a",
  storageBucket: "chrono-vision-8cc8a.firebasestorage.app",
  messagingSenderId: "1043859115994",
  appId: "1:1043859115994:web:5b9f474dffb464e6d23ae3",
  measurementId: "G-540D9LH1DV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ═══════════════════════════════════════════════════════════════
// 🎮 ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════
const state = {
  user: null,
  classifier: null,
  scanning: false,
  scannedLocations: new Set(),
  cloudFunctionUrl: "https://us-central1-chrono-vision-8cc8a.cloudfunctions.net/processImage"
};

// ═══════════════════════════════════════════════════════════════
// 🔐 AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════
window.loginWithGoogle = async function() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    state.user = result.user;
    updateAuthUI();
    showToast(`¡Bienvenido, ${result.user.displayName}!`);
  } catch (error) {
    console.error("Error login:", error);
    showToast("Error al iniciar sesión", "error");
  }
};

window.logout = async function() {
  try {
    await signOut(auth);
    state.user = null;
    state.scannedLocations.clear();
    updateAuthUI();
    showToast("Sesión cerrada");
  } catch (error) {
    console.error("Error logout:", error);
  }
};

onAuthStateChanged(auth, (user) => {
  state.user = user;
  updateAuthUI();
});

function updateAuthUI() {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const userLabel = document.getElementById("user-label");
  const scanBtn = document.getElementById("scan-btn");

  if (state.user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    userLabel.style.display = "block";
    userLabel.textContent = state.user.displayName || state.user.email;
    scanBtn.disabled = false;
    scanBtn.textContent = "📡 Activar Chrono-Vision";
    document.getElementById("progress-panel").style.display = "block";
    loadScannedLocations();
  } else {
    loginBtn.style.display = "flex";
    logoutBtn.style.display = "none";
    userLabel.style.display = "none";
    scanBtn.disabled = true;
    scanBtn.textContent = "🔒 Inicia sesión para explorar";
    document.getElementById("progress-panel").style.display = "none";
  }
}

// ═══════════════════════════════════════════════════════════════
// 🧠 ML5 INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════
async function initML5() {
  try {
    console.log("Inicializando ML5...");
    state.classifier = await ml5.imageClassifier("MobileNet");
    console.log("✓ ML5 listo");
  } catch (error) {
    console.error("Error ML5:", error);
    showToast("Error cargando ML5", "error");
  }
}

// ═══════════════════════════════════════════════════════════════
// 📸 SCANNER CON CLOUD FUNCTION
// ═══════════════════════════════════════════════════════════════
window.scanLocation = async function() {
  if (state.scanning || !state.user || !state.classifier) return;

  state.scanning = true;
  document.getElementById("scan-btn").disabled = true;
  document.getElementById("scan-overlay").classList.add("active");
  updateStatus("🔄 Escaneando...");

  try {
    // Obtener canvas de la escena A-Frame
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("No canvas encontrado");

    // Clasificar objetos detectados
    const results = await state.classifier.classify(canvas);
    const detected = results[0]?.label || "Estructura desconocida";
    const confidence = (results[0]?.confidence * 100).toFixed(1);

    updateStatus(`Detectado: ${detected} (${confidence}%)`);
    updateConfidence(confidence);

    // Convertir canvas a base64
    const imageBase64 = canvas.toDataURL("image/jpeg").split(",")[1];

    // Seleccionar ubicación (simulado)
    const locations = ["plaza-central", "zona-industrial", "mercado-historico"];
    const location = locations[Math.floor(Math.random() * locations.length)];

    showToast(`📤 Enviando a Cloud Functions...`);

    // ⭐ LLAMAR CLOUD FUNCTION
    const response = await fetch(state.cloudFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64,
        location,
        userId: state.user.uid,
        detected
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✓ Respuesta Cloud Function:", data);

    // Guardar en Firestore
    if (state.user) {
      await addDoc(collection(db, "users", state.user.uid, "scans"), {
        location,
        detected,
        confidence: parseFloat(confidence),
        historicalData: data.historicalData,
        timestamp: serverTimestamp(),
        imageSize: data.dimensions
      });

      state.scannedLocations.add(location);
      updateProgress();
    }

    // Mostrar información histórica
    showHistoricalInfo(data.historicalData);
    showToast("✓ Exploración completada", "success");

  } catch (error) {
    console.error("Error scan:", error);
    showToast(`Error: ${error.message}`, "error");
    updateStatus("Error durante el escaneo");
  } finally {
    state.scanning = false;
    document.getElementById("scan-btn").disabled = false;
    document.getElementById("scan-overlay").classList.remove("active");
    setTimeout(() => updateStatus("Listo para explorar"), 1000);
  }
};

// ═══════════════════════════════════════════════════════════════
// 🗂️ FIRESTORE - CARGAR ESCANEOS PREVIOS
// ═══════════════════════════════════════════════════════════════
async function loadScannedLocations() {
  if (!state.user) return;

  try {
    const q = query(
      collection(db, "users", state.user.uid, "scans"),
      where("location", "!=", "")
    );
    const querySnapshot = await getDocs(q);
    
    state.scannedLocations.clear();
    querySnapshot.forEach(doc => {
      state.scannedLocations.add(doc.data().location);
    });
    
    updateProgress();
  } catch (error) {
    console.error("Error cargando escaneos:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎨 MOSTRAR INFO HISTÓRICA
// ═══════════════════════════════════════════════════════════════
function showHistoricalInfo(historicalData) {
  if (!historicalData) return;

  const panel = document.getElementById("info-panel");
  document.getElementById("info-name").textContent = historicalData.description || "Ubicación desconocida";
  document.getElementById("info-desc").textContent = 
    `Población (2010): ${historicalData.population?.toLocaleString() || 'N/A'}\n` +
    `Principales lugares:\n${(historicalData.landmarks || []).join(', ') || 'N/A'}`;
  document.getElementById("info-years").textContent = 
    `Año 2010 → Año 2077 · Estado: Devastado`;

  // Inyectar reconstrucción en A-Frame
  reconstructSceneFromData(historicalData);

  panel.style.display = "block";
}

// ═══════════════════════════════════════════════════════════════
// 🏗️ RECONSTRUIR ESCENA EN A-FRAME
// ═══════════════════════════════════════════════════════════════
function reconstructSceneFromData(historicalData) {
  const root = document.getElementById("reconstruction-root");
  root.innerHTML = ""; // Limpiar

  if (!historicalData.landmarks || historicalData.landmarks.length === 0) return;

  const positions = [
    { x: -3, y: 1, z: -5 },
    { x: 2, y: 1.5, z: -7 },
    { x: 0, y: 1, z: -9 }
  ];

  historicalData.landmarks.slice(0, 3).forEach((landmark, i) => {
    const pos = positions[i];
    const entity = document.createElement("a-entity");
    
    // Crear edificio reconstruido
    const box = document.createElement("a-box");
    box.setAttribute("position", `${pos.x} ${pos.y} ${pos.z}`);
    box.setAttribute("width", (1.5 + Math.random()).toFixed(1));
    box.setAttribute("height", (2 + Math.random() * 2).toFixed(1));
    box.setAttribute("depth", "1.5");
    box.setAttribute("color", "#d9c9a3"); // Color del pasado
    box.setAttribute("material", "metalness: 0.1; roughness: 0.8");

    // Etiqueta
    const text = document.createElement("a-text");
    text.setAttribute("value", landmark.substring(0, 15));
    text.setAttribute("position", `${pos.x} ${pos.y + 2.5} ${pos.z}`);
    text.setAttribute("color", "#00ff88");
    text.setAttribute("align", "center");
    text.setAttribute("scale", "0.5 0.5 0.5");

    entity.appendChild(box);
    entity.appendChild(text);
    root.appendChild(entity);
  });

  // Cambiar cielo al pasado
  document.getElementById("sky").setAttribute("color", "#87ceeb");
  document.getElementById("year-badge").textContent = "VISTA DEL PASADO · 2010";
}

// ═══════════════════════════════════════════════════════════════
// 📊 INTERFAZ: PROGRESO, STATUS, NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════
function updateProgress() {
  const scanned = state.scannedLocations.size;
  const total = 5;
  const percent = (scanned / total) * 100;
  
  document.getElementById("progress-bar").style.width = percent + "%";
  document.getElementById("progress-text").textContent = `${scanned} / ${total} lugares`;
}

function updateStatus(text) {
  document.getElementById("status-line").textContent = text;
}

function updateConfidence(confidence) {
  const badge = document.getElementById("confidence-badge");
  badge.style.display = "block";
  badge.textContent = `CONFIANZA · ${confidence}%`;
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.display = "block";
  toast.style.background = type === "error" 
    ? "rgba(255, 80, 80, 0.15)" 
    : type === "success"
    ? "rgba(0, 255, 150, 0.15)"
    : "rgba(0, 255, 200, 0.15)";
  toast.style.color = type === "error" 
    ? "#ff6b6b" 
    : type === "success"
    ? "#00ff96"
    : "#00ffc8";
  
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════
// 🎯 INICIALIZACIÓN AL CARGAR
// ═══════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Chrono-Vision iniciando...");
  
  // Esperar a ML5
  if (typeof ml5 === "undefined") {
    showToast("Cargando ML5...");
    // Esperar un poco a que se cargue
    await new Promise(r => setTimeout(r, 2000));
  }
  
  await initML5();
  updateAuthUI();
  updateStatus("Listo. Inicia sesión para comenzar.");
});

// Vincular botón scan a la función
document.getElementById("scan-btn").addEventListener("click", scanLocation);

console.log("✓ app.js cargado");
