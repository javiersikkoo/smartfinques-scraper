from scraper.fetch_listings import fetch_listings
from scraper.fetch_property_detail import fetch_property_detail


if __name__ == "__main__":

    listings = fetch_listings()

    print(f"\nTotal inmuebles encontrados: {len(listings)}\n")

    # Solo probamos con los 3 primeros para no saturar
    for property_data in listings[:3]:

        print("======================================")
        print("URL:", property_data["url"])

        if property_data["url"]:
            detail = fetch_property_detail(property_data["url"])
            print("Título:", detail["title"])
            print("Habitaciones:", detail["bedrooms"])
            print("Baños:", detail["bathrooms"])
            print("Metros:", detail["meters"])
            print("Imágenes:", len(detail["images"]))
