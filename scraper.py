# scraper.py
import requests
import time
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_DOMAIN = "https://www.inmuebles.smartfinques.com"
HEADERS = {"User-Agent": "Mozilla/5.0"}

def scrape_properties(max_pages=20):
    properties = []
    page = 1

    while page <= max_pages:
        url = f"{BASE_DOMAIN}/venta/?pag={page}&idio=1"
        print(f"Scrapeando página {page} → {url}")

        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print("No más páginas")
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("div.paginacion-ficha-datos")

        if not cards:
            print("Listado vacío, fin")
            break

        for card in cards:
            link = card.select_one("a.paginacion-ficha-masinfo")
            if not link:
                continue

            ficha_url = urljoin(BASE_DOMAIN, link["href"])
            prop = scrape_property(ficha_url)
            if prop:
                properties.append(prop)

            time.sleep(0.3)

        page += 1

    print(f"✔ Se han scrapeado {len(properties)} propiedades")
    return properties


def scrape_property(url):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"Error en ficha {url}: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    titulo = soup.select_one("h1")
    titulo = titulo.get_text(strip=True) if titulo else None

    precio = None
    precio_tag = soup.select_one(".precio, .precioVenta")
    if precio_tag:
        precio = precio_tag.get_text(strip=True)

    descripcion = soup.select_one(".descripcion")
    descripcion = descripcion.get_text(strip=True) if descripcion else None

    habitaciones = banos = superficie = None
    for li in soup.select("li"):
        text = li.get_text(" ", strip=True)
        if "Habitaciones" in text:
            habitaciones = text.replace("Habitaciones", "").strip()
        if "Baños" in text:
            banos = text.replace("Baños", "").strip()
        if "Superficie" in text:
            superficie = text.replace("Superficie", "").strip()

    fotos = []
    for img in soup.select(".galeria img, .swiper img"):
        src = img.get("src")
        if src and "nofotos" not in src:
            fotos.append(urljoin(BASE_DOMAIN, src))

    return {
        "titulo": titulo,
        "precio": precio,
        "habitaciones": habitaciones,
        "banos": banos,
        "superficie": superficie,
        "descripcion": descripcion,
        "url": url,
        "fotos": "|".join(fotos)
    }
