from flask import Flask, jsonify
from scraper import scrape_properties

app = Flask(__name__)

properties_cache = []

@app.route("/scrape")
def scrape():
    global properties_cache
    properties_cache = scrape_properties()
    return jsonify({
        "status": "ok",
        "count": len(properties_cache)
    })

@app.route("/properties")
def properties():
    if not properties_cache:
        return jsonify({"error": "Aún no hay datos scrapeados"})
    return jsonify(properties_cache)

@app.route("/")
def home():
    return "Smartfinques Scraper funcionando 🚀"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
