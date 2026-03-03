# main.py

from flask import Flask, jsonify
from scraper import scrape_properties
import json
import os

app = Flask(__name__)

CACHE_FILE = "cache.json"


@app.route("/scrape", methods=["GET"])
def scrape():
    data = scrape_properties()
    return jsonify({
        "message": f"Se han scrapeado {len(data)} inmuebles"
    })


@app.route("/properties", methods=["GET"])
def get_properties():
    if not os.path.exists(CACHE_FILE):
        return jsonify([])

    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    return jsonify(data.get("data", []))


if __name__ == "__main__":
    print("🚀 Servidor iniciado")
    app.run(host="0.0.0.0", port=10000)
