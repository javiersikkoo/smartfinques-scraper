const express = require("express");
const { chromium } = require("playwright");

const app = express();

const BASE = "https://www.inmuebles.smartfinques.com";

let cache = [];

async function scrapeAll() {

  cache = [];

  const browser = await chromium.launch({
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  const links = new Set();

  for (let i = 1; i <= 10; i++) {

    const url = `${BASE}/venta/?pag=${i}&idio=1`;

    console.log("Scanning page", i);

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const pageLinks = await page.evaluate(() => {

      return Array.from(document.querySelectorAll("a"))
        .map(a => a.href)
        .filter(h => h.includes("/ficha/"));

    });

    pageLinks.forEach(l => links.add(l));

  }

  console.log("Found properties:", links.size);

  for (const link of links) {

    try {

      await page.goto(link, { waitUntil: "domcontentloaded" });

      const data = await page.evaluate(() => {

        const titulo = document.querySelector("h1")?.innerText || null;

        const bodyText = document.body.innerText;

        const priceMatch = bodyText.match(/[\d\.]+\s?€/);

        const descripcion = document.querySelector('meta[name="description"]')?.content || null;

        const fotos = Array.from(document.querySelectorAll("img"))
          .map(img => img.src)
          .filter(src => src.includes("fotos"));

        return {
          titulo,
          precio: priceMatch ? priceMatch[0] : null,
          descripcion,
          fotos
        };

      });

      data.url = link;

      cache.push(data);

      console.log("Scraped:", link);

    } catch (e) {

      console.log("Error scraping", link);

    }

  }

  await browser.close();

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
