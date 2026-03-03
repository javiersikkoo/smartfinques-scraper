# main.py
from flask import Flask, jsonify
from scraper import scrape_properties
from cache import is_cache_valid, load_cache, save_cache

app = Flask(__name__)

@app.route("/properties", methods=["GET"])
def get_properties():
    if is_cache_valid():
        print("⚡ Usando datos cacheados")
        return jsonify(load_cache())

    print("♻️ Cache no válida, ejecutando scraping...")
    data = scrape_properties()
    save_cache(data)
    return jsonify(data)

if __name__ == "__main__":
    print("🚀 Servidor iniciado")
    app.run(host="0.0.0.0", port=10000)
