import requests
from bs4 import BeautifulSoup
import time

BASE_URL = "https://www.inmuebles.smartfinques.com"
LIST_URL = "https://www.inmuebles.smartfinques.com/venta/?pag={}&idio=1#modulo-paginacion"


def normalize(url):
    if url.startswith("http"):
        return url
    return BASE_URL + "/" + url


def get_property_links(page):

    url = LIST_URL.format(page)

    res = requests.get(url, timeout=20)
    soup = BeautifulSoup(res.text, "html.parser")

    links = []

    for a in soup.select(".paginacion-ficha-masinfo"):
        href = a.get("href")
        if href:
            links.append(normalize(href))

    return links


def scrape_property(url):

    try:
        res = requests.get(url, timeout=20)
        soup = BeautifulSoup(res.text, "html.parser")
    except:
        return None

    data = {}

    data["url"] = url

    # titulo
    titulo = soup.select_one(".titulo")
    data["titulo"] = titulo.get_text(strip=True) if titulo else None

    # precio
    precio = soup.select_one(".precio")
    data["precio"] = precio.get_text(strip=True) if precio else None

    # referencia
    ref = soup.find(text=lambda t: t and "Referencia" in t)
    if ref:
        data["referencia"] = ref.find_next().get_text(strip=True)
    else:
        data["referencia"] = None

    # descripcion
    desc = soup.select_one(".descripcion")
    data["descripcion"] = desc.get_text(strip=True) if desc else None

    # habitaciones
    hab = soup.find(text=lambda t: t and "Habitaciones" in t)
    data["habitaciones"] = hab.find_next().text if hab else None

    # baños
    ban = soup.find(text=lambda t: t and "Baños" in t)
    data["banos"] = ban.find_next().text if ban else None

    # superficie
    sup = soup.find(text=lambda t: t and "Superficie" in t)
    data["superficie"] = sup.find_next().text if sup else None

    # ciudad
    ciudad = soup.find(text=lambda t: t and "Zona / Ciudad" in t)
    data["ciudad"] = ciudad.find_next().text if ciudad else None

    # fotos
    fotos = []

    for img in soup.select(".swiper-slide img"):
        src = img.get("src")
        if src and "nofoto" not in src:
            fotos.append(normalize(src))

    data["fotos"] = fotos

    return data


def scrape_properties(max_pages=20):

    all_properties = []

    for page in range(1, max_pages + 1):

        print(f"Scrapeando página {page}...")

        links = get_property_links(page)

        if not links:
            break

        print(f"Encontrados {len(links)} inmuebles")

        for link in links:

            prop = scrape_property(link)

            if prop:
                all_properties.append(prop)

            time.sleep(0.5)

    print(f"Se han scrapeado {len(all_properties)} inmuebles")

    return all_properties
