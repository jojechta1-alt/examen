// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyB29Drmdr0vRNc1ocWS92iNnUB1QRCbx2o",
  authDomain: "chrono-vision-8cc8a.firebaseapp.com",
  projectId: "chrono-vision-8cc8a",
  storageBucket: "chrono-vision-8cc8a.firebasestorage.app",
  messagingSenderId: "1043859115994",
  appId: "1:1043859115994:web:5b9f474dffb464e6d23ae3",
  measurementId: "G-540D9LH1DV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios que usarás en el proyecto
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

export default app;