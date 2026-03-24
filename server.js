const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")

// 🔥 FIREBASE
const admin = require("firebase-admin")

const serviceAccount = {
  type: "service_account",
  project_id: "smartfinques-app-7f09c",
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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

function delay(ms){
 return new Promise(r=>setTimeout(r,ms))
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

  results.push({
   referencia: p.ref,
   titulo: p.titulo1 || "",
   descripcion: p.descrip1 || "",
   precio: parseFloat(p.precioinmo || 0),
   ciudad: p.ciudad,
   zona: p.zona,
   latitud: parseFloat(p.latitud || 0),
   longitud: parseFloat(p.altitud || 0),
   fotos
  })
 }

 return results
}

// 🔹 SYNC BASE44
async function syncBase44(propiedades){

 const existing = await axios.get(BASE44_URL,{
  headers:{api_key:API_KEY}
 })

 for(const p of propiedades){

  const yaExiste = existing.data.find(x=>x.referencia === p.referencia)

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

// 🔥 GUARDAR LEAD EN FIREBASE
async function guardarLead(data){
 await db.collection("leads").add({
  ...data,
  createdAt: new Date()
 })
}

// 🔥 CREAR USUARIO EN FIREBASE
async function crearUsuario(user){
 await db.collection("users").doc(user.id).set({
  email:user.email,
  role:"user"
 })
}

// 🔥 API
app.post("/api", async (req,res)=>{

 const {action,data} = req.body

 try{

  if(action === "sync"){
   const props = await cargarXML()
   await syncBase44(props)
   return res.json({ok:true})
  }

  if(action === "lead"){
   await guardarLead(data)
   return res.json({ok:true})
  }

  if(action === "crearUsuario"){
   await crearUsuario(data)
   return res.json({ok:true})
  }

  return res.json({error:"acción no válida"})

 }catch(e){
  console.log(e)
  return res.json({error:true})
 }

})

// 🔹 HEALTH CHECK
app.get("/",(req,res)=>{
 res.json({status:"ok"})
})

// 🔹 START SERVER
app.listen(PORT,()=>{
 console.log("Servidor activo en puerto " + PORT)
})
