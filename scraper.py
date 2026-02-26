import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.inmuebles.smartfinques.com/"

def scrape_properties():
    properties = []
    page = 1
    while True:
        url = f"{BASE_URL}?pag={page}&idio=1#modulo-paginacion"
        response = requests.get(url)
        if response.status_code != 200:
            break

        soup = BeautifulSoup(response.text, "html.parser")
        items = soup.select("div.paginacion-ficha-bloque1")
        if not items:
            break

        for item in items:
            title_tag = item.select_one("span.paginacion-ficha-tituloprecio")
            title = title_tag.text.strip() if title_tag else "N/A"

            link_tag = item.select_one("a.irAfichaPropiedad")
            link = BASE_URL.rstrip("/") + link_tag["href"] if link_tag else None

            more_data = item.find_next_sibling("div", class_="paginacion-ficha-bloque2")
            if more_data:
                ref_tag = more_data.select_one("li:contains('Referencia') span")
                ref = ref_tag.text.strip() if ref_tag else None

                baths_tag = more_data.select_one("li:contains('Baños') span")
                baths = baths_tag.text.strip() if baths_tag else None

                area_tag = more_data.select_one("li:contains('Superficie') span")
                area = area_tag.text.strip() if area_tag else None
            else:
                ref = baths = area = None

            properties.append({
                "title": title,
                "reference": ref,
                "baths": baths,
                "area": area,
                "link": link
            })

        page += 1

    return properties
