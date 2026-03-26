const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")
const admin = require("firebase-admin")

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

// 🔥 CONFIG FIREBASE SEGURA
let db = null

try {

  if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    console.log("⚠️ Firebase NO configurado (faltan variables)")
  } else {

    const serviceAccount = {
      type: "service_account",
      project_id: "smartfinques-app-7f09c",
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      })
    }

    db = admin.firestore()
    console.log("🔥 Firebase conectado")

  }

} catch (error) {
  console.log("❌ Error inicializando Firebase:", error.message)
}

// 🔹 CONFIG
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

const delay = (ms) => new Promise(r => setTimeout(r, ms))

// 🔥 LIMPIAR FOTOS
function limpiarFotos(p) {

  const fotos = []

  for (let i = 1; i <= 20; i++) {

    const f = p[`foto${i}`]

    if (!f) continue

    if (typeof f === "string") {
      fotos.push(f)
    }

    if (typeof f === "object" && f._) {
      fotos.push(f._)
    }

  }

  return fotos
}

// 🔥 NORMALIZAR
function normalizar(p) {

  return {
    referencia: p.ref || "",
    titulo: p.titulo1 || "",
    descripcion: p.descrip1 || "",
    precio: parseFloat(p.precioinmo || 0),
    ciudad: p.ciudad || "",
    zona: p.zona || "",
    latitud: parseFloat(p.latitud || 0),
    longitud: parseFloat(p.altitud || 0),

    // 🔑 CLAVE PARA BASE44
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

  console.log("📊 Total:", props.length)

  return props.map(normalizar)

}

// 🔹 SYNC BASE44
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

      console.log("✅", p.referencia)
      ok++

    } catch (err) {

      console.log("❌", p.referencia)

      if (err.response?.data) {
        console.log("📛", JSON.stringify(err.response.data))
      }

      fail++

    }

    await delay(200)

  }

  return { ok, fail }

}

// 🔥 FIREBASE FUNCTIONS
async function guardarLead(data) {

  if (!db) {
    console.log("⚠️ Firebase no activo")
    return
  }

  await db.collection("leads").add({
    ...data,
    createdAt: new Date()
  })

}

async function crearUsuario(user) {

  if (!db) {
    console.log("⚠️ Firebase no activo")
    return
  }

  await db.collection("users").doc(user.id).set({
    email: user.email,
    role: "user"
  })

}

// 🚀 SYNC VISUAL
app.get("/sync", async (req, res) => {

  try {

    console.log("🚀 Iniciando sync...")

    const props = await cargarXML()
    const result = await syncBase44(props)

    res.send(`
      <h1>Sync completado</h1>
      <p>OK: ${result.ok}</p>
      <p>ERROR: ${result.fail}</p>
    `)

  } catch (error) {

    console.log("❌ ERROR GLOBAL:", error)

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

  } catch (error) {

    console.log(error)
    res.json({ error: true })

  }

})

// TEST
app.get("/", (req, res) => {
  res.json({ status: "ok" })
})

app.listen(PORT, () => {
  console.log("🚀 Servidor activo en puerto", PORT)
})
