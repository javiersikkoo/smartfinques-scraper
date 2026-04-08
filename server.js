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
// 🚀 FUNCIÓN MAESTRA NOTIFICACIONES
// ===============================
async function enviarNotificacion(tipo, data) {
  console.log(`🔔 Notificación [${tipo}]:`, data.mensaje);
  
  // Aquí podrías integrar en el futuro:
  // - Firebase Cloud Messaging (Push)
  // - SendGrid (Emails)
  // - WhatsApp API
  
  try {
    await db.collection("notifications").add({
      tipo,
      ...data,
      read: false,
      createdAt: new Date()
    });
  } catch (e) {
    console.error("❌ Error guardando notificación:", e.message);
  }
}

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
// 🔹 SYNC BASE44
// ===============================
async function syncBase44Safe(properties) {
  let existingProps = [];

  try {
    const existing = await axios.get(BASE44_URL, {
      headers: { api_key: API_KEY }
    });

    existingProps = Array.isArray(existing.data)
      ? existing.data
      : existing.data.data || [];

  } catch (err) {
    console.error("❌ Error Base44:", err.message);
  }

  const batchSize = 5;

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);

    await Promise.all(batch.map(async (p) => {
      try {
        const found = existingProps.find(x => x.referencia === p.referencia);

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

      } catch (e) {
        console.error("❌ Error propiedad:", p.referencia);
      }
    }));

    await delay(1000);
  }
}

// ===============================
// 🔹 SYNC ENDPOINT
// ===============================
async function handleSync(req, res) {
  try {
    const properties = await cargarXML();
    await syncBase44Safe(properties);

    res.json({ ok: true, total: properties.length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.post('/sync', handleSync);
app.get('/sync', handleSync);

// ===============================
// 🔹 REGISTER USER (MEJORADO)
// ===============================
app.post("/register", async (req, res) => {
  try {
    const { userId, email, name, telefono, preferencias } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "Faltan datos esenciales" });
    }

    const userData = {
      email,
      name: name || "",
      telefono: telefono || "",
      preferencias: preferencias || {},
      role: "user", // Rol por defecto
      createdAt: new Date()
    };

    await db.collection("users").doc(userId).set(userData, { merge: true });

    // Notificar registro
    await enviarNotificacion("NUEVO_USUARIO", {
      mensaje: `Nuevo usuario registrado: ${email}`,
      userId
    });

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===============================
// 🔹 UPDATE ROLE (NUEVO PARA BASE44/ADMIN)
// ===============================
app.post("/update-role", async (req, res) => {
  try {
    const { userId, newRole } = req.body; // roles: 'user', 'comercial', 'admin'

    if (!userId || !newRole) {
      return res.status(400).json({ error: "userId y newRole son requeridos" });
    }

    await db.collection("users").doc(userId).update({
      role: newRole
    });

    res.json({ ok: true, message: `Rol actualizado a ${newRole}` });

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

    if (!userId) {
      return res.status(400).json({ error: "userId requerido" });
    }

    await db.collection("users").doc(userId).set(data, { merge: true });

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===============================
// 🔹 GET USERS (ADMIN PANEL)
// ===============================
app.get("/users", async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();

    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(users);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===============================
// 🔹 LEADS (CON NOTIFICACIÓN)
// ===============================
app.post("/lead", async (req, res) => {
  try {
    if (!req.body.email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    const leadRef = await db.collection("leads").add({
      ...req.body,
      estado: "nuevo",
      asignadoA: null,
      createdAt: new Date()
    });

    // Notificar nuevo lead
    await enviarNotificacion("NUEVO_LEAD", {
      mensaje: `Nuevo lead de interés: ${req.body.email}`,
      leadId: leadRef.id
    });

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===============================
// 🔹 ASSIGN LEAD
// ===============================
app.post("/assign-lead", async (req, res) => {
  try {
    const { leadId, comercialId } = req.body;

    await db.collection("leads").doc(leadId).update({
      asignadoA: comercialId,
      estado: "asignado"
    });

    res.json({ ok: true });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===============================
// 🔹 CHAT PRIVADO (CON NOTIFICACIÓN)
// ===============================
app.post("/chat", async (req, res) => {
  try {
    const { userId, propertyRef, message, senderRole } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const chatId = `${userId}_${propertyRef}`;

    await db.collection("chats")
      .doc(chatId)
      .collection("mensajes")
      .add({
        userId,
        senderRole: senderRole || "user",
        message,
        createdAt: new Date()
      });

    // Notificar mensaje si es del usuario hacia la inmobiliaria
    if (senderRole !== "admin" && senderRole !== "comercial") {
      await enviarNotificacion("NUEVO_MENSAJE_CHAT", {
        mensaje: `Mensaje de chat en propiedad ${propertyRef}`,
        chatId
      });
    }

    res.json({ ok: true, chatId });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===============================
// 🔹 HEALTH
// ===============================
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "SmartFinques API" });
});

// ===============================
// 🚀 START
// ===============================
app.listen(PORT, () => {
  console.log("🔥 SERVER RUNNING ON", PORT);
});
