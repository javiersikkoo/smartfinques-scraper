const axios = require("axios");

const API_URL = "https://smartfinques-scraper.onrender.com/properties";

const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble";

const API_KEY = "6bfecf96fcc54595a962b1c94857c61d";

async function sync(){

 try{

  const {data} = await axios.get(API_URL);

  const properties = data.properties;

  console.log("Propiedades encontradas:", properties.length);

  for(const p of properties){

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

    superficie: p.superficieConstruida,
    superficie_parcela: p.superficieParcela,

    referencia: p.referencia,
    operacion: "venta",

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

  console.log("SYNC COMPLETADO");

 }catch(err){

  console.log("ERROR:", err.response?.data || err.message);

 }

}

sync();
