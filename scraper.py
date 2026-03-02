# scraper.py
from bs4 import BeautifulSoup
import requests
import time

BASE_DOMAIN = "https://www.inmuebles.smartfinques.com"

def scrape_properties():
    base_url = "https://www.inmuebles.smartfinques.com/?pag={}&idio=1#modulo-paginacion"
    propiedades = []
    page = 1

    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    while True:
        url = base_url.format(page)
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, "html.parser")

        items = soup.select("div.paginacion-ficha-bloque1")
        if not items:
            break

        for item in items:
            try:
                # ---------- PRECIO ----------
                precio_tag = item.select_one(".paginacion-ficha-tituloprecio")
                precio = precio_tag.text.strip() if precio_tag else None

                # ---------- LINK A FICHA ----------
                link = None
                for a in item.find_all("a", href=True):
                    if "/ficha/" in a["href"]:
                        link = a["href"].strip()
                        break

                if not link:
                    continue

                full_link = BASE_DOMAIN + link

                # ---------- ENTRAMOS EN LA FICHA ----------
                detail_response = requests.get(full_link, headers=headers, timeout=15)
                detail_soup = BeautifulSoup(detail_response.text, "html.parser")

                # ---------- REFERENCIA (CORREGIDO) ----------
                referencia = None
                for li in detail_soup.find_all("li"):
                    text = li.get_text(" ", strip=True)
                    if "Referencia" in text:
                        referencia = (
                            text.replace("Referencia", "")
                            .replace(":", "")
                            .strip()
                        )
                        break

                # ---------- HABITACIONES ----------
                habitaciones = None
                for li in detail_soup.find_all("li"):
                    if "Habitaciones" in li.get_text():
                        habitaciones = li.get_text(" ", strip=True)
                        break

                # ---------- BAÑOS ----------
                banos = None
                for li in detail_soup.find_all("li"):
                    if "Baños" in li.get_text() or "Banyos" in li.get_text():
                        banos = li.get_text(" ", strip=True)
                        break

                # ---------- SUPERFICIE ----------
                superficie = None
                for li in detail_soup.find_all("li"):
                    if "Superficie" in li.get_text():
                        superficie = li.get_text(" ", strip=True)
                        break

                # ---------- DESCRIPCIÓN ----------
                descripcion_tag = detail_soup.select_one(".descripcion")
                descripcion = descripcion_tag.text.strip() if descripcion_tag else None

                propiedades.append({
                    "Referencia": referencia,
                    "Precio": precio,
                    "Habitaciones": habitaciones,
                    "Baños": banos,
                    "Superficie": superficie,
                    "Link": full_link,
                    "Descripcion": descripcion
                })

                time.sleep(0.3)

            except Exception as e:
                print("❌ Error procesando propiedad:", e)

        print(f"✅ Página {page} completada")
        page += 1

    print(f"🚀 Scraping completado. Total inmuebles: {len(propiedades)}")
    return propiedades
