import requests
from bs4 import BeautifulSoup
import json
import csv
import time

BASE_URL = "https://www.inmuebles.smartfinques.com"

def normalize_url(url):
    """Convierte rutas relativas en URLs completas"""
    if url.startswith("/"):
        return BASE_URL + url
    elif not url.startswith("http"):
        return BASE_URL + "/" + url
    return url

def scrape_property(url):
    url = normalize_url(url)
    try:
        res = requests.get(url, timeout=10)
        res.raise_for_status()
    except Exception as e:
        print(f"Error scrapeando {url}: {e}")
        return None

    soup = BeautifulSoup(res.text, "html.parser")

    # Extraer datos principales
    referencia = soup.select_one(".fichapropiedad-listadatos li span.valor")
    referencia = referencia.get_text(strip=True) if referencia else None

    habitaciones = soup.select_one(".fichapropiedad-listadatos li span.valor:contains('Habitaciones')")  # fallback
    # intentar otra forma
    hab_tag = soup.find("li", text=lambda t: t and "Habitaciones" in t)
    if hab_tag:
        habitaciones = hab_tag.find_next("span").get_text(strip=True)
    else:
        habitaciones = None

    banos = None
    banos_tag = soup.find("li", text=lambda t: t and "Baños" in t)
    if banos_tag:
        banos = banos_tag.find_next("span").get_text(strip=True)

    precio = soup.select_one(".precio1")
    precio = precio.get_text(strip=True) if precio else None

    superficie_tag = soup.find("span", class_="superficie")
    superficie = superficie_tag.get_text(strip=True) if superficie_tag else None

    foto_tag = soup.find("article", class_="fotosAlVuelo")
    foto = foto_tag.get("cargaFoto") if foto_tag else None

    titulo_tag = soup.select_one("#slider-estrella-tituloprecio h1")
    titulo = titulo_tag.get_text(strip=True) if titulo_tag else None

    descripcion_tag = soup.find("meta", {"name": "description"})
    descripcion = descripcion_tag["content"] if descripcion_tag else None

    return {
        "referencia": referencia,
        "titulo": titulo,
        "descripcion": descripcion,
        "foto": foto,
        "habitaciones": habitaciones,
        "banos": banos,
        "precio": precio,
        "superficie": superficie,
        "url": url
    }

def scrape_properties(pages=1, delay=1):
    all_props = []

    for page in range(1, pages + 1):
        print(f"Scrapeando página {page}...")
        url = f"{BASE_URL}/listado/?page={page}"
        try:
            res = requests.get(url, timeout=10)
            res.raise_for_status()
        except Exception as e:
            print(f"Error scrapeando listado página {page}: {e}")
            continue

        soup = BeautifulSoup(res.text, "html.parser")
        links = []

        # Buscar todas las propiedades
        for a in soup.select("article a"):
            href = a.get("href")
            if href:
                links.append(normalize_url(href))

        print(f"Encontradas {len(links)} propiedades en la página {page}")

        for link in links:
            prop = scrape_property(link)
            if prop:
                all_props.append(prop)
            time.sleep(delay)

    return all_props

def export_properties(properties):
    # JSON
    with open("propiedades.json", "w", encoding="utf-8") as f:
        json.dump(properties, f, ensure_ascii=False, indent=2)

    # CSV
    if properties:
        keys = properties[0].keys()
        with open("propiedades.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            for p in properties:
                writer.writerow(p)
