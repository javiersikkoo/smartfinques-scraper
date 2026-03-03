# scraper.py

import requests
from bs4 import BeautifulSoup
import time
import json
import re

BASE_URL = "https://www.inmuebles.smartfinques.com/venta/?pag={}&idio=1#modulo-paginacion"
BASE_DOMAIN = "https://www.inmuebles.smartfinques.com/"

def extraer_dato_por_texto(soup, texto_label):
    elementos = soup.find_all("li", class_="bloque-icono-name-valor1")
    for el in elementos:
        if texto_label.lower() in el.text.lower():
            valor = el.find_all("span")[-1].text.strip()
            return valor
    return None


def scrape_properties():
    propiedades = []
    page = 1

    while True:
        print(f"Scrapeando página {page}...")
        url = BASE_URL.format(page)
        response = requests.get(url)
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
                detail_response = requests.get(full_link)
                detail_soup = BeautifulSoup(detail_response.text, "html.parser")

                # 🔥 TÍTULO REAL (no el del slider)
                titulo_tag = detail_soup.select_one("h1")
                titulo = titulo_tag.text.strip() if titulo_tag else None

                # 🔥 PRECIO REAL (buscamos el que esté fuera del slider)
                precio_tag = detail_soup.find("span", string=re.compile("€"))
                precio = precio_tag.text.strip() if precio_tag else None

                # 🔥 DATOS REALES POR TEXTO
                referencia = extraer_dato_por_texto(detail_soup, "Referencia")
                habitaciones = extraer_dato_por_texto(detail_soup, "Habitaciones")
                banos = extraer_dato_por_texto(detail_soup, "Baños")
                superficie = extraer_dato_por_texto(detail_soup, "Superficie")

                # 🔥 DESCRIPCIÓN
                descripcion_tag = detail_soup.find("div", class_="descripcion")
                descripcion = descripcion_tag.text.strip() if descripcion_tag else None

                # 🔥 FOTO REAL (no slider)
                foto_tag = detail_soup.find("img", {"itemprop": "image"})
                foto = foto_tag["src"] if foto_tag else None

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
