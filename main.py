# main.py
from flask import Flask, jsonify
from scraper.scraper_playwright import scrape_properties
import os
import threading
import time
import json

app = Flask(__name__)

# Ruta para obtener los inmuebles
@app.route("/properties", methods=["GET"])
def get_properties():
    if not os.path.exists("properties.json"):
        return jsonify({"error": "Aún no hay datos scrapeados"})
    with open("properties.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)

# Función para actualizar scraping cada X minutos
def auto_scrape(interval_minutes=30):
    while True:
        try:
            scrape_properties()
        except Exception as e:
            print("❌ Error en scraping automático:", e)
        time.sleep(interval_minutes * 60)

if __name__ == "__main__":
    # Lanzamos scraping en segundo plano cada 30 minutos
    threading.Thread(target=auto_scrape, daemon=True).start()

    # Ejecutamos Flask
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
