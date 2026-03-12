const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const axios = require("axios");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

let cache = [];
let geoCache = {};

/* archivos */

const ZONES_FILE = path.join(__dirname,"zones.json");

/* BASE44 */

const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble";
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d";

/* utilidades */

function num(v){
 if(!v) return 0;
 const n = parseFloat(v);
 return isNaN(n) ? 0 : n;
}

function delay(ms){
 return new Promise(resolve => setTimeout(resolve, ms));
}

/* cargar cache de zonas */

function loadZones(){

 if(fs.existsSync(ZONES_FILE)){

  const data = fs.readFileSync(ZONES_FILE,"utf8");
  geoCache = JSON.parse(data);

  console.log("Zonas cargadas:",Object.keys(geoCache).length);

 }

}

/* guardar cache */

function saveZones(){

 fs.writeFileSync(ZONES_FILE,JSON.stringify(geoCache,null,2));

}

/* geocoder (solo si no existe zona) */

async function getCoordinates(ciudad,zona){

 const key = `${ciudad}-${zona}`;

 if(geoCache[key]){
  return geoCache[key];
 }

 try{

  console.log("Calculando zona:",key);

  await delay(1500);

  const query = `${zona} ${ciudad}`;

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const res = await axios.get(url,{
   headers:{
    "User-Agent":"smartfinques-scraper"
   }
  });

  if(res.data && res.data.length){

   const coords = {
    latitud: parseFloat(res.data[0].lat),
    longitud: parseFloat(res.data[0].lon)
   };

   geoCache[key] = coords;

   saveZones();

   return coords;

  }

 }catch(err){

  console.log("Error geocoder:",err.message);

 }

 return {latitud:0,longitud:0};

}

/* cargar XML */

async function loadXML(){

 try{

  const file = path.join(__dirname,"listado.xml");

  if(!fs.existsSync(file)){
   console.log("XML no encontrado");
   return;
  }

  const xml = fs.readFileSync(file,"utf8");

  const parsed = await xml2js.parseStringPromise(xml,{
   explicitArray:true
  });

  const propiedades = parsed?.propiedades?.propiedad || [];

  const results = [];

  for(const p of propiedades){

   const d = p?.datos?.[0] || {};

   const fotos = [];

   if(p.fotos && p.fotos[0]){

    const bloque = p.fotos[0];

    Object.keys(bloque).forEach(k=>{
     const url = bloque[k]?.[0];
     if(url) fotos.push(url);
    });

   }

   let latitud = num(d.ofertas_latitud?.[0]);
   let longitud = num(d.ofertas_longitud?.[0]);

   const ciudad = d.ciudad_ciudad?.[0] || "";
   const zona = d.zonas_zona?.[0] || "";

   if(!latitud || !longitud){

    const coords = await getCoordinates(ciudad,zona);

    if(!latitud) latitud = coords.latitud;
    if(!longitud) longitud = coords.longitud;

   }

   const property = {

    id: d.id?.[0] || "",
    referencia: d.ofertas_ref?.[0] || "",

    titulo: d.ofertas_titulo1?.[0] || "",
    descripcion: d.ofertas_descrip1?.[0] || "",

    precio: num(d.ofertas_precioinmo?.[0]),

    tipo: d.tipo_tipo_ofer?.[0] || "",
    operacion: d.accionoferta_accion?.[0] || "venta",

    ciudad,
    zona,

    habitaciones: num(d.totalhab?.[0]),
    banos: num(d.ofertas_banyos?.[0]),

    superficie: num(d.ofertas_m_cons?.[0]),
    superficie_parcela: num(d.ofertas_m_parcela?.[0]),

    latitud,
    longitud,

    fotos,

    disponible: true

   };

   results.push(property);

  }

  cache = results;

  console.log("Propiedades cargadas:",cache.length);

 }catch(e){

  console.log("Error XML:",e.message);

 }

}

/* sync base44 */

async function syncBase44(){

 try{

  if(cache.length===0) return;

  const existing = await axios.get(BASE44_URL,{
   headers:{ api_key: API_KEY }
  });

  const mapa = {};

  (existing.data||[]).forEach(e=>{
   if(e.referencia) mapa[e.referencia]=e.id;
  });

  for(const p of cache){

   const inmueble = {

    titulo:p.titulo,
    descripcion:p.descripcion,
    precio:p.precio,

    ciudad:p.ciudad,
    zona:p.zona,

    tipo_inmueble:p.tipo,
    sub_tipo_inmueble:"",

    habitaciones:p.habitaciones,
    banos:p.banos,

    superficie:p.superficie,
    superficie_parcela:p.superficie_parcela,

    referencia:p.referencia,
    operacion:p.operacion,

    latitud:p.latitud,
    longitud:p.longitud,

    fotos:p.fotos||[],

    disponible:true

   };

   try{

    if(mapa[p.referencia]){

     await axios.put(`${BASE44_URL}/${mapa[p.referencia]}`,inmueble,{
      headers:{ api_key:API_KEY,"Content-Type":"application/json"}
     });

     console.log("Actualizado:",p.referencia);

    }else{

     await axios.post(BASE44_URL,inmueble,{
      headers:{ api_key:API_KEY,"Content-Type":"application/json"}
     });

     console.log("Creado:",p.referencia);

    }

   }catch(err){

    console.log("Error propiedad:",p.referencia);

   }

   await delay(1000);

  }

  console.log("SYNC COMPLETADO");

 }catch(err){

  console.log("ERROR BASE44:",err.response?.data||err.message);

 }

}

/* inicio */

async function init(){

 loadZones();

 await loadXML();

 await syncBase44();

}

init();

/* sync automático */

setInterval(()=>{

 console.log("Sync automático");

 syncBase44();

},1000*60*60);

/* endpoints */

app.get("/",(req,res)=>{

 res.json({
  message:"API SmartFinques funcionando",
  total:cache.length
 });

});

app.get("/properties",(req,res)=>{

 res.json({
  total:cache.length,
  properties:cache
 });

});

app.get("/reload",async(req,res)=>{

 await loadXML();
 await syncBase44();

 res.json({
  message:"Recargado",
  total:cache.length
 });

});

app.listen(PORT,()=>{
 console.log("Servidor iniciado en puerto",PORT);
});
