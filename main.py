from flask import Flask, jsonify
from scraper import scrape_properties

app = Flask(__name__)

# Endpoint para obtener los inmuebles
@app.route("/properties")
def get_properties():
    data = scrape_properties()
    if not data:
        return jsonify({"error": "Aún no hay datos scrapeados"}), 200
    return jsonify({"count": len(data), "status": "ok", "properties": data})

# Endpoint de prueba
@app.route("/")
def home():
    return "SmartFinques Scraper Service is running 🚀"

if __name__ == "__main__":
    # Servidor en todas las interfaces y puerto 10000
    app.run(host="0.0.0.0", port=10000)
