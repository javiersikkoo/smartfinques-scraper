import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.inmuebles.smartfinques.com/?pag={}&idio=1#modulo-paginacion"

def scrape_properties():
    properties = []
    page = 1

    while True:
        url = BASE_URL.format(page)
        r = requests.get(url)
        if r.status_code != 200:
            break

        soup = BeautifulSoup(r.text, "html.parser")
        items = soup.select(".paginacion-ficha-bloque1")
        if not items:
            break

        for item in items:
            titulo = item.select_one(".paginacion-ficha-tituloprecio")
            precio = titulo.get_text(strip=True) if titulo else None

            link_tag = item.select_one("a.irAfichaPropiedad")
            link = link_tag["href"] if link_tag else None

            detalle = item.select_one(".paginacion-ficha-bloque2")
            habitaciones = detalle.select_one(".habitaciones")
            baños = detalle.select_one(".banyos")
            superficie = detalle.select_one(".superficie")

            properties.append({
                "titulo": titulo.get_text(strip=True) if titulo else None,
                "precio": precio,
                "link": link,
                "habitaciones": habitaciones.get_text(strip=True) if habitaciones else None,
                "baños": baños.get_text(strip=True) if baños else None,
                "superficie": superficie.get_text(strip=True) if superficie else None
            })

        page += 1

    return properties
