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

const BASE44_URL = "https://base44.app/api/apps/699c3190ff4f2a860729de59/entities/Inmueble";
const BASE44_API_KEY = "6bfecf96fcc54595a962b1c94857c61d";

// convertir a número
function num(v){
    if(!v) return 0;
    return parseFloat(v) || 0;
}

// parsear propiedad
function parseProperty(p){

    let fotos = [];

    if(p.fotos && p.fotos[0]){
        Object.values(p.fotos[0]).forEach(url=>{
            if(url) fotos.push(url);
        });
    }

    return {
        id: p.id_inmueble?.[0] || "",
        referencia: p.referencia?.[0] || "",
        titulo: p.ofertas_titulo1?.[0] || "",
        descripcion: p.descripcion?.[0] || "",
        precio: num(p.precio?.[0]),
        tipo: p.tipo_oferta?.[0] || "",
        ciudad: p.ciudad?.[0] || "",
        zona: p.zona?.[0] || "",
        habitaciones: num(p.habitaciones?.[0]),
        banos: num(p.banos?.[0]),
        superficie: num(p.metros?.[0]),
        lat: num(p.latitud?.[0]),
        lng: num(p.longitud?.[0]),
        fotos
    };
}

// cargar XML local
async function loadXML(){

    try{

        const filePath = path.join(__dirname,"inmuebles.xml");

        const xmlData = fs.readFileSync(filePath,"utf8");

        const parsed = await xml2js.parseStringPromise(xmlData);

        const propiedades = parsed?.inmuebles?.inmueble || [];

        cache = propiedades.map(parseProperty);

        console.log("Propiedades cargadas:",cache.length);

    }catch(error){

        console.log("Error leyendo XML:",error.message);

    }

}

loadXML();
setInterval(loadXML,30*60*1000);

// obtener propiedades Base44
async function getBase44(){

    const res = await axios.get(BASE44_URL,{
        headers:{ api_key: BASE44_API_KEY }
    });

    return res.data;
}

// crear propiedad
async function createBase44(data){

    await axios.post(BASE44_URL,data,{
        headers:{
            api_key: BASE44_API_KEY,
            "Content-Type":"application/json"
        }
    });

}

// actualizar propiedad
async function updateBase44(id,data){

    await axios.put(`${BASE44_URL}/${id}`,data,{
        headers:{
            api_key: BASE44_API_KEY,
            "Content-Type":"application/json"
        }
    });

}

// endpoint sincronización
app.get("/sync-base44",async(req,res)=>{

    try{

        const base44Props = await getBase44();

        const map = {};

        base44Props.forEach(p=>{
            map[p.referencia] = p;
        });

        for(const p of cache){

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

            const existing = map[p.referencia];

            if(!existing){

                await createBase44(data);

            }else{

                await updateBase44(existing.id,data);

            }

        }

        res.json({
            message:"Sincronización completada",
            total:cache.length
        });

    }catch(error){

        res.json({
            error:error.message
        });

    }

});

// endpoints API
app.get("/properties",(req,res)=>{
    res.json({
        total:cache.length,
        properties:cache
    });
});

app.get("/property/:id",(req,res)=>{

    const property = cache.find(p=>p.id===req.params.id);

    if(!property){
        return res.status(404).json({error:"Not found"});
    }

    res.json(property);

});

app.get("/",(req,res)=>{
    res.send("API inmobiliaria funcionando");
});

app.listen(PORT,()=>{
    console.log("Servidor corriendo en puerto",PORT);
});
