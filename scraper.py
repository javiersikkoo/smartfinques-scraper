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
        url = f"https://www.inmuebles.smartfinques.com/venta/?pag={page}&idio=1"
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

                titulo = ficha.select_one("h1")
                titulo = titulo.text.strip() if titulo else None

                precio = None
                for div in ficha.find_all("div"):
                    if "€" in div.get_text():
                        precio = div.get_text(strip=True)
                        break

                descripcion = ficha.select_one(".descripcion")
                descripcion = descripcion.text.strip() if descripcion else None

                fotos = [
                    urljoin(BASE_DOMAIN, img["src"])
                    for img in ficha.select("img")
                    if img.get("src") and "nofotos" not in img["src"]
                ]

                texto = ficha.get_text(" ", strip=True)
                habitaciones = next((w for w in texto.split() if "habit" in w.lower()), None)
                banos = next((w for w in texto.split() if "bañ" in w.lower()), None)
                superficie = next((w for w in texto.split() if "m²" in w.lower()), None)

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
    with open("properties.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
