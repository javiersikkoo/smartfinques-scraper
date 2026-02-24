import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re
import time

BASE_URL = "https://www.inmuebles.smartfinques.com"
LISTINGS_URL = BASE_URL + "/venta"


def extract_background_image(style):
    if not style:
        return None

    match = re.search(r"url\(['\"]?(.*?)['\"]?\)", style)
    if match:
        img_url = match.group(1)

        if not img_url.startswith("http"):
            img_url = urljoin(BASE_URL, img_url)

        return img_url

    return None


def fetch_listings():

    page = 1
    all_listings = []

    while True:

        if page == 1:
            url = LISTINGS_URL
        else:
            url = f"{LISTINGS_URL}/{page}"

        print(f"Scrapeando página {page}...")

        response = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=15
        )

        if response.status_code != 200:
            break

        soup = BeautifulSoup(response.text, "html.parser")

        cards = soup.select("div.paginacion-ficha-bloque1")

        # Si no hay inmuebles → fin de paginación
        if not cards:
            break

        for card in cards:

            price_el = card.select_one(".paginacion-ficha-tituloprecio")
            price = price_el.get_text(strip=True) if price_el else None

            url_property = None
            for a in card.find_all("a", href=True):
                if "/ficha/" in a["href"]:
                    url_property = urljoin(BASE_URL, a["href"])
                    break

            style = card.get("style", "")
            image = extract_background_image(style)

            all_listings.append({
                "price": price,
                "url": url_property,
                "image": image,
            })

        page += 1
        time.sleep(1)  # pequeña pausa para no saturar

    return all_listings
