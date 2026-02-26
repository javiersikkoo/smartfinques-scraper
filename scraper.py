# scraper.py
import requests
from bs4 import BeautifulSoup
import json

BASE_URL = "https://www.inmuebles.smartfinques.com/?pag={}&idio=1"
OUTPUT_FILE = "properties.json"

def scrape_properties():
    properties = []
    page = 1

    while True:
        url = BASE_URL.format(page)
        print(f"Scraping página {page} -> {url}")
        response = requests.get(url)
        if response.status_code != 200:
            print(f"No se pudo obtener la página {page}, status: {response.status_code}")
            break

        soup = BeautifulSoup(response.text, "html.parser")
        detalles = soup.select(".paginacion-ficha-bloque2")  # Selector del contenedor de cada inmueble

        if not detalles:
            print("No se encontraron más inmuebles.")
            break

        for detalle in detalles:
            # Nombre / título
            titulo_tag = detalle.select_one(".titulo, .titulo1")
            titulo = titulo_tag.text.strip() if titulo_tag else None

            # Precio
            precio_tag = detalle.select_one(".paginacion-ficha-tituloprecio, .precio1")
            precio = precio_tag.text.strip() if precio_tag else None

            # Referencia
            ref_tag = detalle.select_one(".ref")
            referencia = ref_tag.text.strip() if ref_tag else None

            # Habitaciones
            habitaciones_tag = detalle.select_one(".habitaciones")
            habitaciones = habitaciones_tag.text.strip() if habitaciones_tag else None

            # Baños
            banos_tag = detalle.select_one(".banyos, .bano")
            banos = banos_tag.text.strip() if banos_tag else None

            # Superficie
            superficie_tag = detalle.select_one(".superficie")
            superficie = superficie_tag.text.strip() if superficie_tag else None

            # URL de la ficha
            url_tag = detalle.select_one("a.irAfichaPropiedad, a.paginacion-ficha-masinfo")
            url_ficha = url_tag["href"] if url_tag and url_tag.has_attr("href") else None

            # Imagen
            imagen_tag = detalle.select_one(".imagenesComoBackground")
            imagen_url = imagen_tag.get("cargaFoto") if imagen_tag and imagen_tag.has_attr("cargaFoto") else None

            properties.append({
                "titulo": titulo,
                "precio": precio,
                "referencia": referencia,
                "habitaciones": habitaciones,
                "banos": banos,
                "superficie": superficie,
                "url_ficha": url_ficha,
                "imagen": imagen_url
            })

        page += 1

    # Guardamos en JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(properties, f, ensure_ascii=False, indent=2)

    print(f"Scraping completado. Total inmuebles: {len(properties)}")
    return properties

if __name__ == "__main__":
    scrape_properties()
