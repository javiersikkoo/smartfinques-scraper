# scraper.py
from bs4 import BeautifulSoup
import requests

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
            # Si no hay más propiedades, terminamos
            break

        for item in items:
            try:
                referencia = item.select_one(".bloque-icono-name-valor1 .ref")
                referencia = referencia.text.strip() if referencia else None

                precio = item.select_one(".paginacion-ficha-tituloprecio")
                precio = precio.text.strip() if precio else None

                habitaciones = item.select_one(".habitaciones")
                habitaciones = habitaciones.text.strip() if habitaciones else None

                banos = item.select_one(".banyos")
                banos = banos.text.strip() if banos else None

                superficie = item.select_one(".superficie")
                superficie = superficie.text.strip() if superficie else None

                link = item.select_one("a.irAfichaPropiedad")
                link = link["href"].strip() if link else None

                descripcion = item.select_one(".paginacion-ficha-datos .titulo")
                descripcion = descripcion.text.strip() if descripcion else None

                propiedades.append({
                    "Referencia": referencia,
                    "Precio": precio,
                    "Habitaciones": habitaciones,
                    "Baños": banos,
                    "Superficie": superficie,
                    "Link": link,
                    "Descripcion": descripcion
                })
            except Exception as e:
                print("Error procesando propiedad:", e)

        print(f"✅ Página {page} procesada, propiedades encontradas: {len(items)}")
        page += 1

    print(f"🚀 Scraping completado. Total inmuebles: {len(propiedades)}")
    return propiedades
