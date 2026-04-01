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

// 🔹 Express Setup
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// 🔹 Base44 Setup
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble";
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d";

// 🔹 XML URL
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml";

// 🔹 Helper functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔹 Parse XML and normalize properties
async function cargarXML() {
  const response = await axios.get(XML_URL);
  const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false });
  const props = parsed?.propiedades?.propiedad || [];

  const results = [];
  
  // Process properties from XML
  for (const p of props) {
    const fotos = [];
    for (let i = 1; i <= 20; i++) {
      if (p[`foto${i}`]) fotos.push(p[`foto${i}`]);
    }

    const property = {
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

    results.push(property);
  }

  return results;
}

// 🔹 Sync Properties to Base44
async function syncBase44(properties) {
  const existing = await axios.get(BASE44_URL, { headers: { api_key: API_KEY } });

  for (const p of properties) {
    const alreadyExists = existing.data.find(x => x.referencia === p.referencia);

    if (alreadyExists) {
      await axios.put(`${BASE44_URL}/${alreadyExists.id}`, p, {
        headers: { api_key: API_KEY, "Content-Type": "application/json" }
      });
      console.log(`🔁 Actualizado: ${p.referencia}`);
    } else {
      await axios.post(BASE44_URL, p, {
        headers: { api_key: API_KEY, "Content-Type": "application/json" }
      });
      console.log(`🔄 Nuevo inmueble: ${p.referencia}`);
    }

    await delay(500); // Anti-rate limit
  }
}

// 🔹 Mark properties as sold when no longer in XML
async function markAsSold(propertiesInXml) {
  const existing = await axios.get(BASE44_URL, { headers: { api_key: API_KEY } });

  for (const property of existing.data) {
    const isInXml = propertiesInXml.some(p => p.referencia === property.referencia);
    
    if (!isInXml) {
      await axios.put(`${BASE44_URL}/${property.id}`, { ...property, disponible: false }, {
        headers: { api_key: API_KEY, "Content-Type": "application/json" }
      });
      console.log(`🔒 Marcado como vendido: ${property.referencia}`);
    }
  }
}

// 🔹 Save lead to Firebase
async function saveLead(data) {
  await db.collection("leads").add({
    ...data,
    createdAt: new Date()
  });
}

// 🔹 Save alert to Firebase
async function saveAlert(data) {
  await db.collection("alerts").add({
    ...data,
    createdAt: new Date()
  });
}

// 🔹 Create user in Firebase
async function createUser(user) {
  await db.collection("users").doc(user.id).set({
    email: user.email,
    role: "user"
  });
}

// 🔹 Sync Endpoint (manual)
app.post('/sync', async (req, res) => {
  try {
    console.log("🚀 Iniciando sync...");
    const properties = await cargarXML();
    console.log("📥 Descargando XML...");
    
    // Sync properties
    await syncBase44(properties);
    
    // Mark properties as sold
    await markAsSold(properties);
    
    console.log("✅ Sincronización completada");
    return res.json({ status: 'success' });
  } catch (err) {
    console.error("❌ Error en la sincronización:", err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// 🔹 Add new lead to Firebase
app.post('/api/lead', async (req, res) => {
  try {
    await saveLead(req.body);
    return res.json({ status: 'success' });
  } catch (err) {
    console.error("❌ Error al guardar lead:", err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// 🔹 Create user in Firebase
app.post('/api/usuario', async (req, res) => {
  try {
    await createUser(req.body);
    return res.json({ status: 'success' });
  } catch (err) {
    console.error("❌ Error al crear usuario:", err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// 🔹 Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 🔹 Start Server
app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en puerto ${PORT}`);
});
app.get("/test-firebase", async (req, res) => {
  try {
    await db.collection("test").add({ ok: true, fecha: new Date() })
    res.send("Firebase OK")
  } catch (e) {
    res.send("Firebase ERROR: " + e.message)
  }
})
// Endpoint para registrar usuarios en Firebase
app.post("/register", async (req, res) => {
  const { userId, email, name } = req.body;

  try {
    // Guardar usuario en Firebase
    await db.collection("users").doc(userId).set({
      email,
      name,
      createdAt: new Date(),
      role: "user",  // Aquí puedes definir un rol por defecto
    });

    res.status(200).json({ message: "Usuario registrado correctamente" });
  } catch (e) {
    res.status(500).json({ error: "Error al registrar usuario: " + e.message });
  }
});
// Endpoint para guardar leads en Firebase
app.post("/lead", async (req, res) => {
  const { name, email, phone, propertyReference } = req.body;

  try {
    // Guardar lead en Firebase
    await db.collection("leads").add({
      name,
      email,
      phone,
      propertyReference,
      createdAt: new Date(),
    });

    res.status(200).json({ message: "Lead guardado correctamente" });
  } catch (e) {
    res.status(500).json({ error: "Error al guardar lead: " + e.message });
  }
});
// Endpoint para guardar mensajes de chat en Firebase
app.post("/chat", async (req, res) => {
  const { userId, agentId, message } = req.body;

  try {
    // Crear una nueva colección de chats entre el usuario y el agente
    const chatRef = await db.collection("chats").add({
      userId,
      agentId,
      message,
      createdAt: new Date(),
    });

    res.status(200).json({ message: "Mensaje enviado correctamente", chatId: chatRef.id });
  } catch (e) {
    res.status(500).json({ error: "Error al enviar el mensaje: " + e.message });
  }
});
