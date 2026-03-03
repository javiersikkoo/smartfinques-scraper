# main.py
from scraper import scrape_all_properties, export_to_json, export_to_csv

if __name__ == "__main__":
    listado_url = "https://www.inmuebles.smartfinques.com/listado-de-propiedades/"

    propiedades = scrape_all_properties(listado_url, delay=1)

    export_to_json(propiedades)
    export_to_csv(propiedades)

    print(f"Se han scrapeado {len(propiedades)} propiedades.")
    print("Archivos 'propiedades.json' y 'propiedades.csv' generados.")
