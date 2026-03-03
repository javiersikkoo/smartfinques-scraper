# main.py
from flask import Flask, jsonify
from scraper import scrape_properties
from cache import is_cache_valid, load_cache, save_cache

app = Flask(__name__)

@app.route("/properties", methods=["GET"])
def properties():
    if is_cache_valid():
        print("⚡ Sirviendo datos desde cache")
        return jsonify(load_cache())

    print("♻️ Cache inválida, scrapeando...")
    data = scrape_properties()
    save_cache(data)
    return jsonify(data)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    print("🚀 Backend Smartfinques iniciado")
    app.run(host="0.0.0.0", port=10000)
