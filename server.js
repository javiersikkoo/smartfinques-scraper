const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

const BASE = "https://www.inmuebles.smartfinques.com";

let cache = [];

async function getAllPropertyLinks(page) {

  const links = new Set();

  for (let i = 1; i <= 20; i++) {

    const url = `${BASE}/venta/?pag=${i}&idio=1`;

    console.log("Scanning page", i);

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const pageLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a"))
        .map(a => a.href)
        .filter(h => h.includes("/ficha/"));
    });

    if (pageLinks.length === 0) break;

    pageLinks.forEach(l => links.add(l));

  }

  return [...links];
}

async function scrapeProperty(page, url) {

  try {

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const data = await page.evaluate(() => {

      const text = document.body.innerText;

      const priceMatch = text.match(/[\d\.]+\s?€/);

      const fotos = Array.from(document.querySelectorAll("img"))
        .map(i => i.src)
        .filter(src => src.includes("fotos"));

      return {
        titulo: document.querySelector("h1")?.innerText || null,
        precio: priceMatch ? priceMatch[0] : null,
        descripcion: document.querySelector('meta[name="description"]')?.content || null,
        fotos
      };

    });

    data.url = url;

    return data;

  } catch (err) {

    console.log("Error scraping property:", url);

    return null;

  }

}

async function scrapeAll() {

  console.log("Starting scrape");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  const links = await getAllPropertyLinks(page);

  console.log("Properties found:", links.length);

  const results = [];

  for (const link of links) {

    const data = await scrapeProperty(page, link);

    if (data) results.push(data);

  }

  await browser.close();

  cache = results;

  console.log("Scraped:", results.length);

}

app.get("/", (req, res) => {
  res.send("SmartFinques scraper running");
});

app.get("/scrape", async (req, res) => {

  try {

    await scrapeAll();

    res.json({
      success: true,
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
