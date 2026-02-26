# scraper.py
from bs4 import BeautifulSoup
import requests

def scrape_properties():
    # URL de la página 1 (puedes iterar para más páginas si quieres)
    url = "https://www.inmuebles.smartfinques.com/?pag=1&idio=1#modulo-paginacion"
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")

    propiedades = []

    # Iteramos sobre cada bloque de propiedad
    for item in soup.select("div.paginacion-ficha-bloque1"):
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

    print(f"✅ {len(propiedades)} inmuebles encontrados.")
    return propiedades
