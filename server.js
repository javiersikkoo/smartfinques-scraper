const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const { Parser } = require("json2csv");

const app = express();

const BASE_URL = "https://www.inmuebles.smartfinques.com";
let properties = [];

function normalizeUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return BASE_URL + url;
  return BASE_URL + "/" + url;
}

async function scrapeProperty(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const titulo = $("h1").first().text().trim() || null;

    const precio = $(".precio, .precio1").first().text().trim() || null;

    const descripcion =
      $('meta[name="description"]').attr("content") ||
      $(".descripcion").text().trim() ||
      null;

    let referencia = null;
    let habitaciones = null;
    let banos = null;
    let superficie = null;
    let ciudad = null;

    $("li").each((i, el) => {
      const text = $(el).text();

      if (text.includes("Referencia")) referencia = text.replace("Referencia", "").trim();
      if (text.includes("Habitaciones")) habitaciones = text.replace("Habitaciones", "").trim();
      if (text.includes("Baños")) banos = text.replace("Baños", "").trim();
      if (text.includes("Superficie")) superficie = text.replace("Superficie", "").trim();
      if (text.includes("Población")) ciudad = text.replace("Población", "").trim();
    });

    const fotos = [];

    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.includes("fotos")) {
        fotos.push(normalizeUrl(src));
      }
    });

    return {
      titulo,
      precio,
      referencia,
      habitaciones,
      banos,
      superficie,
      ciudad,
      descripcion,
      fotos,
      url
    };
  } catch (error) {
    console.log("Error scrapeando ficha:", url);
    return null;
  }
}

async function scrapeAll() {

  properties = []

  const pages = 12

  for (let page = 1; page <= pages; page++) {

    const url = `${BASE_URL}/venta/?pag=${page}&idio=1#modulo-paginacion`

    console.log("Scrapeando página", page)

    try {

      const { data } = await axios.get(url)

      const $ = cheerio.load(data)

      const links = []

      $(".paginacion-ficha-masinfo").each((i, el) => {

        const href = $(el).attr("href")

        if (href) {
          links.push(normalizeUrl(href))
        }

      })

      console.log("links encontrados:", links.length)

      for (const link of links) {

        const prop = await scrapeProperty(link)

        if (prop) properties.push(prop)

      }

    } catch (err) {

      console.log("Error página", page)

    }

  }

  console.log("Se han scrapeado", properties.length, "inmuebles")

  return properties

}

app.get("/", (req, res) => {
  res.send("Servidor scraper funcionando");
});

app.get("/scrape", async (req, res) => {
  const data = await scrapeAll();
  res.json({
    total: data.length,
    message: "Scrape completado"
  });
});

app.get("/properties", (req, res) => {
  res.json(properties);
});

app.get("/export-csv", (req, res) => {
  if (!properties.length) {
    return res.send("No hay propiedades scrapeadas aún");
  }

  const parser = new Parser();
  const csv = parser.parse(properties);

  res.header("Content-Type", "text/csv");
  res.attachment("propiedades.csv");
  return res.send(csv);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});
