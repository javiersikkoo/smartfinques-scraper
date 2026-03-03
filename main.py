from scraper import scrape_properties, export_properties

def main():
    total_pages = 12  # Cambia esto según cuántas páginas quieras scrapear
    print(f"Total páginas a scrapeear: {total_pages}")

    properties = scrape_properties(pages=total_pages, delay=1)
    print(f"Se han scrapeado {len(properties)} propiedades.")

    export_properties(properties)
    print("Archivos 'propiedades.json' y 'propiedades.csv' generados.")

if __name__ == "__main__":
    main()
