const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")
const admin = require("firebase-admin")

// 🔥 FIREBASE ADMIN
const serviceAccount = require("./firebase-key.json")

admin.initializeApp({
 credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

// 🔗 XML INMOVILLA
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"

// 🔗 BASE44
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const LEADS_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Lead"
const NOTI_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Notificacion"
const RESERVA_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Reserva"

const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

// 🔹 DELAY
function delay(ms){
 return new Promise(r=>setTimeout(r,ms))
}

// 🔹 SCORING LEADS
function calcularScore(mensaje){
 const m = (mensaje || "").toLowerCase()
 if(m.includes("visita") || m.includes("comprar") || m.includes("interesado")){
  return 90
 }
 return 50
}

// 🔹 CARGAR XML
async function cargarXML(){

 const response = await axios.get(XML_URL)
 const parsed = await xml2js.parseStringPromise(response.data,{explicitArray:false})

 const props = parsed?.propiedades?.propiedad || []
 const results=[]

 for(const p of props){

  const fotos=[]
  for(let i=1;i<=20;i++){
   if(p[`foto${i}`]) fotos.push(p[`foto${i}`])
  }

  const property = {
   referencia: p.ref,
   titulo: p.titulo1 || "",
   descripcion: p.descrip1 || "",
   precio: parseFloat(p.precioinmo || 0),

   ciudad: p.ciudad || "",
   zona: p.zona || "",

   tipo_inmueble: p.tipo_ofer,
   operacion: p.accion?.toLowerCase() || "venta",

   habitaciones: parseInt(p.habitaciones || 0),
   banos: parseInt(p.banyos || 0),

   superficie: parseFloat(p.m_cons || 0),

   latitud: parseFloat(p.latitud || 0),
   longitud: parseFloat(p.altitud || 0),

   fotos,
   disponible: true
  }

  results.push(property)
 }

 return results
}

// 🔹 SYNC BASE44 SIN DUPLICADOS
async function syncBase44(propiedades){

 const existing = await axios.get(BASE44_URL,{
  headers:{api_key:API_KEY}
 })

 for(const p of propiedades){

  try{

   const yaExiste = existing.data.find(x=>x.referencia === p.referencia)

   if(yaExiste){

    await axios.put(`${BASE44_URL}/${yaExiste.id}`,p,{
     headers:{
      api_key:API_KEY,
      "Content-Type":"application/json"
     }
    })

    console.log("Actualizado:",p.referencia)

   }else{

    await axios.post(BASE44_URL,p,{
     headers:{
      api_key:API_KEY,
      "Content-Type":"application/json"
     }
    })

    console.log("Creado:",p.referencia)
   }

  }catch(e){
   console.log("Error propiedad:",p.referencia)
  }

  await delay(300)
 }
}

// 🔥 CREAR LEAD + FIREBASE + NOTIFICACIÓN
app.post("/lead", async (req,res)=>{

 const {nombre,email,telefono,mensaje,inmueble_id} = req.body

 try{

  const score = calcularScore(mensaje)

  // Base44
  await axios.post(LEADS_URL,{
   nombre,
   email,
   telefono,
   mensaje,
   inmueble_id,
   score,
   estado:"nuevo"
  },{
   headers:{api_key:API_KEY}
  })

  // Firebase (guardar lead)
  await db.collection("leads").add({
   nombre,
   email,
   telefono,
   mensaje,
   inmueble_id,
   score,
   timestamp:new Date()
  })

  // Firebase notificación push
  await admin.messaging().send({
   notification:{
    title:"Nuevo lead 🔥",
    body:`${nombre} está interesado`
   },
   topic:"admins"
  })

  res.json({ok:true})

 }catch(e){
  console.log(e.message)
  res.json({error:true})
 }

})

// 🔥 CHAT TIEMPO REAL
app.post("/chat", async (req,res)=>{

 const {usuario,mensaje,inmueble_id} = req.body

 try{

  await db.collection("chats").add({
   usuario,
   mensaje,
   inmueble_id,
   timestamp:new Date()
  })

  res.json({ok:true})

 }catch(e){
  res.json({error:true})
 }

})

// 🔥 MÉTRICAS
app.post("/evento", async (req,res)=>{

 const {tipo,inmueble_id} = req.body

 try{

  await db.collection("eventos").add({
   tipo,
   inmueble_id,
   timestamp:new Date()
  })

  res.json({ok:true})

 }catch(e){
  res.json({error:true})
 }

})

// 🔥 RESERVAS
app.post("/reserva", async (req,res)=>{

 const {usuario_id,inmueble_id,fecha,hora} = req.body

 try{

  await axios.post(RESERVA_URL,{
   usuario_id,
   inmueble_id,
   fecha,
   hora,
   estado:"pendiente"
  },{
   headers:{api_key:API_KEY}
  })

  res.json({ok:true})

 }catch(e){
  res.json({error:true})
 }

})

// 🔥 SYNC MANUAL
app.post("/sync", async (req,res)=>{

 try{

  const props = await cargarXML()
  await syncBase44(props)

  res.json({ok:true})

 }catch(e){
  res.json({error:true})
 }

})

app.get("/",(req,res)=>{
 res.json({status:"🔥 SERVER PRO FIREBASE OK"})
})

app.listen(PORT,()=>{
 console.log("Servidor PRO con Firebase 🚀")
})
