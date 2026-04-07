const express = require('express');
const cors = require('cors');
const axios = require('axios');
const xml2js = require('xml2js');
const admin = require('firebase-admin');

// 🔥 Firebase Setup
const serviceAccount = {
  type: "service_account",
  project_id: "smartfinques-app-7f09c",
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 🔹 Express
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// 🔹 Base44
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble";
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d";

// 🔹 XML
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml";

// 🔹 Delay
const delay = ms => new Promise(r => setTimeout(r, ms));


// ===============================
// 🔹 CARGAR XML
// ===============================
async function cargarXML() {
  const response = await axios.get(XML_URL);
  const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false });

  const props = parsed?.propiedades?.propiedad || [];
  const results = [];

  for (const p of props) {
    const fotos = [];
    for (let i = 1; i <= 20; i++) {
      if (p[`foto${i}`]) fotos.push(p[`foto${i}`]);
    }

    results.push({
      referencia: p.ref,
      titulo: p.titulo1 || "",
      descripcion: p.descrip1 || "",
      precio: parseFloat(p.precioinmo || 0),
      ciudad: p.ciudad || "",
      zona: p.zona || "",
      latitud: parseFloat(p.latitud || 0),
      longitud: parseFloat(p.altitud || 0),
      fotos,
      tipo_inmueble: p.tipo_ofer || "",
      operacion: p.accion?.toLowerCase() || "venta",
      habitaciones: parseInt(p.habitaciones || 0),
      banos: parseInt(p.banyos || 0),
      superficie: parseFloat(p.m_cons || 0),
      disponible: true
    });
  }

  return results;
}


// ===============================
// 🔹 ENDPOINT PROPERTIES (FIX SYNC)
// ===============================
app.get('/properties', async (req, res) => {
  try {
    const props = await cargarXML();
    res.json({ properties: props });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ===============================
// 🔹 SYNC BASE44 (FIXED)
// ===============================
async function syncBase44(properties) {
  const existing = await axios.get(BASE44_URL, {
    headers: { api_key: API_KEY }
  });

  for (const p of properties) {
    const found = existing.data.find(x => x.referencia === p.referencia);

    if (found) {
      await axios.put(`${BASE44_URL}/${found.id}`, p, {
        headers: { api_key: API_KEY }
      });
      console.log("🔁 Actualizado:", p.referencia);
    } else {
      await axios.post(BASE44_URL, p, {
        headers: { api_key: API_KEY }
      });
      console.log("🆕 Creado:", p.referencia);
    }

    await delay(300);
  }
}


// ===============================
// 🔹 SYNC MANUAL
// ===============================
app.post('/sync', async (req, res) => {
  try {
    console.log("🚀 Sync iniciado");

    const properties = await cargarXML();

    await syncBase44(properties);

    res.json({ ok: true, total: properties.length });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ===============================
// 🔹 USERS
// ===============================
app.post("/register", async (req, res) => {
  try {
    const { userId, email, name, telefono, preferencias } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    await db.collection("users").doc(userId).set({
      email,
      name: name || "",
      telefono: telefono || "",
      preferencias: preferencias || {},
      role: "user",
      createdAt: new Date()
    }, { merge: true });

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ===============================
// 🔹 LEADS
// ===============================
app.post("/lead", async (req, res) => {
  try {
    const lead = {
      ...req.body,
      estado: "nuevo",
      createdAt: new Date()
    };

    await db.collection("leads").add(lead);

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ===============================
// 🔹 CHAT PRIVADO (FIX REAL)
// ===============================
app.post("/chat", async (req, res) => {
  try {
    const { userId, propertyRef, message } = req.body;

    const chatId = `${userId}_${propertyRef}`;

    await db.collection("chats").doc(chatId).collection("mensajes").add({
      userId,
      message,
      createdAt: new Date()
    });

    res.json({ ok: true, chatId });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ===============================
// 🔹 HEALTH
// ===============================
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log("🔥 SERVER RUNNING ON", PORT);
});
