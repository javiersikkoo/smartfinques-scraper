const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();

let cache = [];

async function scrape() {

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });

  const page = await browser.newPage();

  await page.goto("https://example.com", {
    waitUntil: "domcontentloaded"
  });

  const title = await page.title();

  await browser.close();

  cache = [{ title }];

}

app.get("/", (req,res)=>{
  res.send("Scraper running");
});

app.get("/scrape", async (req,res)=>{

  try{

    await scrape();

    res.json({
      success:true,
      data: cache
    });

  }catch(err){

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

});

app.get("/properties",(req,res)=>{
  res.json(cache);
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, ()=>{
  console.log("Server running on", PORT);
});
