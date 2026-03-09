const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

let cache = [];

// convertir string a número
function num(v) {
  if (!v) return 0;
  return parseFloat(v) || 0;
}

// convertir propiedad
function parseProperty(p) {

  let fotos = [];

  if (p.fotos && p.fotos[0]) {
    Object.values(p.fotos[0]).forEach(url => {
      if (url) fotos.push(url);
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
    fotos: fotos
  };
}

// cargar XML desde archivo local
async function loadXML() {

  try {

    const filePath = path.join(__dirname, "listado.xml");

    const xmlData = fs.readFileSync(filePath, "utf8");

    const parsed = await xml2js.parseStringPromise(xmlData);

    const propiedades = parsed?.inmuebles?.inmueble || [];

    cache = propiedades.map(parseProperty);

    console.log("Propiedades cargadas:", cache.length);

  } catch (error) {

    console.log("Error leyendo XML:", error.message);

  }

}

// cargar al iniciar
loadXML();

// actualizar cada 30 min
setInterval(loadXML, 30 * 60 * 1000);


// ========================
// ENDPOINTS
// ========================


// todas las propiedades
app.get("/properties", (req, res) => {

  res.json({
    total: cache.length,
    properties: cache
  });

});


// propiedad individual
app.get("/property/:id", (req, res) => {

  const property = cache.find(p => p.id === req.params.id);

  if (!property) {
    return res.status(404).json({
      error: "Property not found"
    });
  }

  res.json(property);

});


// búsqueda simple
app.get("/search", (req, res) => {

  const { ciudad, tipo, precio_max } = req.query;

  let results = cache;

  if (ciudad) {
    results = results.filter(p =>
      p.ciudad.toLowerCase().includes(ciudad.toLowerCase())
    );
  }

  if (tipo) {
    results = results.filter(p =>
      p.tipo.toLowerCase().includes(tipo.toLowerCase())
    );
  }

  if (precio_max) {
    results = results.filter(p =>
      p.precio <= Number(precio_max)
    );
  }

  res.json({
    total: results.length,
    properties: results
  });

});


// home
app.get("/", (req, res) => {

  res.send("API inmobiliaria funcionando");

});


// iniciar servidor
app.listen(PORT, () => {

  console.log("Servidor corriendo en puerto", PORT);

});
