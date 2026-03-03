# scraper.py
import requests
from bs4 import BeautifulSoup
import json
import time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
}

def scrape_property(url):
    """Scrapea los datos completos de una propiedad individual"""
    res = requests.get(url, headers=HEADERS)
    soup = BeautifulSoup(res.text, "html.parser")

    # Referencia
    referencia_tag = soup.select_one("#fichapropiedad-bloquecaracteristicas .fichapropiedad-listadatos li span.valor")
    referencia = referencia_tag.text.strip() if referencia_tag else None

    # Precio
    precio_tag = soup.select_one(".precio1")
    precio = precio_tag.text.strip() if precio_tag else None

    # Habitaciones
    hab_tag = soup.select_one("#fichapropiedad-bloquecaracteristicas li:contains('Habitaciones') span.valor")
    habitaciones = hab_tag.text.strip() if hab_tag else None

    # Baños
    banos_tag = soup.select_one("#fichapropiedad-bloquecaracteristicas li:contains('Baños') span.valor")
    banos = banos_tag.text.strip() if banos_tag else None

    # Superficie
    sup_tag = soup.select_one("#fichapropiedad-bloquecaracteristicas li:contains('Superficie Construida') span.valor")
    superficie = sup_tag.text.strip() if sup_tag else None

    # Título
    titulo_tag = soup.select_one("h1.titulo1")
    titulo = titulo_tag.text.strip() if titulo_tag else "Encontramos la casa de tus sueños"

    # Descripción
    desc_tag = soup.select_one(".fichapropiedad-listado-texto")
    descripcion = desc_tag.text.strip() if desc_tag else None

    # Fotos
    fotos = []
    foto_tags = soup.select(".fichapropiedad-listado-fotos img")
    for f in foto_tags:
        src = f.get("src")
        if src:
            fotos.append(src)

    # Calidades / extras
    calidades = []
    cal_tag = soup.select(".bloqueCalidadPropiedad .etiqueta")
    for c in cal_tag:
        calidades.append(c.text.strip())

    return {
        "referencia": referencia,
        "precio": precio,
        "habitaciones": habitaciones,
        "banos": banos,
        "superficie": superficie,
        "titulo": titulo,
        "descripcion": descripcion,
        "fotos": fotos,
        "calidades": calidades,
        "url": url
    }


def scrape_all_properties(listado_url, delay=1):
    """Scrapea todas las propiedades de la web con paginación"""
    propiedades = []
    page = 1
    while True:
        url = f"{listado_url}?page={page}"
        res = requests.get(url, headers=HEADERS)
        soup = BeautifulSoup(res.text, "html.parser")

        # Detecta las propiedades en la página
        links = soup.select(".fichapropiedad-listado a[href*='/ficha/']")
        if not links:
            break

        print(f"Scrapeando página {page}, propiedades detectadas: {len(links)}")
        for a in links:
            prop_url = a.get("href")
            if prop_url and prop_url.startswith("/"):
                prop_url = "https://www.inmuebles.smartfinques.com" + prop_url
            try:
                prop_data = scrape_property(prop_url)
                propiedades.append(prop_data)
                time.sleep(delay)
            except Exception as e:
                print(f"Error scrapeando {prop_url}: {e}")

        # Detecta si hay siguiente página
        next_page_tag = soup.select_one("a.flecha2-next")
        if not next_page_tag:
            break

        page += 1

    return propiedades


def export_to_json(data, filename="propiedades.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
