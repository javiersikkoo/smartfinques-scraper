const axios = require("axios");

const BASE44_URL = "https://base44.app/api/apps/699c3190ff4f2a860729de59/entities/Inmueble";
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d";

const API_PROPERTIES = "https://smartfinques-scraper.onrender.com/properties";

async function syncProperties(){

    try{

        const response = await axios.get(API_PROPERTIES);

        const properties = response.data.properties;

        for(const p of properties){

            const data = {
                titulo: p.titulo,
                descripcion: p.descripcion,
                fotos: p.fotos,
                precio: p.precio,
                ciudad: p.ciudad,
                zona: p.zona,
                habitaciones: p.habitaciones,
                banos: p.banos,
                superficie: p.superficie,
                referencia: p.referencia,
                latitud: p.lat,
                longitud: p.lng,
                disponible: true
            };

            await axios.post(BASE44_URL, data, {
                headers:{
                    "api_key": API_KEY,
                    "Content-Type":"application/json"
                }
            });

            console.log("Propiedad enviada:", p.titulo);

        }

        console.log("Sincronización terminada");

    }catch(error){

        console.log("Error:", error.message);

    }

}

syncProperties();
