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

/* CONFIG BASE44 */

const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble";
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d";

/* convertir numeros */

function num(v){
 if(!v) return 0;
 const n = parseFloat(v);
 return isNaN(n) ? 0 : n;
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

  propiedades.forEach(p=>{

   const d = p?.datos?.[0] || {};

   const property = {

    id: d.id?.[0] || "",
    referencia: d.ofertas_ref?.[0] || "",
    titulo: d.ofertas_titulo1?.[0] || "",
    descripcion: d.ofertas_descrip1?.[0] || "",

    precio: num(d.ofertas_precioinmo?.[0]),

    tipo: d.tipo_tipo_ofer?.[0] || "",
    operacion: d.accionoferta_accion?.[0] || "venta",

    ciudad: d.ciudad_ciudad?.[0] || "",
    zona: d.zonas_zona?.[0] || "",

    habitaciones: num(d.totalhab?.[0]),
    banos: num(d.ofertas_banyos?.[0]),

    superficie: num(d.ofertas_m_cons?.[0]),
    superficie_parcela: num(d.ofertas_m_parcela?.[0]),

    latitud: num(d.ofertas_latitud?.[0]),
    longitud: num(d.ofertas_longitud?.[0]),

    disponible: true

   };

   results.push(property);

  });

  cache = results;

  console.log("Propiedades cargadas:", cache.length);

 }catch(e){

  console.log("Error leyendo XML:", e.message);

 }

}

/* sincronizar con Base44 */

async function syncBase44(){

 try{

  if(cache.length === 0){
   console.log("No hay propiedades para sincronizar");
   return;
  }

  console.log("Sincronizando con Base44...");

  for(const p of cache){

   const inmueble = {

    titulo: p.titulo,
    descripcion: p.descripcion,
    precio: p.precio,

    ciudad: p.ciudad,
    zona: p.zona,

    tipo_inmueble: p.tipo,
    sub_tipo_inmueble: "",

    habitaciones: p.habitaciones,
    banos: p.banos,

    superficie: p.superficie,
    superficie_parcela: p.superficie_parcela,

    referencia: p.referencia,
    operacion: p.operacion,

    latitud: p.latitud,
    longitud: p.longitud,

    disponible: true

   };

   await axios.post(BASE44_URL, inmueble, {
    headers:{
     "api_key": API_KEY,
     "Content-Type":"application/json"
    }
   });

   console.log("Subido:", p.referencia);

  }

  console.log("SYNC BASE44 COMPLETADO");

 }catch(err){

  console.log("ERROR BASE44:", err.response?.data || err.message);

 }

}

/* iniciar servidor */

async function init(){

 await loadXML();

 await syncBase44();

}

init();

/* sincronización automática cada hora */

setInterval(()=>{

 console.log("Sync automático Base44");

 syncBase44();

}, 1000 * 60 * 60);

/* endpoints */

app.get("/",(req,res)=>{
 res.json({
  message:"API SmartFinques funcionando",
  total: cache.length
 });
});

app.get("/properties",(req,res)=>{
 res.json({
  total: cache.length,
  properties: cache
 });
});

app.get("/property/:id",(req,res)=>{

 const id = req.params.id;

 const property = cache.find(p =>
  p.id == id || p.referencia == id
 );

 if(!property){
  return res.status(404).json({
   error:"Propiedad no encontrada"
  });
 }

 res.json(property);

});

/* recargar manual */

app.get("/reload", async (req,res)=>{

 await loadXML();
 await syncBase44();

 res.json({
  message:"XML recargado y sincronizado",
  total: cache.length
 });

});

app.listen(PORT,()=>{
 console.log("Servidor iniciado en puerto",PORT);
});
