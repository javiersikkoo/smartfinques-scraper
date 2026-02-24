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

        if not cards:
            break

        # Buscar TODOS los enlaces /ficha/ de la página
        property_links = []
        for a in soup.find_all("a", href=True):
            if "/ficha/" in a["href"]:
                full_url = urljoin(BASE_URL, a["href"])
                if full_url not in property_links:
                    property_links.append(full_url)

        # Emparejar cards con enlaces
        for index, card in enumerate(cards):

            price_el = card.select_one(".paginacion-ficha-tituloprecio")
            price = price_el.get_text(strip=True) if price_el else None

            style = card.get("style", "")
            image = extract_background_image(style)

            url_property = property_links[index] if index < len(property_links) else None

            all_listings.append({
                "price": price,
                "url": url_property,
                "image": image,
            })

        page += 1
        time.sleep(1)

    return all_listings
