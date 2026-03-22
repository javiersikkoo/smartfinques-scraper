const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"

const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const LEADS_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Leads"

const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

// 🔹 IA (usa OpenAI si quieres luego meter key)
async function generarRespuestaIA(mensaje){
 try{
  return `Gracias por tu interés. Hemos recibido tu mensaje: "${mensaje}". Un agente te contactará pronto.`
 }catch(e){
  return "Gracias por contactar, te responderemos pronto."
 }
}

// 🔹 SCORING LEADS
function calcularScore(mensaje){
 let score = 0

 if(mensaje.includes("visitar")) score += 5
 if(mensaje.includes("precio")) score += 2
 if(mensaje.length > 50) score += 2

 return Math.min(score,10)
}

// 🔹 CARGAR XML
async function cargarXML(){

 const response = await axios.get(XML_URL)
 const parsed = await xml2js.parseStringPromise(response.data,{explicitArray:false})

 const props = parsed?.propiedades?.propiedad || []
 const results=[]

 for(const p of props){

  const fotos = []
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
   tipo_inmueble: p.tipo_ofer,
   operacion: p.accion?.toLowerCase() || "venta",
   habitaciones: parseInt(p.habitaciones || 0),
   banos: parseInt(p.banyos || 0),
   superficie: parseFloat(p.m_cons || 0),
   latitud: parseFloat(p.latitud || 0),
   longitud: parseFloat(p.altitud || 0),
   fotos,
   disponible: true
  })
 }

 return results
}

// 🔹 SYNC
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
   console.log("Actualizado:",p.referencia)
  }else{
   await axios.post(BASE44_URL,p,{
    headers:{api_key:API_KEY}
   })
   console.log("Creado:",p.referencia)
  }
 }
}

// 🔥 API
app.post("/api", async (req,res)=>{

 const {action,data} = req.body

 try{

  // 🔄 SYNC
  if(action === "sync"){
   const props = await cargarXML()
   await syncBase44(props)
   return res.json({ok:true})
  }

  // 💬 NUEVO LEAD
  if(action === "lead"){

   const score = calcularScore(data.mensaje)

   const lead = {
    nombre: data.nombre,
    mensaje: data.mensaje,
    inmueble_ref: data.ref,
    fecha: new Date(),
    score,
    respondido:false
   }

   await axios.post(LEADS_URL,lead,{
    headers:{api_key:API_KEY}
   })

   return res.json({ok:true})
  }

  // 🤖 IA RESPUESTA
  if(action === "aiReply"){

   const respuesta = await generarRespuestaIA(data.mensaje)

   return res.json({respuesta})
  }

  // 📊 MÉTRICAS
  if(action === "metrics"){

   const inmuebles = await axios.get(BASE44_URL,{
    headers:{api_key:API_KEY}
   })

   const leads = await axios.get(LEADS_URL,{
    headers:{api_key:API_KEY}
   })

   const totalLeads = leads.data.length
   const calientes = leads.data.filter(l=>l.score > 7).length
   const nuevos = leads.data.filter(l=>!l.respondido).length

   return res.json({
    inmuebles: inmuebles.data.length,
    leads: totalLeads,
    calientes,
    nuevos
   })
  }

  res.json({error:"acción no válida"})

 }catch(e){
  console.log(e.message)
  res.json({error:true})
 }
})

app.get("/",(req,res)=>{
 res.json({status:"ok"})
})

app.listen(PORT,()=>{
 console.log("Servidor PRO activo")
})
