# scraper.py
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_DOMAIN = "https://www.inmuebles.smartfinques.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

def scrape_properties():
    propiedades = []
    page = 1

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
                # ---------- LINK A LA FICHA ----------
                link_tag = item.select_one("a.paginacion-ficha-masinfo")
                if not link_tag or not link_tag.get("href"):
                    continue

                ficha_url = urljoin(BASE_DOMAIN, link_tag["href"])

                # ---------- ENTRAMOS EN LA FICHA ----------
                ficha_resp = requests.get(ficha_url, headers=HEADERS, timeout=15)
                ficha_soup = BeautifulSoup(ficha_resp.text, "html.parser")

                # ---------- TÍTULO ----------
                titulo_tag = ficha_soup.select_one("h1")
                titulo = titulo_tag.text.strip() if titulo_tag else None

                # ---------- REFERENCIA ----------
                referencia = None
                for li in ficha_soup.find_all("li"):
                    text = li.get_text(" ", strip=True)
                    if "Referencia" in text:
                        referencia = text.replace("Referencia", "").replace(":", "").strip()
                        break

                # ---------- PRECIO ----------
                precio = None
                for div in ficha_soup.find_all("div"):
                    if "€" in div.get_text():
                        precio = div.get_text(" ", strip=True)
                        break

                # ---------- DESCRIPCIÓN ----------
                descripcion_tag = ficha_soup.select_one(".descripcion")
                descripcion = descripcion_tag.text.strip() if descripcion_tag else None

                propiedades.append({
                    "Referencia": referencia,
                    "Titulo": titulo,
                    "Precio": precio,
                    "Descripcion": descripcion,
                    "URL": ficha_url
                })

                time.sleep(0.3)

            except Exception as e:
                print("❌ Error procesando ficha:", e)

        page += 1

    total = len(propiedades)
    print("===================================")
    print(f"📦 Se han scrapeado {total} inmuebles")
    print("===================================")

    return propiedades
