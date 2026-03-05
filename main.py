from flask import Flask, jsonify, send_file
from scraper import scrape_properties
from cache import load_cache, save_cache, is_cache_valid
import csv
import os

app = Flask(__name__)

CACHE_FILE = "properties_cache.json"
CSV_FILE = "properties.csv"


@app.route("/")
def home():
    return {"status": "API SmartFinques funcionando"}


@app.route("/properties")
def properties():

    if is_cache_valid():
        print("📦 Usando cache")
        data = load_cache()
        return jsonify(data)

    print("🚀 Iniciando scraping...")

    properties = scrape_properties(pages=12)

    print(f"✅ Se han scrapeado {len(properties)} inmuebles")

    save_cache(properties)

    return jsonify(properties)


@app.route("/download-csv")
def download_csv():

    if is_cache_valid():
        properties = load_cache()
    else:
        properties = scrape_properties(pages=12)
        save_cache(properties)

    if not properties:
        return {"error": "No hay propiedades"}

    keys = properties[0].keys()

    with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(properties)

    return send_file(CSV_FILE, as_attachment=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
