from playwright.sync_api import sync_playwright, Error as PlaywrightError
import sys
import traceback

# Importa tu scraper si lo tienes en otro archivo
# from scraper.playwright_scraper import scrape_all_properties

def run_scraping():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Aquí va tu lógica de scraping
            page.goto("https://www.inmuebles.smartfinques.com/")
            
            # Ejemplo: tomar título de la página
            title = page.title()
            print(f"Título de la página: {title}")

            # Si tienes función scrape_all_properties()
            # properties = scrape_all_properties(page)
            # print(f"Total inmuebles encontrados: {len(properties)}")
            
            browser.close()

    except PlaywrightError as e:
        print("❌ Error de Playwright:", e)
        traceback.print_exc()
    except Exception as e:
        print("❌ Error general:", e)
        traceback.print_exc()


if __name__ == "__main__":
    run_scraping()
