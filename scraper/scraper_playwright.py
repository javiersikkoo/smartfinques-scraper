import json
import time
from playwright.sync_api import sync_playwright

PROPERTIES_FILE = "properties.json"
BASE_URL = "https://www.inmuebles.smartfinques.com/?pag={page}&idio=1#modulo-paginacion"

def scrape_properties():
    all_properties = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        current_page = 1
        while True:
            url = BASE_URL.format(page=current_page)
            print(f"Scrapeando página {current_page}...")
            page.goto(url)
            time.sleep(2)  # esperar que cargue la página
            
            # Seleccionar todos los contenedores de inmuebles
            items = page.query_selector_all("div.card")  # Cambia "div.card" si el selector es otro
            if not items:
                break

            for item in items:
                try:
                    title = item.query_selector("h2").inner_text() if item.query_selector("h2") else ""
                    price = item.query_selector(".precio").inner_text() if item.query_selector(".precio") else ""
                    url_item = item.query_selector("a")["href"] if item.query_selector("a") else ""
                    image = item.query_selector("img")["src"] if item.query_selector("img") else ""
                    
                    all_properties.append({
                        "title": title,
                        "price": price,
                        "url": url_item,
                        "image": image
                    })
                except Exception as e:
                    print("Error en item:", e)
            
            current_page += 1
            # Si ya no hay más items, salir del bucle
            if len(items) == 0:
                break
        
        browser.close()
    
    # Guardar todos los inmuebles en properties.json
    with open(PROPERTIES_FILE, "w", encoding="utf-8") as f:
        json.dump(all_properties, f, ensure_ascii=False, indent=4)
    
    print(f"Total inmuebles encontrados: {len(all_properties)}")
    return all_properties
