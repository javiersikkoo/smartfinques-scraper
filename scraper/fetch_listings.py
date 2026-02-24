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
    if match:
        img_url = match.group(1)

        # Si es relativa (ej: img/nofotos.png), la convertimos en absoluta
        if not img_url.startswith("http"):
            img_url = urljoin(BASE_URL, img_url)

        return img_url

    return None


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

    # Cada inmueble está en este div
    cards = soup.select("div.paginacion-ficha-bloque1")

    listings = []

    for card in cards:

        # Precio
        price_el = card.select_one(".paginacion-ficha-tituloprecio")
        price = price_el.get_text(strip=True) if price_el else None

        # Buscar enlace real que contenga /ficha/
        url = None
        for a in card.find_all("a", href=True):
            if "/ficha/" in a["href"]:
                url = urljoin(BASE_URL, a["href"])
                break

        # Imagen principal (background-image)
        style = card.get("style", "")
        image = extract_background_image(style)

        listings.append({
            "price": price,
            "url": url,
            "image": image,
        })

    return listings
