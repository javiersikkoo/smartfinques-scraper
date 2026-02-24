from scraper.scraper_playwright import scrape_all_properties

if __name__ == "__main__":
    properties = scrape_all_properties()
    print(f"Total inmuebles encontrados: {len(properties)}")
    for prop in properties:
        print("======================================")
        print(f"URL: {prop['url']}")
        print(f"Precio: {prop['price']}")
        print(f"Imagen: {prop['image']}")
        print(f"Zona: {prop['zone']}")
