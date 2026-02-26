from flask import Flask, jsonify
from scraper import scrape_properties
import os

app = Flask(__name__)

# Cache en memoria
properties_cache = []

@app.route("/")
def home():
    return "Smartfinques Scraper funcionando 🚀"

@app.route("/scrape")
def scrape():
    global properties_cache
    try:
        properties_cache = scrape_properties()
        return jsonify({
            "status": "ok",
            "count": len(properties_cache)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/properties")
def properties():
    if not properties_cache:
        return jsonify({"error": "Aún no hay datos scrapeados"})
    return jsonify(properties_cache)

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000))
    )
