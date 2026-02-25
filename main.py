from flask import Flask, jsonify
from scraper.scraper_playwright import scrape_properties

app = Flask(__name__)

# Variable global para almacenar inmuebles en memoria
properties_data = []

# Endpoint que dispara el scraping
@app.route("/scrape")
def scrape():
    global properties_data
    try:
        properties_data = scrape_properties()  # ejecuta el scraping
        return jsonify({"status": "ok", "count": len(properties_data)})
    except Exception as e:
        return jsonify({"error": str(e)})

# Endpoint que devuelve los inmuebles
@app.route("/properties")
def get_properties():
    if not properties_data:
        return jsonify({"error": "Aún no hay datos scrapeados"})
    return jsonify(properties_data)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
