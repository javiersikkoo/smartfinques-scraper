import requests
from bs4 import BeautifulSoup
import time

BASE_URL = "https://www.inmuebles.smartfinques.com"
LIST_URL = "https://www.inmuebles.smartfinques.com/venta/?pag={}&idio=1"


def normalize(url):
    if url.startswith("http"):
        return url
    return BASE_URL + url


# -----------------------------
# SACAR LINKS DE PROPIEDADES
# -----------------------------
def get_links(page):

    url = LIST_URL.format(page)

    res = requests.get(url, timeout=20)
    soup = BeautifulSoup(res.text, "html.parser")

    links = []

    for a in soup.find_all("a", href=True):

        href = a["href"]

        if "/ficha/" in href:
            links.append(normalize(href))

    links = list(set(links))

    return links


# -----------------------------
# SCRAPEAR FICHA COMPLETA
# -----------------------------
def scrape_property(url):

    try:

        res = requests.get(url, timeout=20)
        soup = BeautifulSoup(res.text, "html.parser")

    except:

        return None

    data = {}

    data["url"] = url

    # -----------------
    # PRECIO
    # -----------------

    precio = soup.find(class_="precio")

    if precio:
        data["precio"] = precio.get_text(strip=True)
    else:
        data["precio"] = None

    # -----------------
    # DESCRIPCION
    # -----------------

    descripcion = soup.find("div", class_="descripcion")

    if descripcion:
        data["descripcion"] = descripcion.get_text(strip=True)
    else:
        data["descripcion"] = None

    # -----------------
    # FOTOS
    # -----------------

    fotos = []

    for img in soup.find_all("img"):

        src = img.get("src")

        if src and "/fotos/" in src:
            fotos.append(normalize(src))

    data["fotos"] = list(set(fotos))

    # -----------------
    # CARACTERISTICAS
    # -----------------

    caracteristicas = {}

    rows = soup.find_all("li")

    for li in rows:

        text = li.get_text(" ", strip=True)

        if "Referencia" in text:

            parts = text.split("Referencia")
            if len(parts) > 1:
                caracteristicas["Referencia"] = parts[1].strip()

        if "Habitaciones" in text:

            caracteristicas["Habitaciones"] = text.replace("Habitaciones", "").strip()

        if "Baños" in text:

            caracteristicas["Baños"] = text.replace("Baños", "").strip()

        if "Superficie" in text:

            caracteristicas["Superficie"] = text.replace("Superficie", "").strip()

        if "Zona / Ciudad" in text:

            caracteristicas["ZonaCiudad"] = text.replace("Zona / Ciudad", "").strip()

    data.update(caracteristicas)

    return data


# -----------------------------
# SCRAPER PRINCIPAL
# -----------------------------
def scrape_properties(max_pages=20):

    all_props = []

    for page in range(1, max_pages + 1):

        print(f"Scrapeando página {page}")

        links = get_links(page)

        if not links:
            break

        print(f"Encontrados {len(links)} inmuebles")

        for link in links:

            prop = scrape_property(link)

            if prop:
                all_props.append(prop)

            time.sleep(0.5)

    print(f"Se han scrapeado {len(all_props)} inmuebles")

    return all_props
