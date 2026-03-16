const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")
const fs = require("fs")

const app = express()
app.use(cors())

const PORT = process.env.PORT || 3000

const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const ZONA_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/ZonaCache"

const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"
const GEOCODER_KEY = "b0b35deecc094cfea0e46fe6b8cbf7d7"

let propiedades = []

function delay(ms){
 return new Promise(r=>setTimeout(r,ms))
}

async function buscarZonaCache(clave){

 try{

  const res = await axios.get(ZONA_URL,{
   headers:{api_key:API_KEY}
  })

  const zonas = res.data || []

  return zonas.find(z=>z.clave === clave)

 }catch(e){

  console.log("Error leyendo cache zonas")
  return null

 }

}

async function guardarZonaCache(data){

 try{

  await axios.post(ZONA_URL,data,{
   headers:{
    api_key:API_KEY,
    "Content-Type":"application/json"
   }
  })

  console.log("Zona guardada en cache:",data.clave)

 }catch(e){

  console.log("Error guardando zona cache")

 }

}

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

  if(e.response?.status === 429){

   console.log("Rate limit geocoder, esperando...")
   await delay(2000)

  }else{

   console.log("Error geocoder:",e.message)

  }

 }

 return null

}

async function cargarXML(){

 const xml = fs.readFileSync("listado.xml","utf8")

 const parsed = await xml2js.parseStringPromise(xml,{explicitArray:true})

 const props = parsed?.propiedades?.propiedad || []

 const results=[]

 for(const p of props){

  const d=p?.datos?.[0] || {}

  const fotos=[]

  if(p.fotos){

   for(const f of p.fotos){

    const k=Object.keys(f)[0]

    const url=f[k]?.[0]

    if(url) fotos.push(url)

   }

  }

  let lat=parseFloat(d.ofertas_latitud?.[0] || 0)
  let lng=parseFloat(d.ofertas_longitud?.[0] || 0)

  const ciudad=d.ciudad_ciudad?.[0] || ""
  const zona=d.zonas_zona?.[0] || ""

  if(lat && !lng){

   const geo=await geocode(ciudad,zona)

   if(geo){

    lat=geo.lat
    lng=geo.lng

   }

  }

  const property={

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

   referencia:d.ofertas_ref?.[0] || "",

   fotos:fotos || [],

   disponible:true

  }

  results.push(property)

 }

 propiedades=results

 console.log("Propiedades cargadas:",propiedades.length)

}

async function syncBase44(){

 for(const p of propiedades){

  try{

   await axios.post(BASE44_URL,p,{
    headers:{
     api_key:API_KEY,
     "Content-Type":"application/json"
    }
   })

   console.log("Enviado:",p.referencia)

  }catch(e){

   console.log("Error propiedad:",p.referencia)
   console.log(e.response?.data || e.message)

  }

  await delay(700)

 }

}

async function init(){

 await cargarXML()

 await syncBase44()

}

init()

app.get("/",(req,res)=>{

 res.json({
  total:propiedades.length
 })

})

app.listen(PORT,()=>{

 console.log("Servidor activo")

})
