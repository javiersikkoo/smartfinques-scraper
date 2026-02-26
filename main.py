from flask import Flask, jsonify
from scraper import scrape_properties

app = Flask(__name__)

@app.route("/")
def index():
    return "🚀 Scraper de Smartfinques activo. Accede a /properties para ver los inmuebles."

@app.route("/properties")
def get_properties():
    # Ejecuta el scraping
    properties = scrape_properties()
    
    # Devuelve un JSON con el número de propiedades y la lista
    return jsonify({
        "count": len(properties),
        "properties": properties,
        "status": "ok"
    })

if __name__ == "__main__":
    # Render detecta el puerto desde la variable de entorno PORT
    import os
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
