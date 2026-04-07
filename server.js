const express = require('express');
const cors = require('cors');
const axios = require('axios');
const xml2js = require('xml2js');
const admin = require('firebase-admin');

// 🔥 Firebase Setup (SAFE)
const serviceAccount = {
  type: "service_account",
  project_id: "smartfinques-app-7f09c",
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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
// 🔹 PROPERTIES
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
// 🔹 SYNC BASE44 SEGURO CON BATCH + DELAY
// ===============================
async function syncBase44Safe(properties) {
  let existingProps = [];
  try {
    const existing = await axios.get(BASE44_URL, { headers: { api_key: API_KEY } });
    existingProps = Array.isArray(existing.data) ? existing.data : existing.data.data || [];
  } catch (err) {
    console.error("❌ Error al obtener propiedades existentes de Base44:", err.message);
  }

  const batchSize = 5; // Número de propiedades que se procesan en paralelo
  const delayBetweenBatches = 1000; // 1 segundo entre batches

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);

    // Ejecutamos las propiedades del batch en paralelo
    await Promise.all(batch.map(async (p) => {
      try {
        const found = existingProps.find(x => x.referencia === p.referencia);

        if (found) {
          await axios.put(`${BASE44_URL}/${found.id}`, p, { headers: { api_key: API_KEY } });
          console.log("🔁 Actualizado:", p.referencia);
        } else {
          await axios.post(BASE44_URL, p, { headers: { api_key: API_KEY } });
          console.log("🆕 Creado:", p.referencia);
        }
      } catch (propErr) {
        console.error(`❌ Error al procesar propiedad ${p.referencia}:`, propErr.message);
      }
    }));

    // Esperamos antes de pasar al siguiente batch
    await new Promise(r => setTimeout(r, delayBetweenBatches));
  }
}

async function handleSync(req, res) {
  try {
    let properties = [];
    try {
      properties = await cargarXML();
      console.log(`✅ XML cargado, propiedades encontradas: ${properties.length}`);
    } catch (xmlErr) {
      console.error("❌ Error al cargar XML:", xmlErr.message);
      return res.status(500).json({ error: "Error al cargar XML", details: xmlErr.message });
    }

    try {
      await syncBase44Safe(properties);
      console.log("✅ Sync completado");
      res.json({ ok: true, total: properties.length });
    } catch (syncErr) {
      console.error("❌ Error en syncBase44Safe:", syncErr.message);
      res.status(500).json({ error: "Error en syncBase44Safe", details: syncErr.message });
    }

  } catch (err) {
    console.error("❌ Error inesperado en /sync:", err.message);
    res.status(500).json({ error: "Error inesperado", details: err.message });
  }
}

// Registrar rutas
app.post('/sync', handleSync);
app.get('/sync', handleSync); // También funciona desde navegador

// ===============================
// 🔹 REGISTER USER
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
// 🔹 UPDATE USER
// ===============================
app.post("/update-user", async (req, res) => {
  try {
    const { userId, data } = req.body;

    if (!userId) return res.status(400).json({ error: "userId requerido" });

    await db.collection("users").doc(userId).update(data);

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
    if (!req.body.email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    await db.collection("leads").add({
      ...req.body,
      estado: "nuevo",
      createdAt: new Date()
    });

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ===============================
// 🔹 CHAT PRIVADO
// ===============================
app.post("/chat", async (req, res) => {
  try {
    const { userId, propertyRef, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const chatId = `${userId}_${propertyRef}`;

    await db.collection("chats")
      .doc(chatId)
      .collection("mensajes")
      .add({
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


// ===============================
// 🚀 START
// ===============================
app.listen(PORT, () => {
  console.log("🔥 SERVER RUNNING ON", PORT);
});
