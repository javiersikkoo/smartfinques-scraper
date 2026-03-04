import requests
from bs4 import BeautifulSoup
import time

BASE_URL = "https://www.inmuebles.smartfinques.com"
LIST_URL = "https://www.inmuebles.smartfinques.com/venta/"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

def normalize_url(url):
    if url.startswith("http"):
        return url
    return BASE_URL + "/" + url.lstrip("/")

def extract_features(soup):
    data = {}
    ul = soup.select_one("ul.fichapropiedad-listadatos")

    if not ul:
        return data

    for li in ul.find_all("li"):
        spans = li.find_all("span")
        if len(spans) >= 2:
            key = spans[0].get_text(strip=True).lower()
            value = spans[1].get_text(strip=True)
            data[key] = value

    return data

def scrape_property(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
    except:
        return None

    soup = BeautifulSoup(r.text, "html.parser")

    titulo_tag = soup.select_one("#slider-estrella-tituloprecio")
    precio_tag = soup.select_one(".precio1")
    descripcion_tag = soup.find("meta", {"name": "description"})

    features = extract_features(soup)

    return {
        "referencia": features.get("referencia"),
        "titulo": titulo_tag.get_text(strip=True) if titulo_tag else None,
        "precio": precio_tag.get_text(strip=True) if precio_tag else None,
        "habitaciones": features.get("habitaciones"),
        "baños": features.get("baños"),
        "superficie": features.get("superficie construida"),
        "descripcion": descripcion_tag["content"] if descripcion_tag else None,
        "url": url
    }

def scrape_properties(pages=1, delay=1):
    results = []

    for page in range(1, pages + 1):
        url = f"{LIST_URL}?pag={page}&idio=1"
        print(f"📄 Scrapeando página {page}")

        try:
            r = requests.get(url, headers=HEADERS, timeout=10)
            r.raise_for_status()
        except:
            continue

        soup = BeautifulSoup(r.text, "html.parser")

        for a in soup.select("a.paginacion-ficha-masinfo"):
            href = a.get("href")
            if not href:
                continue

            prop = scrape_property(normalize_url(href))
            if prop:
                results.append(prop)

            time.sleep(delay)

    return results
