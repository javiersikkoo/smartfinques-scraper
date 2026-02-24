import requests
from bs4 import BeautifulSoup

LISTINGS_URL = "https://www.inmuebles.smartfinques.com/venta"

def fetch_listings():
    response = requests.get(LISTINGS_URL, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    cards = soup.select(".property-card")

    listings = []

    for card in cards:
        title = card.select_one(".property-title")
        price = card.select_one(".property-price")
        link = card.select_one("a")

        listings.append({
            "title": title.get_text(strip=True) if title else None,
            "price": price.get_text(strip=True) if price else None,
            "url": link["href"] if link else None,
        })

    return listings
