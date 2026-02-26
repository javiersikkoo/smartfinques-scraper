from flask import Flask, jsonify
from scraper import scrape_properties
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
import json

app = Flask(__name__)

# Archivo donde guardaremos los inmuebles
DATA_FILE = "properties.json"

# Función que ejecuta el scraper y guarda los datos
def update_properties():
    print("🚀 Ejecutando scraping automático...")
    try:
        properties = scrape_properties()  # tu función existente
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(properties, f, ensure_ascii=False, indent=4)
        print(f"✅ Scraping completado. {len(properties)} inmuebles guardados.")
    except Exception as e:
        print(f"❌ Error en scraping: {e}")

# Scheduler que ejecuta el scraper cada 6 horas
scheduler = BackgroundScheduler()
scheduler.add_job(func=update_properties, trigger="interval", hours=6)
scheduler.start()

# Asegurar que el scheduler se cierre al terminar la app
atexit.register(lambda: scheduler.shutdown())

# Endpoint para obtener los datos de los inmuebles
@app.route("/properties")
def get_properties():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            properties = json.load(f)
        if not properties:
            return jsonify({"error": "Aún no hay datos scrapeados"}), 200
        return jsonify({"count": len(properties), "status": "ok", "data": properties})
    except FileNotFoundError:
        return jsonify({"error": "Aún no hay datos scrapeados"}), 200

# Endpoint opcional para forzar el scraping manualmente
@app.route("/scrape")
def manual_scrape():
    update_properties()
    return jsonify({"status": "Scraping ejecutado"}), 200

if __name__ == "__main__":
    # Ejecutar scraping inicial al arrancar la app
    update_properties()
    app.run(host="0.0.0.0", port=10000)
