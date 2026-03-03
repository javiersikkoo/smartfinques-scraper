# scraper.py

import requests
from bs4 import BeautifulSoup
import time
import json

BASE_URL = "https://www.inmuebles.smartfinques.com/venta/?pag={}&idio=1#modulo-paginacion"

def scrape_properties():
    propiedades = []
    page = 1

    while True:
        print(f"Scrapeando página {page}...")
        url = BASE_URL.format(page)
        response = requests.get(url)
        soup = BeautifulSoup(response.text, "html.parser")

        # 🔥 SOLO enlaces reales de propiedades
        items = soup.select("a.paginacion-ficha-masinfo")

        if not items:
            break

        for item in items:
            link = item.get("href")

            if not link:
                continue

            full_link = "https://www.inmuebles.smartfinques.com/" + link

            try:
                detail_response = requests.get(full_link)
                detail_soup = BeautifulSoup(detail_response.text, "html.parser")

                # 🔥 TÍTULO REAL
                titulo_tag = detail_soup.select_one(".titulo1")
                titulo = titulo_tag.text.strip() if titulo_tag else None

                # 🔥 PRECIO REAL
                precio_tag = detail_soup.select_one(".precio1")
                precio = precio_tag.text.strip() if precio_tag else None

                # 🔥 REFERENCIA
                ref_tag = detail_soup.select_one(".ref")
                referencia = ref_tag.text.strip() if ref_tag else None

                # 🔥 HABITACIONES
                habitaciones_tag = detail_soup.select_one(".habitaciones")
                habitaciones = habitaciones_tag.text.strip() if habitaciones_tag else None

                # 🔥 BAÑOS
                banos_tag = detail_soup.select_one(".banyos")
                banos = banos_tag.text.strip() if banos_tag else None

                # 🔥 SUPERFICIE
                superficie_tag = detail_soup.select_one(".superficie")
                superficie = superficie_tag.text.strip() if superficie_tag else None

                # 🔥 DESCRIPCIÓN
                descripcion_tag = detail_soup.select_one(".descripcion")
                descripcion = descripcion_tag.text.strip() if descripcion_tag else None

                # 🔥 FOTO PRINCIPAL
                foto_tag = detail_soup.select_one(".propiedad")
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
                print("Error:", e)

        page += 1

    print(f"✅ Se han scrapeado {len(propiedades)} inmuebles")

    # Guardar cache
    with open("cache.json", "w", encoding="utf-8") as f:
        json.dump({"data": propiedades}, f, ensure_ascii=False)

    return propiedades


def export_to_csv(data):
    import csv

    keys = data[0].keys() if data else []

    with open("properties.csv", "w", newline="", encoding="utf-8") as output_file:
        dict_writer = csv.DictWriter(output_file, fieldnames=keys)
        dict_writer.writeheader()
        dict_writer.writerows(data)
