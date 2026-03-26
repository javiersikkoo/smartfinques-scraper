const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")
const admin = require("firebase-admin")

// 🔥 FIREBASE
if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error("❌ Faltan variables de entorno de Firebase")
  process.exit(1)
}

const serviceAccount = {
  type: "service_account",
  project_id: "smartfinques-app-7f09c",
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

// ⏳ Delay
function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// 🔧 LIMPIAR FOTOS
function limpiarFotos(fotosRaw) {
  const fotos = []

  for (let f of fotosRaw) {
    if (typeof f === "string") fotos.push(f)
    else if (typeof f === "object" && f._) fotos.push(f._)
  }

  return fotos
}

// 🧠 EXTRAER CARACTERÍSTICAS DINÁMICAS
function extraerCaracteristicas(p) {
  const caracteristicas = {}

  for (let key in p) {

    let valor = p[key]

    // ignoramos campos grandes o innecesarios
    if (
      key.includes("foto") ||
      key === "titulo1" ||
      key === "descrip1"
    ) continue

    // limpiar valores tipo objeto
    if (typeof valor === "object" && valor._) {
      valor = valor._
    }

    // convertir booleanos
    if (valor === "1") valor = "Sí"
    if (valor === "0") valor = "No"

    // evitar nulls
    if (valor === "" || valor == null) continue

    // formatear nombre bonito
    const nombre = key
      .replace(/_/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase())

    caracteristicas[nombre] = valor
  }

  return caracteristicas
}

// 📥 CARGAR XML
async function cargarXML() {

  console.log("📥 Descargando XML...")

  const response = await axios.get(XML_URL)
  const parsed = await xml2js.parseStringPromise(response.data, {
    explicitArray: false
  })

  const props = parsed?.propiedades?.propiedad || []

  console.log(`📊 Propiedades: ${props.length}`)

  const results = []

  for (const p of props) {

    let fotosRaw = []

    for (let i = 1; i <= 20; i++) {
      if (p[`foto${i}`]) fotosRaw.push(p[`foto${i}`])
    }

    const fotos = limpiarFotos(fotosRaw)
    const caracteristicas = extraerCaracteristicas(p)

    results.push({
      referencia: p.ref || "",
      titulo: p.titulo1 || "",
      descripcion: p.descrip1 || "",
      precio: parseFloat(p.precioinmo || 0),
      ciudad: p.ciudad || "",
      zona: p.zona || "",
      tipo_inmueble: p.tipo || "vivienda",
      latitud: parseFloat(p.latitud || 0),
      longitud: parseFloat(p.altitud || 0),
      fotos,
      caracteristicas // 🔥 LO IMPORTANTE
    })
  }

  return results
}

// 🔄 SYNC
async function syncBase44(propiedades) {

  const existing = await axios.get(BASE44_URL, {
    headers: { api_key: API_KEY }
  })

  for (const p of propiedades) {

    try {

      const yaExiste = existing.data.find(x => x.referencia === p.referencia)

      if (yaExiste) {
        await axios.put(`${BASE44_URL}/${yaExiste.id}`, p, {
          headers: { api_key: API_KEY }
        })
        console.log(`🔁 ${p.referencia}`)
      } else {
        await axios.post(BASE44_URL, p, {
          headers: { api_key: API_KEY }
        })
        console.log(`🆕 ${p.referencia}`)
      }

      await delay(200)

    } catch (e) {
      console.log(`❌ Error en ${p.referencia}`)
    }
  }
}

// 🚀 SYNC ENDPOINT
app.get("/sync", async (req, res) => {

  res.setHeader("Content-Type", "text/plain")

  try {
    res.write("🚀 Sync iniciado\n")

    const props = await cargarXML()
    await syncBase44(props)

    res.write("✅ Sync completado\n")
    res.end()

  } catch (e) {
    console.log(e)
    res.write("❌ Error\n")
    res.end()
  }
})

// 🔥 LEADS
app.post("/lead", async (req, res) => {
  await db.collection("leads").add({
    ...req.body,
    createdAt: new Date()
  })
  res.json({ ok: true })
})

// 🏠 HOME
app.get("/", (req, res) => {
  res.send("Servidor activo 🚀")
})

// 🚀 START
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor activo en puerto ${PORT}`)
})
