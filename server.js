const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")
const admin = require("firebase-admin")

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

// 🔥 FIREBASE
const serviceAccount = require("./firebaseKey.json")

admin.initializeApp({
 credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// 🔗 XML
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"

// 🔗 BASE44
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

// 🔹 DELAY
const delay = ms => new Promise(r=>setTimeout(r,ms))

// 🔹 XML
async function cargarXML(){
 const res = await axios.get(XML_URL)
 const parsed = await xml2js.parseStringPromise(res.data,{explicitArray:false})

 const props = parsed?.propiedades?.propiedad || []

 return props.map(p=>{
  const fotos=[]
  for(let i=1;i<=20;i++){
   if(p[`foto${i}`]) fotos.push(p[`foto${i}`])
  }

  return {
   referencia:p.ref,
   titulo:p.titulo1 || "",
   descripcion:p.descrip1 || "",
   precio:parseFloat(p.precioinmo || 0),
   ciudad:p.ciudad,
   zona:p.zona,
   tipo_inmueble:p.tipo_ofer,
   operacion:p.accion?.toLowerCase() || "venta",
   habitaciones:parseInt(p.habitaciones || 0),
   banos:parseInt(p.banyos || 0),
   superficie:parseFloat(p.m_cons || 0),
   latitud:parseFloat(p.latitud || 0),
   longitud:parseFloat(p.altitud || 0),
   fotos,
   disponible:true
  }
 })
}

// 🔹 SYNC
async function syncBase44(propiedades){
 const existing = await axios.get(BASE44_URL,{
  headers:{api_key:API_KEY}
 })

 const existentes = existing.data

 for(const p of propiedades){

  const yaExiste = existentes.find(x=>x.referencia === p.referencia)

  if(yaExiste){
   await axios.put(`${BASE44_URL}/${yaExiste.id}`,p,{
    headers:{api_key:API_KEY}
   })
  }else{
   await axios.post(BASE44_URL,p,{
    headers:{api_key:API_KEY}
   })
  }

  await delay(300)
 }
}

// 🔥 USER CREATE
app.post("/user/create", async (req,res)=>{
 const {userId,email} = req.body

 console.log("USER CREATE:", req.body)

 await db.collection("users").doc(userId).set({
  email,
  rol:"user",
  createdAt:new Date()
 })

 res.json({ok:true})
})

// 🔥 COMERCIALES
app.get("/users/comerciales", async (req,res)=>{
 const snapshot = await db.collection("users")
  .where("rol","==","comercial")
  .get()

 const data = snapshot.docs.map(doc=>({
  id:doc.id,
  ...doc.data()
 }))

 res.json(data)
})

// 🔥 CREAR LEAD
app.post("/lead/create", async (req,res)=>{

 console.log("LEAD RECIBIDO:", req.body)

 const {nombre,email,telefono,inmuebleRef,userId} = req.body

 const lead = await db.collection("leads").add({
  nombre,
  email,
  telefono,
  inmuebleRef,
  userId,
  estado:"nuevo",
  asignadoA:null,
  createdAt:new Date()
 })

 res.json({ok:true, id:lead.id})
})

// 🔥 NOTIFICACIONES
async function crearNotificacion(userId, mensaje){
 await db.collection("notificaciones").add({
  userId,
  mensaje,
  leido:false,
  createdAt:new Date()
 })
}

// 🔥 ASIGNAR + NOTIFICAR
app.post("/lead/asignar", async (req,res)=>{

 const {leadId, comercialId} = req.body

 await db.collection("leads").doc(leadId).update({
  asignadoA:comercialId
 })

 await crearNotificacion(comercialId, "Nuevo lead asignado")

 res.json({ok:true})
})

// 🔥 ESTADO
app.post("/lead/estado", async (req,res)=>{
 const {leadId, estado} = req.body

 await db.collection("leads").doc(leadId).update({estado})

 res.json({ok:true})
})

// 🔥 BORRAR
app.post("/lead/delete", async (req,res)=>{
 const {leadId} = req.body

 await db.collection("leads").doc(leadId).delete()

 res.json({ok:true})
})

// 🔥 GET LEADS
app.post("/leads/get", async (req,res)=>{

 const {userId, rol} = req.body

 let query

 if(rol==="admin"){
  query = await db.collection("leads").get()
 }

 if(rol==="comercial"){
  query = await db.collection("leads")
   .where("asignadoA","==",userId)
   .get()
 }

 const leads = query.docs.map(doc=>({
  id:doc.id,
  ...doc.data()
 }))

 res.json(leads)
})

// 🔥 STATS COMERCIAL
app.post("/stats/comercial", async (req,res)=>{

 const {userId} = req.body

 const snapshot = await db.collection("leads")
  .where("asignadoA","==",userId)
  .get()

 let total=0, nuevo=0, contactado=0, cerrado=0

 snapshot.forEach(doc=>{
  total++
  const estado = doc.data().estado

  if(estado==="nuevo") nuevo++
  if(estado==="contactado") contactado++
  if(estado==="cerrado") cerrado++
 })

 res.json({total,nuevo,contactado,cerrado})
})

// 🔥 SYNC
app.post("/sync", async (req,res)=>{
 const props = await cargarXML()
 await syncBase44(props)
 res.json({ok:true})
})

app.get("/",(req,res)=>res.json({status:"ok"}))

app.listen(PORT,()=>console.log("Servidor activo"))
