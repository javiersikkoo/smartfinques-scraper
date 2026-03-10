const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const syncBase44 = require("./syncBase44");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

let cache = [];

/* convertir valores numericos */
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
    precioOriginal: num(d.ofertas_precio?.[0]),

    tipo: d.tipo_tipo_ofer?.[0] || "",
    accion: d.accionoferta_accion?.[0] || "",

    ciudad: d.ciudad_ciudad?.[0] || "",
    provincia: d.provincias_provincia?.[0] || "",
    zona: d.zonas_zona?.[0] || "",
    cp: d.ofertas_cp?.[0] || "",

    direccion: `${d.tipocalle_tipocalle?.[0] || ""} ${d.ofertas_calle?.[0] || ""} ${d.ofertas_numero?.[0] || ""}`,

    habitaciones: num(d.totalhab?.[0]),
    banos: num(d.ofertas_banyos?.[0]),

    superficieConstruida: num(d.ofertas_m_cons?.[0]),
    superficieParcela: num(d.ofertas_m_parcela?.[0]),

    latitud: num(d.ofertas_latitud?.[0]),
    longitud: num(d.ofertas_longitud?.[0]),

    destacado: d.ofertas_destacado?.[0] === "1",

    fechaAlta: d.ofertas_fecha?.[0] || "",
    fechaActualizacion: d.ofertas_fechaact?.[0] || ""

   };

   results.push(property);

  });

  cache = results;

  console.log("Propiedades cargadas:", cache.length);

 }catch(e){

  console.log("Error leyendo XML:", e.message);

 }

}

/* cargar XML y sincronizar */
async function init(){

 await loadXML();

 console.log("Iniciando sincronización con Base44...");

 await syncBase44();

}

/* ejecutar inicio */
init();

/* sincronizar cada hora automáticamente */
setInterval(()=>{

 console.log("Sincronización automática Base44...");

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

/* recargar XML manualmente */

app.get("/reload", async (req,res)=>{

 await loadXML();

 await syncBase44();

 res.json({
  message:"XML recargado y Base44 sincronizado",
  total: cache.length
 });

});

app.listen(PORT,()=>{
 console.log("Servidor iniciado en puerto",PORT);
});
