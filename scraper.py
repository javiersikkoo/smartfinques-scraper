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

def scrape_property(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
    except:
        return None

    soup = BeautifulSoup(r.text, "html.parser")

    titulo = soup.select_one("h1.titulo")
    precio = soup.select_one(".precio")
    descripcion = soup.find("meta", {"name": "description"})

    return {
        "titulo": titulo.get_text(strip=True) if titulo else None,
        "precio": precio.get_text(strip=True) if precio else None,
        "descripcion": descripcion["content"] if descripcion else None,
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
        except Exception as e:
            print("Error:", e)
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
