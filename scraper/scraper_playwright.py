from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import time

BASE_URL = "https://www.inmuebles.smartfinques.com/"

def scrape_all_properties():
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(BASE_URL)
        time.sleep(2)  # esperar que cargue JS

        while True:
            html = page.content()
            soup = BeautifulSoup(html, "html.parser")
            property_cards = soup.select(".property-card, .listing-item")  # ajustar según clase real

            for card in property_cards:
                try:
                    url_tag = card.select_one("a")
                    url = url_tag["href"] if url_tag else None
                    price_tag = card.select_one(".price")
                    price = price_tag.get_text(strip=True) if price_tag else None
                    img_tag = card.select_one("img")
                    img = img_tag["src"] if img_tag else None
                    zone_tag = card.select_one(".zone, .area")
                    zone = zone_tag.get_text(strip=True) if zone_tag else None

                    results.append({
                        "url": url,
                        "price": price,
                        "image": img,
                        "zone": zone
                    })
                except Exception as e:
                    print(f"Error leyendo propiedad: {e}")

            next_button = page.query_selector("a.next, button.next")
            if next_button and next_button.is_enabled():
                next_button.click()
                time.sleep(2)
            else:
                break

        browser.close()
    return results
