from flask import Flask, jsonify
from scraper import scrape_properties
import os
import threading
import time

app = Flask(__name__)

properties_cache = []

# 🔁 Función que ejecuta scraping cada X minutos
def auto_scrape(interval_minutes=30):
    global properties_cache
    while True:
        try:
            print("🔄 Ejecutando scraping automático...")
            properties_cache = scrape_properties()
            print(f"✅ Actualizado. Total inmuebles: {len(properties_cache)}")
        except Exception as e:
            print("❌ Error en scraping automático:", e)
        
        time.sleep(interval_minutes * 60)


@app.route("/")
def home():
    return "Smartfinques Scraper funcionando 🚀"


@app.route("/properties")
def properties():
    if not properties_cache:
        return jsonify({"error": "Aún no hay datos scrapeados"})
    return jsonify(properties_cache)


if __name__ == "__main__":
    # 🟢 Lanzamos el scraping automático en segundo plano
    thread = threading.Thread(target=auto_scrape, daemon=True)
    thread.start()

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000))
    )
