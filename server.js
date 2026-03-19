const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")

const app = express()
app.use(cors())

const PORT = process.env.PORT || 3000

// 🔥 TU XML DE INMOVILLA
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"

// 🔥 BASE44
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const ZONA_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/ZonaCache"

const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"
const GEOCODER_KEY = "b0b35deecc094cfea0e46fe6b8cbf7d7"

let propiedades = []

function delay(ms){
 return new Promise(r=>setTimeout(r,ms))
}

// 🔍 BUSCAR ZONA CACHE
async function buscarZonaCache(clave){
 try{
  const res = await axios.get(ZONA_URL,{
   headers:{ api_key:API_KEY }
  })

  return res.data.find(z=>z.clave === clave)

 }catch(e){
  console.log("Error leyendo cache zonas:", e.message)
  return null
 }
}

// 💾 GUARDAR ZONA
async function guardarZonaCache(data){
 try{
  await axios.post(ZONA_URL,data,{
   headers:{
    api_key:API_KEY,
    "Content-Type":"application/json"
   }
  })
 }catch(e){
  console.log("Error guardando zona cache:", e.message)
 }
}

// 🌍 GEOCODING
async function geocode(ciudad,zona){

 const clave = `${ciudad}-${zona}`

 const cache = await buscarZonaCache(clave)

 if(cache){
  return {
   lat:cache.latitud,
   lng:cache.longitud
  }
 }

 try{

  console.log("Geocoding:",clave)

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(zona+" "+ciudad+" Spain")}&key=${GEOCODER_KEY}`

  const res = await axios.get(url)
  const r = res.data.results?.[0]

  if(r){

   const coords={
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

 }catch(e){
  console.log("Error geocoder:", e.message)
 }

 return null
}

// 📦 CARGAR XML (NUEVO FORMATO INMOVILLA)
async function cargarXML(){

 const res = await axios.get(XML_URL)
 const xml = res.data

 const parsed = await xml2js.parseStringPromise(xml,{explicitArray:false})

 const props = parsed?.propiedades?.propiedad || []

 const results=[]

 for(const p of props){

  let lat = parseFloat(p.latitud || 0)
  let lng = parseFloat(p.altitud || 0) // ⚠️ altitud = longitud

  const ciudad = p.ciudad || ""
  const zona = p.zona || ""

  if(!lat || !lng){
   const geo = await geocode(ciudad,zona)
   if(geo){
    lat = geo.lat
    lng = geo.lng
   }
  }

  // 📸 FOTOS
  const fotos=[]
  for(let i=1;i<=20;i++){
   if(p[`foto${i}`]){
    fotos.push(p[`foto${i}`])
   }
  }

  const property={

   referencia: p.ref || "",
   titulo: p.titulo1 || "",
   descripcion: p.descrip1 || "",
   precio: parseFloat(p.precioinmo || 0),

   ciudad,
   zona,

   tipo_inmueble: p.tipo_ofer || "",
   operacion: p.accion || "venta",

   habitaciones: parseInt(p.habitaciones || 0),
   banos: parseInt(p.banyos || 0),

   superficie: parseFloat(p.m_cons || 0),

   latitud: lat || null,
   longitud: lng || null,

   fotos,

   disponible: true
  }

  results.push(property)
 }

 propiedades = results

 console.log("Propiedades cargadas:", propiedades.length)
}

// 🔥 SYNC SIN DUPLICADOS
async function syncBase44(){

 // 1. Obtener existentes
 let existentes=[]
 try{
  const res = await axios.get(BASE44_URL,{
   headers:{ api_key:API_KEY }
  })
  existentes = res.data || []
 }catch(e){
  console.log("Error obteniendo existentes")
 }

 for(const p of propiedades){

  try{

   const existe = existentes.find(e=>e.referencia === p.referencia)

   if(existe){
    console.log("Ya existe:", p.referencia)
    continue
   }

   await axios.post(BASE44_URL,p,{
    headers:{
     api_key:API_KEY,
     "Content-Type":"application/json"
    }
   })

   console.log("Subido:", p.referencia)

  }catch(e){
   console.log("Error propiedad:", p.referencia)
  }

  await delay(500)
 }

}

// 🚀 INIT
async function init(){
 await cargarXML()
 await syncBase44()
}

// 🔁 ENDPOINT MANUAL
app.get("/sync", async(req,res)=>{
 await init()
 res.json({ok:true})
})

// 📊 TEST
app.get("/",(req,res)=>{
 res.json({
  total:propiedades.length
 })
})

app.listen(PORT,()=>{
 console.log("Servidor activo")
})
