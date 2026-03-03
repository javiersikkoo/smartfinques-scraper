import requests
from bs4 import BeautifulSoup
import json
import csv
import time

BASE_URL = "https://www.inmuebles.smartfinques.com/ficha/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/116.0.0.0 Safari/537.36"
}

def scrape_property(url):
    """Extrae toda la información de una propiedad individual"""
    resp = requests.get(url, headers=HEADERS)
    soup = BeautifulSoup(resp.text, "html.parser")

    # Referencia
    ref = soup.select_one("#fichapropiedad-bloquecaracteristicas .fichapropiedad-listadatos li span.valor")
    referencia = ref.get_text(strip=True) if ref else None

    # Características principales
    datos = {}
    for li in soup.select("#fichapropiedad-bloquecaracteristicas .fichapropiedad-listadatos li"):
        key = li.select_one("span.caracteristica")
        val = li.select_one("span.valor")
        if key and val:
            datos[key.get_text(strip=True).lower()] = val.get_text(strip=True)

    habitaciones = datos.get("habitaciones")
    banos = datos.get("baños") or datos.get("aseos")  # a veces llaman así
    superficie = datos.get("superficie construida") or datos.get("superficie útil")
    precio_tag = soup.select_one("#slider-estrella-tituloprecio .precio1")
    precio = precio_tag.get_text(strip=True) if precio_tag else None

    # Fotos
    fotos = []
    for img in soup.select("img"):
        src = img.get("src")
        if src and "fotos" in src:
            fotos.append(src)
    fotos_str = ", ".join(fotos) if fotos else None

    # Título / descripción
    titulo_tag = soup.select_one("#slider-estrella-tituloprecio .titulo1")
    titulo = titulo_tag.get_text(strip=True) if titulo_tag else None
    descripcion_tag = soup.select_one(".fichapropiedad-descripcion")
    descripcion = descripcion_tag.get_text(strip=True) if descripcion_tag else None

    return {
        "referencia": referencia,
        "precio": precio,
        "habitaciones": habitaciones,
        "banos": banos,
        "superficie": superficie,
        "titulo": titulo,
        "descripcion": descripcion,
        "foto": fotos_str,
        "url": url
    }

def scrape_all_properties(start_url):
    """Scrapea todas las propiedades de la paginación"""
    properties = []
    next_page = start_url
    page_number = 1

    while next_page:
        print(f"Scrapeando página {page_number}...")
        resp = requests.get(next_page, headers=HEADERS)
        soup = BeautifulSoup(resp.text, "html.parser")

        # Extraer URLs de las propiedades desde onclick
        links = []
        for art in soup.select("article.propiedad"):
            onclick = art.get("onclick")
            if onclick and "window.location.href='" in onclick:
                url = onclick.split("window.location.href='")[1].split("'")[0]
                if url.startswith("/"):
                    url = "https://www.inmuebles.smartfinques.com" + url
                links.append(url)

        if not links:
            print("No se encontraron propiedades en esta página.")
            break

        for link in links:
            try:
                prop = scrape_property(link)
                properties.append(prop)
            except Exception as e:
                print(f"Error scrapeando {link}: {e}")
            time.sleep(0.5)  # para no sobrecargar el servidor

        # Paginación
        next_button = soup.select_one("a.next")
        if next_button and next_button.get("href"):
            next_page = "https://www.inmuebles.smartfinques.com" + next_button.get("href")
            page_number += 1
        else:
            next_page = None

    return properties

def export_to_json(properties, filename="propiedades.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(properties, f, ensure_ascii=False, indent=2)

def export_to_csv(properties, filename="propiedades.csv"):
    if not properties:
        return
    keys = properties[0].keys()
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(properties)
