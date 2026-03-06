const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

const BASE = "https://www.inmuebles.smartfinques.com";

let cache = [];
let lastUpdate = 0;

async function getAllPropertyLinks(page) {

  const links = new Set();
  let pageNumber = 1;
  let hasNext = true;

  while (hasNext) {

    const url = `${BASE}/venta/?pag=${pageNumber}&idio=1`;

    console.log("Escaneando página", pageNumber);

    await page.goto(url, { waitUntil: "networkidle2" });

    const pageLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a"))
        .map(a => a.href)
        .filter(h => h.includes("/ficha/"));
    });

    pageLinks.forEach(l => links.add(l));

    if (pageLinks.length === 0) {
      hasNext = false;
    } else {
      pageNumber++;
    }

    if (pageNumber > 50) break; // seguridad
  }

  return [...links];
}

async function scrapeProperty(browser, url) {

  const page = await browser.newPage();

  try {

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const data = await page.evaluate(() => {

      const bodyText = document.body.innerText;

      function extract(label) {
        const r = new RegExp(label + "\\s*(\\d+)", "i");
        const m = bodyText.match(r);
        return m ? m[1] : null;
      }

      const priceMatch = bodyText.match(/[\d\.]+\s?€/);

      const fotos = Array.from(document.querySelectorAll("img"))
        .map(i => i.src)
        .filter(s => s.includes("fotos"));

      return {
        titulo: document.querySelector("h1")?.innerText || null,
        precio: priceMatch ? priceMatch[0] : null,
        referencia: extract("Referencia"),
        habitaciones: extract("Habitaciones"),
        banos: extract("Baños"),
        superficie: extract("Superficie"),
        descripcion:
          document.querySelector('meta[name="description"]')?.content || null,
        fotos
      };

    });

    data.url = url;

    await page.close();

    return data;

  } catch (err) {

    console.log("Error en propiedad:", url);

    await page.close();

    return null;

  }

}

async function scrapeAll() {

  console.log("Iniciando scraping completo");

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  const propertyLinks = await getAllPropertyLinks(page);

  console.log("Total fichas encontradas:", propertyLinks.length);

  const results = [];

  for (const link of propertyLinks) {

    const property = await scrapeProperty(browser, link);

    if (property) results.push(property);

  }

  await browser.close();

  cache = results;
  lastUpdate = Date.now();

  console.log("Scraping terminado:", results.length);

}

app.get("/", (req, res) => {
  res.send("SmartFinques scraper activo");
});

app.get("/scrape", async (req, res) => {

  try {

    await scrapeAll();

    res.json({
      total: cache.length
    });

  } catch (err) {

    res.status(500).json({
      error: "Error scraping"
    });

  }

});

app.get("/properties", (req, res) => {
  res.json(cache);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Servidor iniciado en puerto", PORT);
});
