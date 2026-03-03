# main.py
from flask import Flask, jsonify, send_file
from scraper import scrape_properties, export_to_csv, load_cache
import os
import json

app = Flask(__name__)

@app.route("/scrape")
def run_scrape():
    data = scrape_properties()
    export_to_csv(data)
    return {"status": "ok", "total": len(data)}

@app.route("/properties")
def properties():
    if not os.path.exists("cache.json"):
        return jsonify([])

    with open("cache.json", "r", encoding="utf-8") as f:
        data = json.load(f)["data"]

    return jsonify(data)

@app.route("/download-csv")
def download_csv():
    if not os.path.exists("properties.csv"):
        return {"error": "CSV no generado aún"}, 404
    return send_file("properties.csv", as_attachment=True)

if __name__ == "__main__":
    print("🚀 Servidor iniciado")
    app.run(host="0.0.0.0", port=10000)
