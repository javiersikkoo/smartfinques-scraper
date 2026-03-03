# scraper.py
import requests
from bs4 import BeautifulSoup
import json
import time

BASE_URL = "https://www.inmuebles.smartfinques.com"

def scrape_property(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Título
    titulo_tag = soup.select_one(".fichapropiedad-titulo h1")
    titulo = titulo_tag.text.strip() if titulo_tag else None

    # Precio
    precio_tag = soup.select_one(".precio1")
    precio = precio_tag.text.strip() if precio_tag else None

    # Foto principal y fotos del slider
    fotos = []
    slider_tags = soup.select(".imagenesComoBackground")
    for tag in slider_tags:
        foto_url = tag.get("cargaFoto")
        if foto_url:
            fotos.append(foto_url)
    foto_principal = fotos[0] if fotos else None

    # Habitaciones y baños
    hab_tag = soup.select_one(".habitaciones")
    habitaciones = hab_tag.text.strip() if hab_tag else None
    banos_tag = soup.select_one(".banyos")
    banos = banos_tag.text.strip() if banos_tag else None

    # Superficie
    superficie_tag = soup.select_one(".superficie")
    superficie = superficie_tag.text.strip() if superficie_tag else None

    # Descripción
    desc_tag = soup.select_one(".fichapropiedad-descripcion")
    descripcion = desc_tag.get_text(strip=True) if desc_tag else None

    # Referencia
    referencia = None
    li_tags = soup.select("#fichapropiedad-bloquecaracteristicas li")
    for li in li_tags:
        span_carac = li.select_one("span.caracteristica")
        span_val = li.select_one("span.valor")
        if span_carac and span_carac.text.strip() == "Referencia" and span_val:
            referencia = span_val.text.strip()
            break

    # Características / calidades
    calidades = []
    calidad_tags = soup.select(".fichapropiedad-listacalidades .bloqueCalidadPropiedad .etiqueta")
    for tag in calidad_tags:
        calidades.append(tag.text.strip())

    return {
        "titulo": titulo,
        "precio": precio,
        "foto_principal": foto_principal,
        "fotos_slider": fotos,
        "habitaciones": habitaciones,
        "banos": banos,
        "superficie": superficie,
        "descripcion": descripcion,
        "referencia": referencia,
        "calidades": calidades,
        "url": url
    }

def scrape_listado_page(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, "html.parser")
    urls = []
    for a in soup.select(".ficha a"):  # enlaces a propiedades
        href = a.get("href")
        if href and href.startswith("/ficha"):
            full_url = BASE_URL + href
            urls.append(full_url)
    return list(set(urls))

def get_total_pages(listado_url):
    response = requests.get(listado_url)
    soup = BeautifulSoup(response.text, "html.parser")
    pagination = soup.select(".pagination li a")
    max_page = 1
    for p in pagination:
        try:
            num = int(p.text)
            if num > max_page:
                max_page = num
        except:
            continue
    return max_page

def scrape_all_properties(listado_url):
    total_pages = get_total_pages(listado_url)
    print(f"Total páginas detectadas: {total_pages}")
    all_data = []

    for page in range(1, total_pages + 1):
        print(f"Scrapeando página {page}/{total_pages}")
        page_url = f"{listado_url}?page={page}"
        urls = scrape_listado_page(page_url)
        for i, url in enumerate(urls):
            print(f"  Propiedad {i+1}/{len(urls)}: {url}")
            try:
                data = scrape_property(url)
                all_data.append(data)
                time.sleep(1)
            except Exception as e:
                print(f"    Error en {url}: {e}")
    return all_data

def export_to_json(data, filename="propiedades_completo.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    listado_url = f"{BASE_URL}/listado-de-propiedades/"  # pon aquí tu URL de listado
    data = scrape_all_properties(listado_url)
    export_to_json(data)
    print("✅ Scrapeo COMPLETO terminado, archivo propiedades_completo.json creado")
