const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")

const app = express()
app.use(cors())

const PORT = process.env.PORT || 3000

// 🔥 TU XML AUTOMÁTICO
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"

// 🔥 BASE44
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const ZONA_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/ZonaCache"
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

// 🔥 GEOCODER
const GEOCODER_KEY = "b0b35deecc094cfea0e46fe6b8cbf7d7"

function delay(ms){
 return new Promise(r=>setTimeout(r,ms))
}

// ================= CACHE ZONAS =================
async function buscarZonaCache(clave){
 try{
  const res = await axios.get(ZONA_URL, { headers:{ api_key: API_KEY } })
  const zonas = res.data || []
  return zonas.find(z => z.clave === clave) || null
 }catch(e){
  console.log("Error leyendo cache zonas:", e.message)
  return null
 }
}

async function guardarZonaCache(data){
 try{
  const existente = await buscarZonaCache(data.clave)
  if(existente) return

  await axios.post(ZONA_URL, data, {
   headers:{
    api_key: API_KEY,
    "Content-Type":"application/json"
   }
  })

  console.log("Zona guardada:", data.clave)
 }catch(e){
  console.log("Error guardando zona:", e.message)
 }
}

// ================= GEOCODING =================
async function geocode(ciudad, zona){
 const clave = `${ciudad}-${zona}`
 const cache = await buscarZonaCache(clave)

 if(cache){
  return { lat: cache.latitud, lng: cache.longitud }
 }

 try{
  console.log("Geocoding:", clave)

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(zona+" "+ciudad+" Spain")}&key=${GEOCODER_KEY}`

  const res = await axios.get(url)
  const r = res.data.results?.[0]

  if(r){
   const coords = { lat: r.geometry.lat, lng: r.geometry.lng }

   await guardarZonaCache({
    clave,
    ciudad,
    zona,
    latitud: coords.lat,
    longitud: coords.lng
   })

   await delay(500)
   return coords
  }

 }catch(e){
  console.log("Error geocoder:", e.message)
 }

 return null
}

// ================= PARSE XML =================
async function cargarXML(){

 const res = await axios.get(XML_URL)
 const xml = res.data

 const parsed = await xml2js.parseStringPromise(xml,{explicitArray:true})

 const props = parsed?.propiedades?.propiedad || []

 const results=[]

 for(const p of props){

  const d=p?.datos?.[0] || {}

  let lat=parseFloat(d.ofertas_latitud?.[0] || 0)
  let lng=parseFloat(d.ofertas_longitud?.[0] || 0)

  const ciudad=d.ciudad_ciudad?.[0] || ""
  const zona=d.zonas_zona?.[0] || ""

  if(!lat || !lng){
   const geo=await geocode(ciudad,zona)
   if(geo){
    lat=geo.lat
    lng=geo.lng
   }
  }

  const property={
   referencia:d.ofertas_ref?.[0] || "",
   titulo:d.ofertas_titulo1?.[0] || "",
   descripcion:d.ofertas_descrip1?.[0] || "",
   precio:parseFloat(d.ofertas_precioinmo?.[0] || 0),

   ciudad,
   zona,

   tipo_inmueble:d.tipo_tipo_ofer?.[0] || "",
   operacion:d.accionoferta_accion?.[0] || "venta",

   habitaciones:parseInt(d.totalhab?.[0] || 0),
   banos:parseInt(d.ofertas_banyos?.[0] || 0),

   superficie:parseFloat(d.ofertas_m_cons?.[0] || 0),

   latitud:lat || null,
   longitud:lng || null,

   disponible:true
  }

  results.push(property)
 }

 return results
}

// ================= SYNC BASE44 =================
async function syncBase44(){

 const propiedades = await cargarXML()

 console.log("Propiedades XML:", propiedades.length)

 const res = await axios.get(BASE44_URL, {
  headers:{ api_key: API_KEY }
 })

 const existentes = res.data || []

 const mapExistentes = new Map()
 existentes.forEach(p => mapExistentes.set(p.referencia, p))

 const refsActuales = new Set()

 // CREATE / UPDATE
 for(const p of propiedades){

  refsActuales.add(p.referencia)

  const existe = mapExistentes.get(p.referencia)

  try{

   if(existe){
    await axios.put(`${BASE44_URL}/${existe.id}`, p, {
     headers:{
      api_key: API_KEY,
      "Content-Type":"application/json"
     }
    })
    console.log("Actualizado:", p.referencia)

   }else{
    await axios.post(BASE44_URL, p, {
     headers:{
      api_key: API_KEY,
      "Content-Type":"application/json"
     }
    })
    console.log("Creado:", p.referencia)
   }

  }catch(e){
   console.log("Error propiedad:", p.referencia)
  }

  await delay(500)
 }

 // DESACTIVAR ELIMINADOS
 for(const e of existentes){

  if(!refsActuales.has(e.referencia)){

   try{
    await axios.put(`${BASE44_URL}/${e.id}`, {
     disponible:false
    },{
     headers:{
      api_key: API_KEY,
      "Content-Type":"application/json"
     }
    })

    console.log("Desactivado:", e.referencia)

   }catch(err){
    console.log("Error desactivando:", e.referencia)
   }

  }
 }

 console.log("SYNC COMPLETO")
}

// ================= INIT =================
async function init(){
 await syncBase44()
}

init()

app.get("/",(req,res)=>{
 res.send("Servidor funcionando")
})

app.get("/sync", async(req,res)=>{
 await syncBase44()
 res.send("Sync ejecutado")
})

app.listen(PORT,()=>{
 console.log("Servidor activo")
})
