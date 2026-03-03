# main.py
from flask import Flask, jsonify, send_file
from scraper import scrape_properties, export_to_csv

app = Flask(__name__)

@app.route("/properties")
def properties():
    data = scrape_properties()
    export_to_csv(data)
    return jsonify(data)

@app.route("/download-csv")
def download_csv():
    return send_file("properties.csv", as_attachment=True)

if __name__ == "__main__":
    print("🚀 Servidor iniciado")
    app.run(host="0.0.0.0", port=10000)
