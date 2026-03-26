const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")

// 🔥 FIREBASE
const admin = require("firebase-admin")

const serviceAccount = {
  type: "service_account",
  project_id: "smartfinques-app-7f09c",
  private_key: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

// delay anti rate-limit
const delay = ms => new Promise(r => setTimeout(r, ms))

// 🔥 LIMPIAR FOTOS (CLAVE)
function limpiarFotos(p) {
  const fotos = []

  for (let i = 1; i <= 20; i++) {
    const f = p[`foto${i}`]

    if (!f) continue

    // caso string normal
    if (typeof f === "string") {
      fotos.push(f)
    }

    // caso objeto raro del XML
    else if (typeof f === "object" && f._) {
      fotos.push(f._)
    }
  }

  return fotos
}

// 🔥 NORMALIZAR INMUEBLE
function normalizarPropiedad(p) {
  return {
    referencia: p.ref || "",
    titulo: p.titulo1 || "",
    descripcion: p.descrip1 || "",
    precio: parseFloat(p.precioinmo || 0),
    ciudad: p.ciudad || "",
    zona: p.zona || "",
    latitud: parseFloat(p.latitud || 0),
    longitud: parseFloat(p.altitud || 0),

    // 👇 SOLUCIÓN CLAVE
    tipo_inmueble: p.tipo || "vivienda",

    fotos: limpiarFotos(p)
  }
}

// 🔹 CARGAR XML
async function cargarXML() {
  console.log("📥 Descargando XML...")

  const response = await axios.get(XML_URL)

  const parsed = await xml2js.parseStringPromise(response.data, {
    explicitArray: false
  })

  const props = parsed?.propiedades?.propiedad || []

  console.log("📊 Propiedades encontradas:", props.length)

  return props.map(normalizarPropiedad)
}

// 🔹 SYNC BASE44 PRO
async function syncBase44(propiedades) {
  const existing = await axios.get(BASE44_URL, {
    headers: { api_key: API_KEY }
  })

  let ok = 0
  let fail = 0

  for (const p of propiedades) {
    try {
      const yaExiste = existing.data.find(
        x => x.referencia === p.referencia
      )

      if (yaExiste) {
        await axios.put(`${BASE44_URL}/${yaExiste.id}`, p, {
          headers: { api_key: API_KEY }
        })
      } else {
        await axios.post(BASE44_URL, p, {
          headers: { api_key: API_KEY }
        })
      }

      console.log("🔁 OK:", p.referencia)
      ok++

    } catch (err) {
      console.log("❌ Error en", p.referencia)

      if (err.response?.data) {
        console.log("📛 Detalle:", JSON.stringify(err.response.data))
      }

      fail++
    }

    await delay(200)
  }

  return { ok, fail }
}

// 🔥 FIREBASE
async function guardarLead(data) {
  await db.collection("leads").add({
    ...data,
    createdAt: new Date()
  })
}

async function crearUsuario(user) {
  await db.collection("users").doc(user.id).set({
    email: user.email,
    role: "user"
  })
}

// 🚀 ENDPOINT SYNC VISUAL
app.get("/sync", async (req, res) => {
  try {
    console.log("🚀 Iniciando sync...")

    const props = await cargarXML()
    const result = await syncBase44(props)

    res.send(`
      <h1>✅ Sync completado</h1>
      <p>OK: ${result.ok}</p>
      <p>Fallidos: ${result.fail}</p>
    `)

  } catch (e) {
    console.log("❌ ERROR GLOBAL:", e)
    res.send("<h1>Error en sync</h1>")
  }
})

// 🔥 API
app.post("/api", async (req, res) => {
  const { action, data } = req.body

  try {
    if (action === "lead") {
      await guardarLead(data)
      return res.json({ ok: true })
    }

    if (action === "crearUsuario") {
      await crearUsuario(data)
      return res.json({ ok: true })
    }

    res.json({ error: "acción no válida" })

  } catch (e) {
    console.log(e)
    res.json({ error: true })
  }
})

app.get("/", (req, res) => {
  res.json({ status: "ok" })
})

app.listen(PORT, () => {
  console.log("Servidor activo en puerto", PORT)
})
