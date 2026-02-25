from flask import Flask, jsonify
from scraper.scraper_playwright import scrape_properties

app = Flask(__name__)

# Endpoint que devuelve los inmuebles scrapeados
@app.route("/properties", methods=["GET"])
def get_properties():
    try:
        properties = scrape_properties()
        if not properties:
            return jsonify({"error": "Aún no hay datos scrapeados"}), 404
        return jsonify(properties)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("🚀 Iniciando scraping...")
    app.run(host="0.0.0.0", port=10000)
