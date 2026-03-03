# scraper.py
import requests
import time
import json
import csv
import os
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from datetime import datetime, timedelta

BASE_DOMAIN = "https://www.inmuebles.smartfinques.com"
CACHE_FILE = "cache.json"
CACHE_HOURS = 6

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

def cache_is_valid():
    if not os.path.exists(CACHE_FILE):
        return False
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        cache = json.load(f)
    timestamp = datetime.fromisoformat(cache["timestamp"])
    return datetime.now() - timestamp < timedelta(hours=CACHE_HOURS)

def load_cache():
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)["data"]

def save_cache(data):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "data": data
        }, f, ensure_ascii=False, indent=2)

def scrape_properties():
    if cache_is_valid():
        print("🧠 Usando cache")
        return load_cache()

    propiedades = []
    page = 1

    while True:
        url = f"{BASE_DOMAIN}/venta/?pag={page}&idio=1"
        resp = requests.get(url, headers=HEADERS, timeout=15)

        if resp.status_code != 200:
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        items = soup.select("div.paginacion-ficha-datos")

        if not items:
            break

        print(f"🔎 Página {page}: {len(items)} inmuebles")

        for item in items:
            try:
                link_tag = item.select_one("a.paginacion-ficha-masinfo")
                if not link_tag:
                    continue

                ficha_url = urljoin(BASE_DOMAIN, link_tag["href"])
                ficha_resp = requests.get(ficha_url, headers=HEADERS, timeout=15)
                ficha = BeautifulSoup(ficha_resp.text, "html.parser")

                # -------- TÍTULO --------
                titulo_tag = ficha.select_one("h1")
                titulo = titulo_tag.text.strip() if titulo_tag else None

                # -------- PRECIO --------
                precio = None
                precio_tag = ficha.select_one(".precio, .price, .precioVenta")
                if precio_tag:
                    precio = precio_tag.text.strip()

                # -------- CARACTERÍSTICAS --------
                habitaciones = banos = superficie = None
                for li in ficha.select("li"):
                    text = li.get_text(" ", strip=True)
                    if "Habitaciones" in text:
                        habitaciones = text.replace("Habitaciones", "").strip()
                    if "Baños" in text:
                        banos = text.replace("Baños", "").strip()
                    if "Superficie" in text:
                        superficie = text.replace("Superficie", "").strip()

                # -------- DESCRIPCIÓN --------
                descripcion_tag = ficha.select_one(".descripcion")
                descripcion = descripcion_tag.text.strip() if descripcion_tag else None

                # -------- FOTOS (SOLO GALERÍA) --------
                fotos = []
                for img in ficha.select(".galeria img, .swiper img"):
                    src = img.get("src")
                    if src and "nofotos" not in src:
                        fotos.append(urljoin(BASE_DOMAIN, src))

                propiedades.append({
                    "titulo": titulo,
                    "precio": precio,
                    "habitaciones": habitaciones,
                    "banos": banos,
                    "superficie": superficie,
                    "descripcion": descripcion,
                    "url": ficha_url,
                    "fotos": "|".join(fotos)
                })

                time.sleep(0.3)

            except Exception as e:
                print("❌ Error:", e)

        page += 1

    save_cache(propiedades)
    print(f"📦 Se han scrapeado {len(propiedades)} inmuebles")
    return propiedades

def export_to_csv(data):
    if not data:
        return
    with open("properties.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
