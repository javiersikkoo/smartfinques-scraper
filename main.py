from flask import Flask, jsonify
from scraper import scrape_properties
from cache import is_cache_valid, load_cache, save_cache
import os

app = Flask(__name__)

@app.route("/")
def home():
    return "Scraper Smartfinques activo 🚀"

@app.route("/scrape")
def scrape():
    if is_cache_valid():
        data = load_cache()
        return jsonify({
            "message": "Usando cache",
            "total": len(data)
        })

    properties = scrape_properties(pages=12, delay=1)
    save_cache(properties)

    print(f"✅ Se han scrapeado {len(properties)} inmuebles")

    return jsonify({
        "message": "Scraping completado",
        "total": len(properties)
    })

@app.route("/properties")
def properties():
    if is_cache_valid():
        return jsonify(load_cache())
    return jsonify([])

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
