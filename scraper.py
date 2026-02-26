# scraper.py
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re
import json

BASE_URL = "https://www.inmuebles.smartfinques.com/?pag=1&idio=1#modulo-paginacion"
OUTPUT_FILE = "properties.json"

def parse_price(text):
    """Convierte 'Venta 195.000 €' en número 195000"""
    if not text:
        return None
    numbers = re.findall(r'\d+', text.replace('.', ''))
    return int(''.join(numbers)) if numbers else None

def parse_surface(text):
    """Convierte '193 m2' o '99 mts' en número 193 / 99"""
    if not text:
        return None
    numbers = re.findall(r'\d+', text)
    return int(numbers[0]) if numbers else None

def scrape_properties():
    properties = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(BASE_URL, timeout=60000)
        page.wait_for_selector(".paginacion-ficha-bloque1", timeout=60000)
        content = page.content()
        browser.close()

    soup = BeautifulSoup(content, "html.parser")
    cards = soup.select(".paginacion-ficha-bloque1")

    for card in cards:
        try:
            url_tag = card.find("a", class_="irAfichaPropiedad")
            url = url_tag["href"] if url_tag else None

            title_tag = card.select_one(".paginacion-ficha-tituloprecio")
            price_text = title_tag.get_text(strip=True) if title_tag else None
            price = parse_price(price_text)

            # Datos extra
            parent = card.find_next_sibling(class_="paginacion-ficha-bloque2")
            reference = None
            bathrooms = None
            bedrooms = None
            surface = None
            city = None
            zone = None

            if parent:
                # Referencia
                ref_tag = parent.select_one("li .ref")
                reference = ref_tag.get_text(strip=True) if ref_tag else None

                # Baños
                bath_tag = parent.select_one("li .banyos")
                bathrooms = int(bath_tag.get_text(strip=True)) if bath_tag else None

                # Habitaciones
                bed_tag = parent.select_one("li .habitaciones")
                bedrooms = int(bed_tag.get_text(strip=True)) if bed_tag else None

                # Superficie
                surface_tag = parent.select_one("li .superficie")
                surface = parse_surface(surface_tag.get_text(strip=True)) if surface_tag else None

                # Ciudad y zona desde h1 titulo
                h1_tag = parent.select_one("h1.titulo")
                if h1_tag:
                    h1_text = h1_tag.get_text(strip=True)
                    # Ejemplo: "Local comercial en Barbera del Valles situado en la zona de Cas antic, Superficie Construida 193m2, 2 Baños."
                    city_match = re.search(r'en ([^,]+) situado', h1_text)
                    zone_match = re.search(r'zona de ([^,]+),', h1_text)
                    city = city_match.group(1) if city_match else None
                    zone = zone_match.group(1) if zone_match else None

            # Imagen
            image_tag = card.get("cargaFoto")
            image = image_tag if image_tag else None

            # Generamos ID único
            id_unique = f"{reference}-{re.sub(r'[^0-9]', '', url) if url else ''}"

            properties.append({
                "id": id_unique,
                "title": title_tag.get_text(strip=True) if title_tag else None,
                "price_text": price_text,
                "price": price,
                "reference": reference,
                "bathrooms": bathrooms,
                "bedrooms": bedrooms,
                "surface": surface,
                "city": city,
                "zone": zone,
                "url": url,
                "image": image
            })

        except Exception as e:
            print(f"Error procesando tarjeta: {e}")
            continue

    # Guardamos en JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(properties, f, ensure_ascii=False, indent=2)

    return properties

if __name__ == "__main__":
    props = scrape_properties()
    print(f"Scrape completado. Total inmuebles: {len(props)}")
