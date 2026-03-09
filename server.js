const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");

const app = express();

const XML_URL = "PON_AQUI_EL_XML_DIRECTO";

let cache = [];

async function loadXML() {

  const response = await axios.get(XML_URL);

  const parser = new xml2js.Parser({ explicitArray: false });

  const result = await parser.parseStringPromise(response.data);

  const propiedades = result.propiedades.propiedad;

  const list = propiedades.map(p => {

    const d = p.datos;

    let fotos = [];

    if (p.fotos) {

      if (Array.isArray(p.fotos)) {

        p.fotos.forEach(f => {
          const url = Object.values(f)[0];
          if (url) fotos.push(url);
        });

      } else {

        const url = Object.values(p.fotos)[0];
        if (url) fotos.push(url);

      }

    }

    return {

      id: d.id,
      referencia: d.ofertas_ref,
      titulo: d.ofertas_titulo1,
      descripcion: d.ofertas_descrip1,

      precio: Number(d.ofertas_precioinmo),

      tipo: d.tipo_tipo_ofer,

      ciudad: d.ciudad_ciudad,
      zona: d.zonas_zona,

      habitaciones: Number(d.totalhab),
      banos: Number(d.ofertas_banyos),

      superficie: Number(d.ofertas_m_cons),

      lat: Number(d.ofertas_latitud),
      lng: Number(d.ofertas_altitud),

      fotos

    };

  });

  cache = list;

  console.log("Propiedades cargadas:", cache.length);

}

app.get("/", (req, res) => {
  res.send("SmartFinques API running");
});

app.get("/scrape", async (req, res) => {

  try {

    await loadXML();

    res.json({
      total: cache.length
    });

  } catch (e) {

    res.status(500).json({
      error: e.message
    });

  }

});

app.get("/properties", (req, res) => {

  res.json(cache);

});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {

  console.log("Server running");

});
