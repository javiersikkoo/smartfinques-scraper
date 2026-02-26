# main.py
from flask import Flask, jsonify
from scraper import scrape_properties

app = Flask(__name__)

@app.route("/properties", methods=["GET"])
def get_properties():
    properties = scrape_properties()
    return jsonify(properties)

if __name__ == "__main__":
    print("🚀 Iniciando scraping y servidor...")
    app.run(host="0.0.0.0", port=10000)
