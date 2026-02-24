import requests
from bs4 import BeautifulSoup
import re


def fetch_property_detail(url):

    response = requests.get(
        url,
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=15
    )

    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Título
    title_el = soup.select_one("h1")
    title = title_el.get_text(strip=True) if title_el else None

    # Descripción
    desc_el = soup.select_one(".descripcion, .descripcionPropiedad, .textoDescripcion")
    description = desc_el.get_text(strip=True) if desc_el else None

    # Características (habitaciones, baños, metros)
    features = soup.get_text()

    bedrooms = None
    bathrooms = None
    meters = None

    match_bed = re.search(r"(\d+)\s*hab", features, re.IGNORECASE)
    if match_bed:
        bedrooms = int(match_bed.group(1))

    match_bath = re.search(r"(\d+)\s*ba", features, re.IGNORECASE)
    if match_bath:
        bathrooms = int(match_bath.group(1))

    match_m2 = re.search(r"(\d+)\s*m2", features, re.IGNORECASE)
    if match_m2:
        meters = int(match_m2.group(1))

    # Galería de imágenes
    images = []
    for img in soup.find_all("img"):
        src = img.get("src")
        if src and "fotos" in src:
            images.append(src)

    return {
        "title": title,
        "description": description,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "meters": meters,
        "images": images
    }
