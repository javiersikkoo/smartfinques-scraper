const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

const BASE = "https://www.inmuebles.smartfinques.com";

let cache = [];

const client = axios.create({
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept-Language": "es-ES,es;q=0.9"
  },
  timeout: 15000
});

function normalizeUrl(url) {

  if (!url) return null;

  if (url.startsWith("http")) return url;

  if (url.startsWith("/")) return BASE + url;

  return BASE + "/" + url;
}

async function getLinks() {

  const links = new Set();

  for (let i = 1; i <= 15; i++) {

    const url = `${BASE}/venta/?pag=${i}&idio=1`;

    console.log("Scanning page", i);

    try {

      const { data } = await client.get(url);

      const $ = cheerio.load(data);

      $("a[href*='/ficha/']").each((i, el) => {

        const href = $(el).attr("href");

        const full = normalizeUrl(href);

        if (full) links.add(full);

      });

    } catch (err) {

      console.log("Error scanning page", i);

    }

  }

  return [...links];
}

async function scrapeProperty(url) {

  try {

    const { data } = await client.get(url);

    const $ = cheerio.load(data);

    const bodyText = $("body").text();

    const priceMatch = bodyText.match(/[\d\.]+\s?€/);

    const fotos = [];

    $("img").each((i, el) => {

      const src = $(el).attr("src");

      if (src && src.includes("fotos")) {

        fotos.push(normalizeUrl(src));

      }

    });

    return {
      titulo: $("h1").first().text().trim() || null,
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

  cache = [];

  const links = await getLinks();

  console.log("Found properties:", links.length);

  for (const link of links) {

    const prop = await scrapeProperty(link);

    if (prop) cache.push(prop);

  }

  console.log("Scraped:", cache.length);

}

app.get("/", (req, res) => {
  res.send("SmartFinques scraper running");
});

app.get("/scrape", async (req, res) => {

  try {

    await scrapeAll();

    res.json({
      total: cache.length,
      message: "Scrape finished"
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
