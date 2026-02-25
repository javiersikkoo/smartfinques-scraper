# scraper/scraper_playwright.py
import json
import traceback
from playwright.sync_api import sync_playwright

def scrape_properties():
    """
    Scrapea los inmuebles de SmartFinques automáticamente
    y guarda todos los resultados en properties.json
    """
    print("🚀 Iniciando scraping...")

    all_properties = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            page = browser.new_page()

            # URL base con el parámetro de página
            base_url = "https://www.inmuebles.smartfinques.com/?utm_source=chatgpt.com&idio=1&pag={}"

            # Iteramos sobre las páginas (ajusta rango según número de páginas reales)
            for page_num in range(1, 50):
                url = base_url.format(page_num)
                print(f"🌍 Visitando: {url}")

                page.goto(url, timeout=60000)
                page.wait_for_timeout(5000)  # espera que cargue JS

                # Seleccionamos todos los bloques de inmuebles
                blocks = page.query_selector_all("div.modulo-listado div.modulo-contenido")
                print(f"📄 Inmuebles encontrados en página {page_num}: {len(blocks)}")

                if not blocks:
                    print("⚠️ No hay más inmuebles, saliendo del loop")
                    break

                for b in blocks:
                    try:
                        title_el = b.query_selector("h2") or b.query_selector("h3")
                        price_el = b.query_selector(".precio")
                        link_el = b.query_selector("a")
                        image_el = b.query_selector("img")

                        item = {
                            "title": title_el.inner_text().strip() if title_el else "",
                            "price": price_el.inner_text().strip() if price_el else "",
                            "url": link_el.get_attribute("href") if link_el else "",
                            "image": image_el.get_attribute("src") if image_el else "",
                        }

                        all_properties.append(item)
                    except Exception as e_inner:
                        print("❌ Error parseando bloque:", e_inner)
                        continue

            browser.close()

        # Guardamos todos los inmuebles en JSON
        with open("properties.json", "w", encoding="utf-8") as f:
            json.dump(all_properties, f, ensure_ascii=False, indent=4)

        print(f"✅ Scraping completado, total inmuebles: {len(all_properties)}")

    except Exception as e:
        print("❌ Error scraping:", e)
        traceback.print_exc()
