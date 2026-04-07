const express = require('express');
const cors = require('cors');
const axios = require('axios');
const xml2js = require('xml2js');
const admin = require('firebase-admin');

// 🔐 FIREBASE CONFIG (SOLO ENV VARIABLES)
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

// 🔹 EXPRESS
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// 🔹 CONFIG
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble";
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d";
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml";

// 🔹 HELPERS
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================
// 🏠 XML → PROPERTIES
// ============================
async function cargarXML() {
  const response = await axios.get(XML_URL);
  const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false });
  const props = parsed?.propiedades?.propiedad || [];

  return props.map(p => {
    const fotos = [];
    for (let i = 1; i <= 20; i++) {
      if (p[`foto${i}`]) fotos.push(p[`foto${i}`]);
    }

    return {
      referencia: p.ref,
      titulo: p.titulo1 || "",
      descripcion: p.descrip1 || "",
      precio: parseFloat(p.precioinmo || 0),
      ciudad: p.ciudad,
      zona: p.zona,
      latitud: parseFloat(p.latitud || 0),
      longitud: parseFloat(p.altitud || 0),
      fotos,
      tipo_inmueble: p.tipo_ofer || "",
      operacion: p.accion?.toLowerCase() || "venta",
      habitaciones: parseInt(p.habitaciones || 0),
      banos: parseInt(p.banyos || 0),
      superficie: parseFloat(p.m_cons || 0),
      disponible: true
    };
  });
}

// ============================
// 🔄 SYNC BASE44
// ============================
async function syncBase44(properties) {
  const existing = await axios.get(BASE44_URL, { headers: { api_key: API_KEY } });

  for (const p of properties) {
    const found = existing.data.find(x => x.referencia === p.referencia);

    if (found) {
      await axios.put(`${BASE44_URL}/${found.id}`, p, {
        headers: { api_key: API_KEY }
      });
    } else {
      await axios.post(BASE44_URL, p, {
        headers: { api_key: API_KEY }
      });
    }

    await delay(300);
  }
}

// ============================
// 🔥 USUARIOS
// ============================
app.post("/api/register", async (req, res) => {
  const { userId, email, name } = req.body;

  try {
    await db.collection("users").doc(userId).set({
      email,
      name,
      role: "user",
      createdAt: new Date()
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================
// 🔥 LEADS
// ============================
app.post("/api/lead", async (req, res) => {
  try {
    const leadRef = await db.collection("leads").add({
      ...req.body,
      createdAt: new Date(),
      estado: "nuevo"
    });

    res.json({ ok: true, id: leadRef.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================
// 💬 CHAT PRO (REAL)
// ============================

// Crear chat si no existe
app.post("/api/chat/create", async (req, res) => {
  const { userId, inmueble_ref } = req.body;

  try {
    const existing = await db.collection("chats")
      .where("userId", "==", userId)
      .where("inmueble_ref", "==", inmueble_ref)
      .get();

    if (!existing.empty) {
      return res.json({ chatId: existing.docs[0].id });
    }

    const chat = await db.collection("chats").add({
      userId,
      inmueble_ref,
      createdAt: new Date()
    });

    res.json({ chatId: chat.id });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Enviar mensaje
app.post("/api/chat/message", async (req, res) => {
  const { chatId, sender, text } = req.body;

  try {
    await db.collection("messages").add({
      chatId,
      sender,
      text,
      createdAt: new Date()
    });

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================
// 🔔 NOTIFICACIONES
// ============================
app.post("/api/notify", async (req, res) => {
  const { token, title, body } = req.body;

  try {
    await admin.messaging().send({
      token,
      notification: { title, body }
    });

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================
// 🔄 SYNC MANUAL
// ============================
app.post("/sync", async (req, res) => {
  try {
    const properties = await cargarXML();
    await syncBase44(properties);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log("🚀 Server PRO activo");
});
