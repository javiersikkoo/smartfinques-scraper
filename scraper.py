# scraper.py

import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

# Archivo donde guardaremos los inmuebles
OUTPUT_FILE = "properties.json"

# Función principal de scraping
def scrape_properties():
    base_url = "https://www.inmuebles.smartfinques.com/"
    params = {
        "pag": 1,
        "idio": 1
    }

    all_properties = []

    while True:
        print(f"Scraping página {params['pag']}...")
        response = requests.get(base_url, params=params)
        if response.status_code != 200:
            print(f"Error accediendo a la página {params['pag']}")
            break

        soup = BeautifulSoup(response.text, "html.parser")
        property_blocks = soup.select(".paginacion-ficha-bloque1")

        if not property_blocks:
            print("No hay más propiedades en esta página.")
            break

        for block in property_blocks:
            try:
                title_tag = block.select_one(".paginacion-ficha-tituloprecio")
                title = title_tag.text.strip() if title_tag else ""

                # Enlace a la ficha completa
                link_tag = block.select_one("a.irAfichaPropiedad")
                link = link_tag['href'] if link_tag else ""

                # Precio
                price = title.replace("Venta", "").replace("€", "").strip()

                # Datos adicionales (habitaciones, baños, superficie)
                data_block = block.find_next_sibling("div", class_="paginacion-ficha-bloque2")
                habitaciones = baños = superficie = None
                if data_block:
                    for li in data_block.select("li.bloque-icono-name-valor1"):
                        label = li.select_one("span").text.strip().lower()
                        value = li.find_all("span")[-1].text.strip()
                        if "habitaciones" in label:
                            habitaciones = value
                        elif "baños" in label or "banyos" in label:
                            baños = value
                        elif "superficie" in label:
                            superficie = value

                property_data = {
                    "title": title,
                    "price": price,
                    "link": link,
                    "habitaciones": habitaciones,
                    "baños": baños,
                    "superficie": superficie,
                    "scraped_at": datetime.utcnow().isoformat()
                }
                all_properties.append(property_data)
            except Exception as e:
                print(f"Error procesando un bloque: {e}")

        # Siguiente página
        params['pag'] += 1

    # Guardar resultados en JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_properties, f, ensure_ascii=False, indent=2)

    print(f"Scraping completado. {len(all_properties)} propiedades guardadas en {OUTPUT_FILE}")
    return all_properties
