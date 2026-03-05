import express from "express"
import axios from "axios"
import * as cheerio from "cheerio"

const app = express()
const PORT = process.env.PORT || 3000

let properties = []

const BASE = "https://www.inmuebles.smartfinques.com"

app.get("/", (req,res)=>{
  res.send("scraper running")
})

app.get("/scrape", async (req,res)=>{

  properties = []

  const listURL =
  "https://www.inmuebles.smartfinques.com/propiedades"

  const {data} = await axios.get(listURL)

  const $ = cheerio.load(data)

  let links=[]

  $("a").each((i,el)=>{

    const href=$(el).attr("href")

    if(href && href.includes("/ficha/")){

      const url=BASE+href

      if(!links.includes(url)) links.push(url)

    }

  })

  console.log("fichas:",links.length)

  for(const url of links){

    try{

      const {data}=await axios.get(url)

      const $=cheerio.load(data)

      const titulo=$("h1").first().text().trim()

      const precio=$(".precio").first().text().trim()

      const descripcion=$("#descripcion").text().trim()

      properties.push({
        titulo,
        precio,
        descripcion,
        url
      })

    }catch(e){
      console.log("error:",url)
    }

  }

  res.json({
    scraped:properties.length
  })

})

app.get("/properties",(req,res)=>{
  res.json(properties)
})

app.listen(PORT,()=>{
  console.log("server running on",PORT)
})
