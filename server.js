const express = require("express")
const puppeteer = require("puppeteer")
const axios = require("axios")
const cheerio = require("cheerio")
const { Parser } = require("json2csv")

const app = express()

const BASE_URL = "https://inmuebles.smartfinques.com"

let properties = []
let lastScrape = null


function normalizeUrl(url) {

  if (!url) return null

  if (url.startsWith("http")) return url

  if (!url.startsWith("/")) url = "/" + url

  return BASE_URL + url

}


async function scrapeProperty(url) {

  try {

    const { data } = await axios.get(url)

    const $ = cheerio.load(data)

    const titulo = $("h1").first().text().trim()

    const precio = $(".precio").first().text().trim()

    const descripcion = $(".ficha_descripcion").text().trim()

    const fotos = []

    $("img").each((i, el) => {

      const src = $(el).attr("src")

      if (src && src.includes("inmuebles")) {

        const img = normalizeUrl(src)

        if (!fotos.includes(img)) fotos.push(img)

      }

    })

    return {
      titulo,
      precio,
      descripcion,
      fotos,
      url
    }

  } catch (err) {

    console.log("❌ error ficha:", url)

    return null

  }

}


async function scrapeAll() {

  properties = []

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  })

  const page = await browser.newPage()

  await page.goto(`${BASE_URL}/venta`, {
    waitUntil: "networkidle2"
  })

  await new Promise(r => setTimeout(r, 4000))

  const links = await page.evaluate(() => {

    const arr = []

    document.querySelectorAll("a").forEach(a => {

      const href = a.getAttribute("href")

      if (href && href.includes("/ficha/")) {

        arr.push(href)

      }

    })

    return [...new Set(arr)]

  })

  console.log("🔗 links encontrados:", links.length)

  for (const link of links) {

    const full = normalizeUrl(link)

    const prop = await scrapeProperty(full)

    if (prop) properties.push(prop)

  }

  await browser.close()

  lastScrape = new Date()

  console.log("🏠 TOTAL INMUEBLES:", properties.length)

}


app.get("/", (req, res) => {

  res.json({
    status: "running",
    properties: properties.length,
    lastScrape
  })

})


app.get("/scrape", async (req, res) => {

  await scrapeAll()

  res.json({
    message: "scrape completado",
    total: properties.length
  })

})


app.get("/properties", (req, res) => {

  res.json(properties)

})


app.get("/base44-properties", (req, res) => {

  const formatted = properties.map(p => ({

    titulo: p.titulo,
    precio: p.precio,
    descripcion: p.descripcion,
    url: p.url,
    fotos: p.fotos.join(",")

  }))

  res.json(formatted)

})


app.get("/download-csv", (req, res) => {

  const parser = new Parser()

  const csv = parser.parse(properties)

  res.header("Content-Type", "text/csv")
  res.attachment("inmuebles.csv")

  res.send(csv)

})


const PORT = process.env.PORT || 3000

app.listen(PORT, () => {

  console.log("🚀 servidor funcionando en puerto", PORT)

})
