const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

const BASE = "https://www.inmuebles.smartfinques.com";

let cache = [];

async function getLinks() {

  const links = new Set();

  for (let i = 1; i <= 20; i++) {

    const url = `${BASE}/venta/?pag=${i}&idio=1`;

    console.log("Scanning page", i);

    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    $("a").each((i, el) => {

      const href = $(el).attr("href");

      if (href && href.includes("/ficha/")) {

        const full = href.startsWith("http") ? href : BASE + href;

        links.add(full);

      }

    });

  }

  return [...links];
}

async function scrapeProperty(url) {

  try {

    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    const text = $("body").text();

    const priceMatch = text.match(/[\d\.]+\s?€/);

    const fotos = [];

    $("img").each((i, el) => {

      const src = $(el).attr("src");

      if (src && src.includes("fotos")) {
        fotos.push(src);
      }

    });

    return {
      titulo: $("h1").text() || null,
      precio: priceMatch ? priceMatch[0] : null,
      descripcion: $('meta[name="description"]').attr("content") || null,
      fotos,
      url
    };

  } catch (e) {

    console.log("Error property", url);

    return null;

  }

}

async function scrapeAll() {

  const links = await getLinks();

  console.log("Found properties:", links.length);

  const results = [];

  for (const link of links) {

    const p = await scrapeProperty(link);

    if (p) results.push(p);

  }

  cache = results;

}

app.get("/", (req, res) => {
  res.send("SmartFinques scraper running");
});

app.get("/scrape", async (req, res) => {

  try {

    await scrapeAll();

    res.json({
      total: cache.length
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

});

app.get("/properties", (req, res) => {
  res.json(cache);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
