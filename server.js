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
const ZONA_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/ZonaCache"
const LEAD_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Lead"
const CHAT_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Chat"

const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"
const GEOCODER_KEY = "b0b35deecc094cfea0e46fe6b8cbf7d7"

function delay(ms){
 return new Promise(r=>setTimeout(r,ms))
}

function limpiarTexto(texto){
 return (texto || "").trim().toLowerCase()
}

// ---------------- CACHE ZONAS ----------------

async function buscarZonaCache(clave){
 try{
  const res = await axios.get(ZONA_URL,{ headers:{api_key:API_KEY}})
  return res.data.find(z=>z.clave === clave)
 }catch{
  return null
 }
}

async function guardarZonaCache(data){
 try{
  await axios.post(ZONA_URL,data,{
   headers:{api_key:API_KEY,"Content-Type":"application/json"}
  })
 }catch{}
}

// ---------------- GEO ----------------

async function geocode(ciudad,zona){

 const clave = limpiarTexto(`${ciudad}-${zona}`)
 const cache = await buscarZonaCache(clave)

 if(cache){
  return { lat:cache.latitud, lng:cache.longitud }
 }

 try{
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(zona+" "+ciudad+" Spain")}&key=${GEOCODER_KEY}`

  const res = await axios.get(url)
  const r = res.data.results?.[0]

  if(r){

   const coords = {
    lat:r.geometry.lat,
    lng:r.geometry.lng
   }

   await guardarZonaCache({
    clave,
    ciudad,
    zona,
    latitud:coords.lat,
    longitud:coords.lng
   })

   await delay(500)
   return coords
  }

 }catch{}

 return null
}

// ---------------- XML ----------------

async function cargarXML(){

 const response = await axios.get(XML_URL)
 const parsed = await xml2js.parseStringPromise(response.data,{explicitArray:false})

 const props = parsed?.propiedades?.propiedad || []

 const results=[]

 for(const p of props){

  let lat = parseFloat(p.latitud || 0)
  let lng = parseFloat(p.altitud || 0)

  const ciudad = p.ciudad || ""
  const zona = p.zona || ""

  if(!lat || !lng){
   const geo = await geocode(ciudad,zona)
   if(geo){
    lat = geo.lat
    lng = geo.lng
   }
  }

  const fotos=[]
  for(let i=1;i<=20;i++){
   if(p[`foto${i}`]) fotos.push(p[`foto${i}`])
  }

  results.push({
   referencia: p.ref,
   titulo: p.titulo1 || "",
   descripcion: p.descrip1 || "",
   precio: parseFloat(p.precioinmo || 0),
   ciudad,
   zona,
   tipo_inmueble: p.tipo_ofer,
   operacion: p.accion?.toLowerCase() || "venta",
   habitaciones: parseInt(p.habitaciones || 0),
   banos: parseInt(p.banyos || 0),
   superficie: parseFloat(p.m_cons || 0),
   latitud: lat || null,
   longitud: lng || null,
   fotos,
   disponible: true
  })
 }

 return results
}

// ---------------- SYNC ----------------

async function syncBase44(propiedades){

 const existing = await axios.get(BASE44_URL,{
  headers:{api_key:API_KEY}
 })

 for(const p of propiedades){

  const yaExiste = existing.data.find(x=>x.referencia === p.referencia)

  try{

   if(yaExiste){

    await axios.put(`${BASE44_URL}/${yaExiste.id}`,p,{
     headers:{api_key:API_KEY,"Content-Type":"application/json"}
    })

   }else{

    await axios.post(BASE44_URL,p,{
     headers:{api_key:API_KEY,"Content-Type":"application/json"}
    })
   }

  }catch{}

  await delay(400)
 }
}

// ---------------- API ----------------

app.post("/api", async (req,res)=>{

 const {action} = req.body

 try{

  // 🔄 SYNC
  if(action === "sync"){
   const props = await cargarXML()
   await syncBase44(props)
   return res.json({ok:true})
  }

  // 📩 LEAD
  if(action === "lead"){

   const {nombre, telefono, email, mensaje, inmueble} = req.body

   await axios.post(LEAD_URL,{
    nombre,
    telefono,
    email,
    mensaje,
    inmueble,
    fecha:new Date(),
    estado:"nuevo"
   },{
    headers:{api_key:API_KEY,"Content-Type":"application/json"}
   })

   return res.json({ok:true})
  }

  // 💬 CHAT
  if(action === "chat"){

   const {mensaje, inmueble, usuario} = req.body

   await axios.post(CHAT_URL,{
    mensaje,
    inmueble,
    usuario,
    fecha:new Date(),
    leido:false
   },{
    headers:{api_key:API_KEY,"Content-Type":"application/json"}
   })

   return res.json({ok:true})
  }

  res.json({error:"acción no válida"})

 }catch(e){
  console.log(e.response?.data || e.message)
  res.json({error:true})
 }

})

app.get("/",(req,res)=>{
 res.json({status:"ok"})
})

app.listen(PORT,()=>{
 console.log("Servidor activo")
})
