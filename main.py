# main.py
from flask import Flask, jsonify
from threading import Thread
import time
import os
from scraper import scrape_properties

app = Flask(__name__)
DATA_FILE = "properties.json"

# Función para actualizar el JSON automáticamente cada X segundos
def auto_scrape(interval=1800):
    while True:
        print("🚀 Iniciando scraping automático...")
        props = scrape_properties()
        print(f"Scrape completado. Total inmuebles: {len(props)}")
        time.sleep(interval)

# Endpoint para forzar un scrapeo manual
@app.route("/scrape", methods=["GET"])
def scrape_endpoint():
    props = scrape_properties()
    return jsonify({"status": "ok", "count": len(props)})

# Endpoint para devolver propiedades
@app.route("/properties", methods=["GET"])
def get_properties():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = f.read()
        if not data or data == "[]":
            return jsonify({"error": "Aún no hay datos scrapeados"})
        return data
    else:
        return jsonify({"error": "Aún no hay datos scrapeados"})

if __name__ == "__main__":
    # Lanzamos scraping automático en segundo plano
    thread = Thread(target=auto_scrape, args=(1800,), daemon=True)  # cada 30 min
    thread.start()

    # Ejecutamos Flask
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
