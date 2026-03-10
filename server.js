const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

let cache = [];

function num(v){
 if(!v) return 0;
 return parseFloat(v) || 0;
}

async function loadXML(){

 try{

  const file = path.join(__dirname,"listado.xml");
  const xml = fs.readFileSync(file,"utf8");

  const parsed = await xml2js.parseStringPromise(xml,{
   explicitArray:true,
   mergeAttrs:true
  });

  const propiedades = parsed.propiedad || [];

  const results = [];

  propiedades.forEach(p=>{

   const d = p.datos?.[0] || {};

   const fotos = [];

   if(p.fotos){
    p.fotos.forEach(f=>{
      const key = Object.keys(f)[0];
      const url = f[key]?.[0];
      if(url) fotos.push(url);
    });
   }

   const property = {

    id: d.id?.[0] || "",
    referencia: d.ofertas_ref?.[0] || "",
    titulo: d.ofertas_titulo1?.[0] || "",
    descripcion: d.ofertas_descrip1?.[0] || "",
    precio: num(d.ofertas_precioinmo?.[0]),
    ciudad: d.ciudad_ciudad?.[0] || "",
    zona: d.zonas_zona?.[0] || "",
    tipo: d.tipo_tipo_ofer?.[0] || "",
    habitaciones: num(d.totalhab?.[0]),
    banos: num(d.ofertas_banyos?.[0]),
    superficie: num(d.ofertas_m_cons?.[0]),
    latitud: num(d.ofertas_latitud?.[0]),
    longitud: num(d.ofertas_longitud?.[0]),
    fotos

   };

   results.push(property);

  });

  cache = results;

  console.log("Propiedades cargadas:",cache.length);

 }catch(e){

  console.log("Error leyendo XML:",e.message);

 }

}

loadXML();

app.get("/",(req,res)=>{
 res.send("API funcionando");
});

app.get("/properties",(req,res)=>{

 res.json({
  total:cache.length,
  properties:cache
 });

});

app.listen(PORT,()=>{
 console.log("Servidor iniciado en puerto",PORT);
});
