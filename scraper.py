import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.inmuebles.smartfinques.com/?pag={}&idio=1"

def scrape_properties():
    properties = []
    page_number = 1

    while True:
        print(f"Scrapeando página {page_number}...")
        url = BASE_URL.format(page_number)
        response = requests.get(url)
        
        if response.status_code != 200:
            break

        soup = BeautifulSoup(response.text, "html.parser")

        items = soup.find_all("div", class_="paginacion-ficha-bloque1")

        if not items:
            break

        for item in items:
            try:
                # Precio
                price = item.find("span", class_="paginacion-ficha-tituloprecio")
                price = price.text.strip() if price else ""

                # Imagen (está en atributo cargaFoto)
                image = item.get("cargafoto")

                # Enlace
                link_tag = item.find("a", class_="irAfichaPropiedad")
                link = link_tag["href"] if link_tag else ""
                full_link = "https://www.inmuebles.smartfinques.com/" + link if link else ""

                # Ahora buscamos el bloque 2 para el título
                bloque2 = item.find_next_sibling("div", class_="paginacion-ficha-bloque2")
                title_tag = bloque2.find("h1", class_="titulo") if bloque2 else None
                title = title_tag.text.strip() if title_tag else ""

                properties.append({
                    "title": title,
                    "price": price,
                    "url": full_link,
                    "image": image
                })

            except Exception as e:
                print("Error en propiedad:", e)

        page_number += 1

    print(f"Total inmuebles encontrados: {len(properties)}")
    return properties
