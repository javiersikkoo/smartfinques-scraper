# main.py
import json
from scraper import scrape_properties
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def index():
    return "🚀 Scraper Smartfinques activo"

@app.route("/scrape")
def scrape():
    try:
        # Ejecutamos la función de scraping
        properties = scrape_properties()

        # Guardamos el resultado en properties.json
        with open("properties.json", "w", encoding="utf-8") as f:
            json.dump(properties, f, ensure_ascii=False, indent=2)

        # Devolvemos la información en JSON también
        return jsonify({"count": len(properties), "status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    print("🚀 Iniciando scraping...")
    properties = scrape_properties()
    
    # Guardamos en properties.json al iniciar
    with open("properties.json", "w", encoding="utf-8") as f:
        json.dump(properties, f, ensure_ascii=False, indent=2)

    print(f"✅ Scraping completado, {len(properties)} inmuebles encontrados")
    app.run(host="0.0.0.0", port=10000)
