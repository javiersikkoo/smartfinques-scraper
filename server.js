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
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL
}

if (!admin.apps.length && serviceAccount.private_key && serviceAccount.client_email) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.apps.length ? admin.firestore() : null

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

function delay(ms){
 return new Promise(r=>setTimeout(r,ms))
}

// 🧠 LIMPIAR DATOS PRO
function limpiarPropiedad(p){

  const fotos=[]
  for(let i=1;i<=20;i++){
    if(p[`foto${i}`]) fotos.push(p[`foto${i}`])
  }

  return {
    referencia: p.ref || `REF-${Math.random()}`,
    titulo: p.titulo1 || "Sin título",
    descripcion: p.descrip1 || "",
    precio: isNaN(parseFloat(p.precioinmo)) ? 0 : parseFloat(p.precioinmo),

    ciudad: p.ciudad || "Desconocida",
    zona: p.zona || "",

    latitud: isNaN(parseFloat(p.latitud)) ? 0 : parseFloat(p.latitud),
    longitud: isNaN(parseFloat(p.altitud)) ? 0 : parseFloat(p.altitud),

    fotos
  }
}

// 🔹 CARGAR XML
async function cargarXML(log){

 log("📥 Descargando XML...")

 const response = await axios.get(XML_URL)
 const parsed = await xml2js.parseStringPromise(response.data,{explicitArray:false})
 const props = parsed?.propiedades?.propiedad || []

 log(`📊 Propiedades encontradas: ${props.length}`)

 const results=[]

 for(const p of props){
   const limpio = limpiarPropiedad(p)
   results.push(limpio)
 }

 return results
}

// 🔹 SYNC PRO
async function syncBase44(propiedades, log){

 const existing = await axios.get(BASE44_URL,{
  headers:{api_key:API_KEY}
 })

 let ok = 0
 let fail = 0

 for(const p of propiedades){

  try{

    const yaExiste = existing.data.find(x=>x.referencia === p.referencia)

    if(yaExiste){

      await axios.put(`${BASE44_URL}/${yaExiste.id}`,p,{
        headers:{api_key:API_KEY}
      })

      log(`🔁 Actualizado: ${p.referencia}`)

    }else{

      await axios.post(BASE44_URL,p,{
        headers:{api_key:API_KEY}
      })

      log(`🆕 Creado: ${p.referencia}`)
    }

    ok++

  }catch(e){

    fail++

    log(`❌ Error en ${p.referencia}`)

    if(e.response){
      log(`📛 Detalle: ${JSON.stringify(e.response.data)}`)
    }else{
      log(`📛 ${e.message}`)
    }
  }

  await delay(200)
 }

 log(`\n✅ OK: ${ok}`)
 log(`❌ FALLIDOS: ${fail}`)
}

// 🔥 FIREBASE
async function guardarLead(data){
 if(!db) return
 await db.collection("leads").add({
  ...data,
  createdAt: new Date()
 })
}

async function crearUsuario(user){
 if(!db) return
 await db.collection("users").doc(user.id).set({
  email:user.email,
  role:"user"
 })
}

// 🔥 API NORMAL
app.post("/api", async (req,res)=>{

 const {action,data} = req.body

 try{

  if(action === "lead"){
   await guardarLead(data)
   return res.json({ok:true})
  }

  if(action === "crearUsuario"){
   await crearUsuario(data)
   return res.json({ok:true})
  }

  res.json({error:"acción no válida"})

 }catch(e){
  console.log(e)
  res.json({error:true})
 }

})

// 🚀 SYNC VISUAL EN PANTALLA
app.get("/sync", async (req,res)=>{

 res.setHeader("Content-Type", "text/plain; charset=utf-8")

 const log = (msg)=>{
   console.log(msg)
   res.write(msg + "\n")
 }

 try{

  log("🚀 Iniciando sync...\n")

  const props = await cargarXML(log)

  await syncBase44(props, log)

  log("\n🎉 Sync terminado")

  res.end()

 }catch(e){

  log(`❌ ERROR GENERAL: ${e.message}`)
  res.end()
 }
})

// HEALTH CHECK
app.get("/",(req,res)=>{
 res.json({status:"ok"})
})

app.listen(PORT,()=>{
 console.log("Servidor activo en puerto " + PORT)
})
