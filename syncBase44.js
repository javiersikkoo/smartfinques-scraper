const axios = require("axios");

const BASE44_URL = "https://base44.app/api/apps/699c3190ff4f2a860729de59/entities/Inmueble";
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d";

const PROPERTIES_API = "https://smartfinques-scraper.onrender.com/properties";

async function getBase44Properties() {

    const response = await axios.get(BASE44_URL, {
        headers: {
            api_key: API_KEY
        }
    });

    return response.data;

}

async function createProperty(data){

    await axios.post(BASE44_URL, data, {
        headers:{
            api_key: API_KEY,
            "Content-Type":"application/json"
        }
    });

}

async function updateProperty(id,data){

    await axios.put(`${BASE44_URL}/${id}`, data, {
        headers:{
            api_key: API_KEY,
            "Content-Type":"application/json"
        }
    });

}

async function sync(){

    try{

        console.log("Cargando propiedades de tu API...");

        const apiResponse = await axios.get(PROPERTIES_API);

        const properties = apiResponse.data.properties;

        console.log("Propiedades encontradas:",properties.length);

        console.log("Cargando propiedades de Base44...");

        const base44Properties = await getBase44Properties();

        const baseMap = {};

        base44Properties.forEach(p=>{
            baseMap[p.referencia] = p;
        });

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

            const existing = baseMap[p.referencia];

            if(!existing){

                console.log("Creando:",p.titulo);

                await createProperty(data);

            }else{

                console.log("Actualizando:",p.titulo);

                await updateProperty(existing.id,data);

            }

        }

        console.log("Sincronización completa");

    }catch(error){

        console.log("Error sincronizando:",error.message);

    }

}

sync();
