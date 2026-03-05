const express = require("express")
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
  return BASE_URL + url
}

async function scrapeProperty(url) {

  try {

    const { data } = await axios.get(url)

    const $ = cheerio.load(data)

    const titulo = $("h1").first().text().trim()

    const precio = $(".precio").first().text().trim()

    const referencia = $(".ficha_referencia")
      .text()
      .replace("Ref:", "")
      .trim()

    const descripcion = $(".ficha_descripcion").text().trim()

    const caracteristicas = {}

    $(".ficha_caracteristicas li").each((i, el) => {

      const txt = $(el).text().trim()

      const parts = txt.split(":")

      if (parts.length === 2) {

        caracteristicas[parts[0].trim()] = parts[1].trim()

      }

    })

    const fotos = []

    $(".ficha_galeria img").each((i, el) => {

      let src = $(el).attr("src")

      if (src) {

        src = normalizeUrl(src)

        if (!fotos.includes(src)) fotos.push(src)

      }

    })

    return {
      titulo,
      precio,
      referencia,
      descripcion,
      fotos,
      url,
      ...caracteristicas
    }

  } catch (err) {

    console.log("error ficha:", url)

    return null

  }

}

async function scrapeAll() {

  properties = []

  const pages = 15

  for (let page = 1; page <= pages; page++) {

    const url = `${BASE_URL}/venta/?pag=${page}&idio=1`

    console.log("scrapeando página", page)

    try {

      const { data } = await axios.get(url)

      const $ = cheerio.load(data)

      const links = []

      $("a").each((i, el) => {

        const href = $(el).attr("href")

        if (href && href.includes("/ficha/")) {

          const full = normalizeUrl(href)

          if (!links.includes(full)) {
            links.push(full)
          }

        }

      })

      console.log("links encontrados:", links.length)

      for (const link of links) {

        const prop = await scrapeProperty(link)

        if (prop) properties.push(prop)

      }

    } catch (err) {

      console.log("error página:", page)

    }

  }

  lastScrape = new Date()

  console.log("TOTAL INMUEBLES:", properties.length)

}

async function autoScrape() {

  console.log("AUTO SCRAPE")

  await scrapeAll()

}

setInterval(autoScrape, 1000 * 60 * 60)

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
    referencia: p.referencia,
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

  console.log("Servidor funcionando en puerto", PORT)

})
