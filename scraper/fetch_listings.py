import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re

BASE_URL = "https://www.inmuebles.smartfinques.com"
LISTINGS_URL = BASE_URL + "/venta"

def extract_background_image(style):
    """
    Extrae la URL de background-image desde el atributo style
    """
    if not style:
        return None
    match = re.search(r"url\(['\"]?(.*?)['\"]?\)", style)
    return match.group(1) if match else None


def fetch_listings():
    response = requests.get(
        LISTINGS_URL,
        headers={
            "User-Agent": "Mozilla/5.0"
        },
        timeout=15
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    cards = soup.select("div.paginacion-ficha-bloque1")

    listings = []

    for card in cards:
        # Precio
        price_el = card.select_one(".paginacion-ficha-tituloprecio")
        price = price_el.get_text(strip=True) if price_el else None

        # Enlace
        link_el = card.select_one("a.irafichaPropiedad")
        url = urljoin(BASE_URL, link_el["href"]) if link_el else None

        # Imagen
        style = card.get("style", "")
        image = extract_background_image(style)

        listings.append({
            "price": price,
            "url": url,
            "image": image,
        })

    return listings
