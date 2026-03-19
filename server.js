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

const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"
const GEOCODER_KEY = "b0b35deecc094cfea0e46fe6b8cbf7d7"

let propiedades = []

const delay = ms => new Promise(r=>setTimeout(r,ms))

// NORMALIZAR
const normalizar = txt => (txt || "").toLowerCase().trim()

// CACHE ZONA
async function buscarZonaCache(clave){
 try{
  const res = await axios.get(ZONA_URL,{headers:{api_key:API_KEY}})
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

// GEOCODE
async function geocode(ciudad,zona){

 const clave = `${normalizar(ciudad)}-${normalizar(zona)}`

 const cache = await buscarZonaCache(clave)
 if(cache){
  return {lat:cache.latitud,lng:cache.longitud}
 }

 try{
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(zona+" "+ciudad+" Spain")}&key=${GEOCODER_KEY}`
  const res = await axios.get(url)
  const r = res.data.results?.[0]

  if(r){
   const coords = {lat:r.geometry.lat,lng:r.geometry.lng}

   await guardarZonaCache({
    clave,
    ciudad,
    zona,
    latitud:coords.lat,
    longitud:coords.lng
   })

   return coords
  }

 }catch{}

 return null
}

// PARSE XML
async function cargarXML(){

 const {data} = await axios.get(XML_URL)
 const parsed = await xml2js.parseStringPromise(data,{explicitArray:false})

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
   referencia:p.ref,
   titulo:p.titulo1,
   descripcion:p.descrip1,
   precio:parseFloat(p.precioinmo || 0),

   ciudad,
   zona,

   tipo_inmueble:p.tipo_ofer,
   operacion:p.accion,

   habitaciones:parseInt(p.habitaciones || 0),
   banos:parseInt(p.banyos || 0),

   superficie:parseFloat(p.m_cons || 0),

   latitud:lat,
   longitud:lng,

   fotos,
   disponible:true,

   fechaact:p.fechaact || ""
  })
 }

 propiedades = results
}

// SYNC PRO
async function syncBase44(){

 let existentes=[]

 try{
  const res = await axios.get(BASE44_URL,{headers:{api_key:API_KEY}})
  existentes = res.data || []
 }catch{}

 const refsXML = propiedades.map(p=>p.referencia)

 for(const p of propiedades){

  const existe = existentes.find(e=>e.referencia === p.referencia)

  try{

   if(existe){

    if(existe.fechaact !== p.fechaact){

     await axios.put(`${BASE44_URL}/${existe.id}`,p,{
      headers:{api_key:API_KEY}
     })

     console.log("Actualizado:",p.referencia)
    }

   }else{

    await axios.post(BASE44_URL,p,{
     headers:{api_key:API_KEY}
    })

    console.log("Creado:",p.referencia)
   }

  }catch(e){
   console.log("Error:",p.referencia)
  }

  await delay(200)
 }

 // DELETE
 for(const e of existentes){
  if(!refsXML.includes(e.referencia)){
   try{
    await axios.delete(`${BASE44_URL}/${e.id}`,{
     headers:{api_key:API_KEY}
    })
    console.log("Eliminado:",e.referencia)
   }catch{}
  }
 }
}

// INIT
async function init(){
 await cargarXML()
 await syncBase44()
}

// CRON
setInterval(()=>{
 console.log("SYNC AUTO")
 init()
}, 1000 * 60 * 60) // 1 hora

// ADMIN PANEL (simple)

// sync manual
app.get("/sync", async(req,res)=>{
 await init()
 res.json({ok:true})
})

// stats
app.get("/stats",(req,res)=>{
 res.json({
  total:propiedades.length
 })
})

// simular contacto (monetización)
app.post("/contactar", async(req,res)=>{
 const {referencia} = req.body

 try{
  const r = await axios.get(BASE44_URL,{headers:{api_key:API_KEY}})
  const inmueble = r.data.find(i=>i.referencia === referencia)

  if(inmueble){
   await axios.put(`${BASE44_URL}/${inmueble.id}`,{
    contactos:(inmueble.contactos || 0)+1
   },{
    headers:{api_key:API_KEY}
   })
  }

 }catch{}

 res.json({ok:true})
})

app.listen(PORT,()=>{
 console.log("Servidor PRO activo")
})
