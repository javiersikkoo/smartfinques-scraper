from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import time

BASE_URL = "https://www.inmuebles.smartfinques.com"
LISTINGS_URL = BASE_URL + "/venta"


def fetch_listings():
    listings = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = browser.new_page()

        print("Cargando página principal...")
        page.goto(LISTINGS_URL, timeout=60000)
        page.wait_for_load_state("networkidle")

        time.sleep(3)  # damos tiempo extra por si acaso

        html = page.content()
        soup = BeautifulSoup(html, "html.parser")

        cards = soup.select("div.paginacion-ficha-bloque1")

        print(f"Inmuebles encontrados en página 1: {len(cards)}")

        for card in cards:
            price_el = card.select_one(".paginacion-ficha-tituloprecio")
            price = price_el.get_text(strip=True) if price_el else None

            link = card.find("a", href=True)
            url = urljoin(BASE_URL, link["href"]) if link else None

            image = None
            style = card.get("style", "")
            if "background-image" in style:
                start = style.find("url(")
                end = style.find(")", start)
                if start != -1 and end != -1:
                    image = style[start+4:end].replace('"', '').replace("'", "")
                    if not image.startswith("http"):
                        image = urljoin(BASE_URL, image)

            listings.append({
                "price": price,
                "url": url,
                "image": image
            })

        browser.close()

    print(f"Total inmuebles encontrados: {len(listings)}")
    return listings
