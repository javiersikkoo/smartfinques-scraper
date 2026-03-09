const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

const BASE = "https://www.inmuebles.smartfinques.com";
let cache = [];

async function getLinks(page) {

  const links = new Set();

  for (let i = 1; i <= 15; i++) {

    const url = `${BASE}/venta/?pag=${i}&idio=1`;

    console.log("Scanning page", i);

    await page.goto(url, { waitUntil: "networkidle2" });

    const pageLinks = await page.evaluate(() => {

      const anchors = Array.from(document.querySelectorAll("a"));

      return anchors
        .map(a => a.href)
        .filter(href => href.includes("/ficha/"));

    });

    pageLinks.forEach(l => links.add(l));

  }

  return [...links];
}

async function scrapeProperty(page, url) {

  try {

    await page.goto(url, { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {

      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.innerText.trim() : null;
      };

      const titulo = getText("h1");

      const precio = document.body.innerText.match(/[\d\.]+\s?€/);
      
      const descripcionMeta = document.querySelector('meta[name="description"]');
      const descripcion = descripcionMeta ? descripcionMeta.content : null;

      const fotos = Array.from(document.querySelectorAll("img"))
        .map(img => img.src)
        .filter(src => src.includes("fotos"));

      return {
        titulo,
        precio: precio ? precio[0] : null,
        descripcion,
        fotos
      };

    });

    data.url = url;

    return data;

  } catch (e) {

    console.log("Error scraping property", url);

    return null;

  }

}

async function scrapeAll() {

  cache = [];

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });

  const page = await browser.newPage();

  const links = await getLinks(page);

  console.log("Found properties:", links.length);

  for (const link of links) {

    const prop = await scrapeProperty(page, link);

    if (prop) cache.push(prop);

  }

  await browser.close();

  console.log("Scraped:", cache.length);

}

app.get("/", (req, res) => {
  res.send("SmartFinques Puppeteer scraper running");
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
