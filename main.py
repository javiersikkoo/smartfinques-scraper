# main.py
from scraper import scrape_all_properties, export_to_json

if __name__ == "__main__":
    # URL del listado principal de propiedades
    listado_url = "https://www.inmuebles.smartfinques.com/listado-de-propiedades/"

    # Scrapea todas las propiedades con paginación
    propiedades = scrape_all_properties(listado_url)

    # Exporta los resultados a JSON
    export_to_json(propiedades, filename="propiedades.json")

    print(f"Se han scrapeado {len(propiedades)} propiedades. Archivo 'propiedades.json' generado.")
