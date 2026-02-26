import requests
from bs4 import BeautifulSoup
import time

BASE_URL = "https://www.inmuebles.smartfinques.com/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
}

def scrape_properties():
    all_properties = []
    page = 1

    while True:
        print(f"🔎 Scraping página {page}...")
        url = f"{BASE_URL}?pag={page}&idio=1#modulo-paginacion"
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200:
            print(f"❌ Error al acceder a la página {page}: {response.status_code}")
            break

        soup = BeautifulSoup(response.text, "html.parser")
        property_blocks = soup.find_all("div", class_="paginacion-ficha-bloque1")

        if not property_blocks:
            print("🚫 No hay más propiedades. Fin del scraping.")
            break

        for block in property_blocks:
            try:
                title = block.find("span", class_="paginacion-ficha-tituloprecio").get_text(strip=True)
                link_tag = block.find("a", class_="irAfichaPropiedad")
                link = link_tag["href"] if link_tag else None

                more_data_block = block.find_next_sibling("div", class_="paginacion-ficha-bloque2")
                details = {}
                if more_data_block:
                    lis = more_data_block.select("ul > li.bloque-icono-name-valor1")
                    for li in lis:
                        label = li.find("span").get_text(strip=True)
                        value = li.find_all("span")[1].get_text(strip=True)
                        details[label] = value

                all_properties.append({
                    "title": title,
                    "link": link,
                    "details": details
                })
            except Exception as e:
                print(f"⚠️ Error parseando un inmueble: {e}")
                continue

        page += 1
        time.sleep(1)  # evita sobrecargar la web

    print(f"✅ Scraping completado: {len(all_properties)} inmuebles encontrados.")
    return all_properties
