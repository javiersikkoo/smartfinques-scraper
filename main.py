from scraper import scrape_all_properties, export_to_json, export_to_csv

START_URL = "https://www.inmuebles.smartfinques.com/busqueda/propiedades"  # URL de listado principal

def main():
    propiedades = scrape_all_properties(START_URL)
    print(f"Se han scrapeado {len(propiedades)} propiedades.")
    export_to_json(propiedades)
    export_to_csv(propiedades)
    print("Archivos 'propiedades.json' y 'propiedades.csv' generados.")

if __name__ == "__main__":
    main()
