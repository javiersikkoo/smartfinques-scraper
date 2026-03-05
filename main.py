from flask import Flask, jsonify
from scraper import scrape_properties
from cache import load_cache, save_cache, is_cache_valid
import os

app = Flask(__name__)


@app.route("/")
def home():
    return {"status": "SmartFinques scraper activo"}


@app.route("/properties")
def properties():

    if is_cache_valid():
        data = load_cache()
        print("Usando cache")
        return jsonify(data)

    print("Iniciando scraping...")

    data = scrape_properties()

    save_cache(data)

    return jsonify(data)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
