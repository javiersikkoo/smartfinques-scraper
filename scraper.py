# scraper.py

import requests
from bs4 import BeautifulSoup
import time
import json

BASE_URL = "https://www.inmuebles.smartfinques.com/venta/?pag={}&idio=1#modulo-paginacion"
BASE_DOMAIN = "https://www.inmuebles.smartfinques.com/"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


def extraer_caracteristicas(detail_soup):
    caracteristicas = {}

    items = detail_soup.select("ul.fichapropiedad-listadatos li")

    for li in items:
        clave = li.select_one(".caracteristica")
        valor = li.select_one(".valor")

        if clave and valor:
            key = clave.text.strip()
            value = valor.text.strip()
            caracteristicas[key] = value

    return caracteristicas


def scrape_properties():
    propiedades = []
    page = 1

    while True:
        print(f"Scrapeando página {page}...")
        url = BASE_URL.format(page)

        response = requests.get(url, headers=HEADERS)
        soup = BeautifulSoup(response.text, "html.parser")

        items = soup.select("a.paginacion-ficha-masinfo")

        if not items:
            break

        for item in items:
            link = item.get("href")
            if not link:
                continue

            full_link = BASE_DOMAIN + link

            try:
                detail_response = requests.get(full_link, headers=HEADERS)
                detail_soup = BeautifulSoup(detail_response.text, "html.parser")

                # 🔥 Título real
                titulo_tag = detail_soup.select_one("h1")
                titulo = titulo_tag.text.strip() if titulo_tag else None

                # 🔥 Precio real
                precio_tag = detail_soup.select_one(".precio")
                precio = precio_tag.text.strip() if precio_tag else None

                # 🔥 Extraemos características reales
                caracteristicas = extraer_caracteristicas(detail_soup)

                referencia = caracteristicas.get("Referencia")
                habitaciones = caracteristicas.get("Habitaciones")
                banos = caracteristicas.get("Baños")

                superficie = (
                    caracteristicas.get("Superficie Construida")
                    or caracteristicas.get("Superficie Útil")
                )

                # 🔥 Descripción
                descripcion_tag = detail_soup.select_one(".fichapropiedad-descripcion")
                descripcion = descripcion_tag.text.strip() if descripcion_tag else None

                # 🔥 Foto principal (si existe)
                foto_tag = detail_soup.select_one(".imagenesComoBackground")
                foto = foto_tag.get("cargaFoto") if foto_tag else None

                propiedades.append({
                    "referencia": referencia,
                    "titulo": titulo,
                    "precio": precio,
                    "habitaciones": habitaciones,
                    "banos": banos,
                    "superficie": superficie,
                    "descripcion": descripcion,
                    "foto": foto,
                    "url": full_link
                })

                time.sleep(0.3)

            except Exception as e:
                print("Error procesando propiedad:", e)

        page += 1

    print(f"✅ Se han scrapeado {len(propiedades)} inmuebles")

    # Guardamos cache
    with open("cache.json", "w", encoding="utf-8") as f:
        json.dump({"data": propiedades}, f, ensure_ascii=False)

    return propiedades
