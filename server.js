const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

const BASE = "https://www.inmuebles.smartfinques.com";
let cache = [];
let lastUpdate = 0;

async function scrapeAll() {

  console.log("Iniciando scraping...");

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  const properties = [];

  for (let i = 1; i <= 12; i++) {

    const url = `${BASE}/venta/?pag=${i}&idio=1`;

    console.log("Página:", i);

    await page.goto(url, { waitUntil: "networkidle2" });

    const links = await page.evaluate(() => {

      const anchors = Array.from(document.querySelectorAll("a"));

      return anchors
        .map(a => a.href)
        .filter(h => h.includes("/ficha/"));

    });

    const uniqueLinks = [...new Set(links)];

    for (const link of uniqueLinks) {

      const p = await browser.newPage();

      await p.goto(link, { waitUntil: "domcontentloaded" });

      const data = await p.evaluate(() => {

        const text = document.body.innerText;

        function extract(label) {
          const r = new RegExp(label + "\\s*(\\d+)", "i");
          const m = text.match(r);
          return m ? m[1] : null;
        }

        const precio = document.body.innerText.match(/[\d\.]+\s?€/);

        const fotos = Array.from(document.querySelectorAll("img"))
          .map(i => i.src)
          .filter(s => s.includes("fotos"));

        return {
          titulo: document.querySelector("h1")?.innerText || null,
          precio: precio ? precio[0] : null,
          referencia: extract("Referencia"),
          habitaciones: extract("Habitaciones"),
          banos: extract("Baños"),
          superficie: extract("Superficie"),
          descripcion: document.querySelector('meta[name="description"]')?.content || null,
          fotos
        };

      });

      data.url = link;

      properties.push(data);

      await p.close();

    }

  }

  await browser.close();

  console.log("Se han scrapeado", properties.length, "inmuebles");

  cache = properties;
  lastUpdate = Date.now();

}

app.get("/", (req,res)=>{
  res.send("SmartFinques scraper activo");
});

app.get("/scrape", async (req,res)=>{

  await scrapeAll();

  res.json({
    total: cache.length
  });

});

app.get("/properties",(req,res)=>{
  res.json(cache);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, ()=>{
  console.log("Server running on",PORT);
});
