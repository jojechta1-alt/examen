// seed-firestore.js — Chrono-Vision
// Ejecutar: node seed-firestore.js

const admin = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("./serviceAccountKey.json");

const { initializeApp, cert } = admin;

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "chrono-vision-8cc8a.firebasestorage.app",
});

const db = getFirestore();
const bucket = getStorage().bucket();

// ─────────────────────────────────────────────
// 1. SUBIR LUGARES A FIRESTORE
// ─────────────────────────────────────────────
async function seedPlaces() {
  const places = JSON.parse(fs.readFileSync("./places.json", "utf8"));
  console.log(`📦 Subiendo ${places.length} lugares a Firestore...`);

  const batch = db.batch();
  for (const place of places) {
    const ref = db.collection("places").doc(place.id);
    batch.set(ref, {
      ...place,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  ✅ ${place.name}`);
  }
  await batch.commit();
  console.log("✅ Lugares subidos\n");
}

// ─────────────────────────────────────────────
// 2. TEMPLATE DE USUARIO
// ─────────────────────────────────────────────
async function seedUserTemplate() {
  await db.collection("users").doc("template").set({
    uid: "template",
    displayName: "Explorer",
    placesVisited: [],
    progress: 0,
    unlockedYears: [2077],
    createdAt: new Date(),
  });
  console.log("✅ Template de usuario creado\n");
}

// ─────────────────────────────────────────────
// 3. TIMELINE GLOBAL
// ─────────────────────────────────────────────
async function seedGlobalTimeline() {
  const timeline = [
    { id: "ev_001", year: 2025, title: "Inicio de la Gran Crisis Energética", description: "Los recursos fósiles colapsan.", impact: "global" },
    { id: "ev_002", year: 2031, title: "Primera Guerra por el Agua", description: "Conflictos armados por recursos hídricos.", impact: "global" },
    { id: "ev_003", year: 2045, title: "El Gran Colapso Urbano", description: "Las ciudades más grandes son abandonadas.", impact: "ciudad" },
    { id: "ev_004", year: 2060, title: "Proyecto Arca", description: "Supervivientes crean comunidades subterráneas.", impact: "global" },
    { id: "ev_005", year: 2070, title: "Creación de Chrono-Vision", description: "Organización secreta desarrolla el dispositivo.", impact: "tecnologia" },
    { id: "ev_006", year: 2077, title: "Presente: El mundo en ruinas", description: "Exploradores usan Chrono-Vision.", impact: "ciudad" },
  ];

  console.log(`📅 Subiendo ${timeline.length} eventos históricos...`);
  const batch = db.batch();
  for (const event of timeline) {
    const ref = db.collection("timeline").doc(event.id);
    batch.set(ref, { ...event, createdAt: new Date() });
    console.log(`  ✅ ${event.year}: ${event.title}`);
  }
  await batch.commit();
  console.log("✅ Timeline subido\n");
}

// ─────────────────────────────────────────────
// EJECUTAR TODO
// ─────────────────────────────────────────────
async function main() {
  console.log("🚀 Iniciando seed de Chrono-Vision...\n");
  try {
    await seedPlaces();
    await seedUserTemplate();
    await seedGlobalTimeline();
    console.log("🎉 Dataset completo cargado exitosamente!");
    console.log("\n📋 Colecciones creadas:");
    console.log("   • places    → 5 lugares históricos");
    console.log("   • users     → template de usuario");
    console.log("   • timeline  → 6 eventos históricos");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    process.exit(0);
  }
}

main();
