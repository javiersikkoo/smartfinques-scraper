from scraper.fetch_listings import fetch_listings

if __name__ == "__main__":
    listings = fetch_listings()
    print(f"Inmuebles encontrados: {len(listings)}")

    for item in listings[:5]:
        print(item)
