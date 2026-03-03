# scraper.py
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_DOMAIN = "https://www.inmuebles.smartfinques.com"
HEADERS = {"User-Agent": "Mozilla/5.0"}

def scrape_properties():
    propiedades = []
    page = 1

    print("🚀 Iniciando scraping de Smartfinques")

    while True:
        url = f"https://www.inmuebles.smartfinques.com/venta/?pag={page}&idio=1"
        response = requests.get(url, headers=HEADERS, timeout=15)

        if response.status_code != 200:
            break

        soup = BeautifulSoup(response.text, "html.parser")
        items = soup.select("div.paginacion-ficha-datos")

        if not items:
            break

        print(f"🔎 Página {page} → {len(items)} inmuebles")

        for item in items:
            try:
                link_tag = item.select_one("a.paginacion-ficha-masinfo")
                if not link_tag:
                    continue

                ficha_url = urljoin(BASE_DOMAIN, link_tag["href"])
                ficha_resp = requests.get(ficha_url, headers=HEADERS, timeout=15)
                ficha = BeautifulSoup(ficha_resp.text, "html.parser")

                # Título
                titulo = ficha.select_one("h1").get_text(strip=True)

                # Campos básicos
                referencia = habitaciones = banos = superficie = None

                for li in ficha.find_all("li"):
                    text = li.get_text(" ", strip=True)
                    if "Referencia" in text:
                        referencia = text.split(":")[-1].strip()
                    elif "Habitaciones" in text:
                        habitaciones = text
                    elif "Baños" in text or "Banyos" in text:
                        banos = text
                    elif "Superficie" in text:
                        superficie = text

                # Precio
                precio = None
                for div in ficha.find_all("div"):
                    if "€" in div.get_text():
                        precio = div.get_text(" ", strip=True)
                        break

                # Descripción
                descripcion_tag = ficha.select_one(".descripcion")
                descripcion = descripcion_tag.get_text(strip=True) if descripcion_tag else None

                # Fotos
                fotos = []
                for img in ficha.select("img"):
                    src = img.get("src")
                    if src and "uploads" in src:
                        fotos.append(urljoin(BASE_DOMAIN, src))

                propiedades.append({
                    "referencia": referencia,
                    "titulo": titulo,
                    "precio_texto": precio,
                    "habitaciones": habitaciones,
                    "banos": banos,
                    "superficie": superficie,
                    "descripcion": descripcion,
                    "fotos": fotos,
                    "url": ficha_url
                })

                time.sleep(0.3)

            except Exception as e:
                print("❌ Error en ficha:", e)

        page += 1

    print("===================================")
    print(f"📦 Se han scrapeado {len(propiedades)} inmuebles")
    print("===================================")

    return propiedades
