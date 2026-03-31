const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")

// 🔥 FIREBASE
const admin = require("firebase-admin")

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

// 🔐 Firebase seguro (Render ENV)
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null

if (!admin.apps.length && privateKey && process.env.FIREBASE_CLIENT_EMAIL) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "smartfinques-app-7f09c",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    })
  })
  console.log("🔥 Firebase conectado")
} else {
  console.log("⚠️ Firebase NO configurado")
}

const db = admin.apps.length ? admin.firestore() : null

// 🔗 CONFIG
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

// ⏱ delay
function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// 🧠 LIMPIAR FOTOS
function limpiarFotos(fotos) {
  return fotos.map(f => {
    if (typeof f === "string") return f
    if (typeof f === "object" && f._) return f._
    return null
  }).filter(Boolean)
}

// 🔹 CARGAR XML
async function cargarXML() {
  console.log("📥 Descargando XML...")

  const response = await axios.get(XML_URL)
  const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false })
  const props = parsed?.propiedades?.propiedad || []

  console.log("📊 Propiedades encontradas:", props.length)

  const results = []

  for (const p of props) {

    const fotosRaw = []
    for (let i = 1; i <= 20; i++) {
      if (p[`foto${i}`]) fotosRaw.push(p[`foto${i}`])
    }

    const fotos = limpiarFotos(fotosRaw)

    results.push({
      referencia: p.ref,
      titulo: p.titulo1 || "",
      descripcion: p.descrip1 || "",
      precio: parseFloat(p.precioinmo || 0),
      ciudad: p.ciudad || "",
      zona: p.zona || "",
      latitud: parseFloat(p.latitud || 0),
      longitud: parseFloat(p.altitud || 0),
      tipo_inmueble: p.tipo || "desconocido",
      fotos,
      vendido: false,
      fecha_actualizacion: new Date()
    })
  }

  return results
}

// 🔹 SYNC PRO
async function syncBase44(propiedades) {

  console.log("🔄 Sincronizando con Base44...")

  const existingRes = await axios.get(BASE44_URL, {
    headers: { api_key: API_KEY }
  })

  const existentes = existingRes.data

  const refsXML = propiedades.map(p => p.referencia)

  let ok = 0
  let fail = 0
  let nuevos = 0
  let vendidos = 0

  // 🟢 CREAR / ACTUALIZAR
  for (const p of propiedades) {
    try {
      const existe = existentes.find(x => x.referencia === p.referencia)

      if (existe) {
        await axios.put(`${BASE44_URL}/${existe.id}`, p, {
          headers: { api_key: API_KEY }
        })
        console.log("🔁 Actualizado:", p.referencia)
      } else {
        await axios.post(BASE44_URL, {
          ...p,
          fecha_creacion: new Date()
        }, {
          headers: { api_key: API_KEY }
        })
        console.log("🆕 Nuevo:", p.referencia)
        nuevos++

        // 🔔 ALERTA FIREBASE
        if (db) {
          await db.collection("alertas").add({
            tipo: "nuevo_inmueble",
            referencia: p.referencia,
            fecha: new Date()
          })
        }
      }

      ok++
    } catch (err) {
      console.log("❌ Error en", p.referencia)
      fail++
    }

    await delay(200)
  }

  // 🔴 MARCAR COMO VENDIDOS
  for (const e of existentes) {
    if (!refsXML.includes(e.referencia)) {
      try {
        await axios.put(`${BASE44_URL}/${e.id}`, {
          ...e,
          vendido: true,
          fecha_actualizacion: new Date()
        }, {
          headers: { api_key: API_KEY }
        })

        console.log("🏷️ Marcado como vendido:", e.referencia)
        vendidos++
      } catch (err) {
        console.log("❌ Error marcando vendido:", e.referencia)
      }

      await delay(200)
    }
  }

  console.log("✅ OK:", ok)
  console.log("🆕 Nuevos:", nuevos)
  console.log("🏷️ Vendidos:", vendidos)
  console.log("❌ Fallidos:", fail)

  return { ok, nuevos, vendidos, fail }
}

// 🌐 ENDPOINT VISUAL
app.get("/sync", async (req, res) => {

  try {
    console.log("🚀 Iniciando sync...")

    const props = await cargarXML()
    const result = await syncBase44(props)

    res.json({
      status: "SYNC COMPLETADO",
      ...result
    })

  } catch (err) {
    console.log("❌ ERROR GLOBAL:", err.message)
    res.status(500).json({ error: err.message })
  }
})

// 🟢 TEST
app.get("/", (req, res) => {
  res.send("Servidor funcionando")
})

// 🚀 ARRANQUE
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor activo en puerto ${PORT}`)
})
