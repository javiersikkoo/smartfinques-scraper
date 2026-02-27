# scraper.py
from bs4 import BeautifulSoup
import requests
import time

BASE_DOMAIN = "https://www.inmuebles.smartfinques.com/"

def scrape_properties():
    base_url = "https://www.inmuebles.smartfinques.com/?pag={}&idio=1#modulo-paginacion"
    propiedades = []
    page = 1

    while True:
        url = base_url.format(page)
        response = requests.get(url)
        soup = BeautifulSoup(response.text, "html.parser")

        items = soup.select("div.paginacion-ficha-bloque1")
        if not items:
            break

        for item in items:
            try:
                precio_tag = item.select_one(".paginacion-ficha-tituloprecio")
                precio = precio_tag.text.strip() if precio_tag else None

                link_tag = item.select_one("a.irAfichaPropiedad")
                link = link_tag["href"].strip() if link_tag else None

                # Si no hay link, saltamos
                if not link:
                    continue

                full_link = BASE_DOMAIN + link

                # ---- ENTRAMOS EN LA FICHA ----
                detail_response = requests.get(full_link)
                detail_soup = BeautifulSoup(detail_response.text, "html.parser")

                referencia_tag = detail_soup.select_one(".ref")
                referencia = referencia_tag.text.strip() if referencia_tag else None

                habitaciones_tag = detail_soup.select_one(".habitaciones")
                habitaciones = habitaciones_tag.text.strip() if habitaciones_tag else None

                banos_tag = detail_soup.select_one(".banyos")
                banos = banos_tag.text.strip() if banos_tag else None

                superficie_tag = detail_soup.select_one(".superficie")
                superficie = superficie_tag.text.strip() if superficie_tag else None

                descripcion_tag = detail_soup.select_one(".descripcion")
                descripcion = descripcion_tag.text.strip() if descripcion_tag else None

                propiedades.append({
                    "Referencia": referencia,
                    "Precio": precio,
                    "Habitaciones": habitaciones,
                    "Baños": banos,
                    "Superficie": superficie,
                    "Link": full_link,
                    "Descripcion": descripcion
                })

                time.sleep(0.3)  # pequeña pausa para no saturar

            except Exception as e:
                print("Error procesando propiedad:", e)

        print(f"✅ Página {page} completada")
        page += 1

    print(f"🚀 Scraping completado. Total inmuebles: {len(propiedades)}")
    return propiedades
