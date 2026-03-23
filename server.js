const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")
const admin = require("firebase-admin")

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

// 🔥 FIREBASE ADMIN SDK
const serviceAccount = require("./firebaseKey.json")

admin.initializeApp({
 credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// 🔗 XML INMOVILLA
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"

// 🔗 BASE44
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

// 🔹 delay
function delay(ms){
 return new Promise(r=>setTimeout(r,ms))
}

// 🔹 cargar XML
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

  const property={
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

  results.push(property)
 }

 return results
}

// 🔹 sync base44 sin duplicados
async function syncBase44(propiedades){

 const existing = await axios.get(BASE44_URL,{
  headers:{api_key:API_KEY}
 })

 const existentes = existing.data

 for(const p of propiedades){

  const yaExiste = existentes.find(x=>x.referencia === p.referencia)

  try{

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
   console.log("Error:",p.referencia)
  }

  await delay(300)
 }
}

// 🔥 CREAR CHAT PRIVADO
app.post("/chat/create", async (req,res)=>{

 const {userId, inmuebleRef} = req.body

 const chatRef = await db.collection("chats").add({
  userId,
  inmuebleRef,
  createdAt: new Date()
 })

 res.json({chatId: chatRef.id})
})

// 🔥 ENVIAR MENSAJE
app.post("/chat/send", async (req,res)=>{

 const {chatId, senderId, text} = req.body

 await db.collection("messages").add({
  chatId,
  senderId,
  text,
  createdAt: new Date()
 })

 res.json({ok:true})
})

// 🔔 NOTIFICACIÓN
app.post("/notify", async (req,res)=>{

 const {userId, title, body} = req.body

 await db.collection("notifications").add({
  userId,
  title,
  body,
  read:false,
  createdAt:new Date()
 })

 res.json({ok:true})
})

// 🔥 SYNC MANUAL
app.post("/sync", async (req,res)=>{

 const props = await cargarXML()
 await syncBase44(props)

 res.json({ok:true})
})

// STATUS
app.get("/",(req,res)=>{
 res.json({status:"ok"})
})

app.listen(PORT,()=>console.log("Servidor activo"))
