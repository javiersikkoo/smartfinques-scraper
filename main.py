from flask import Flask
import threading
from playwright.sync_api import sync_playwright, Error as PlaywrightError
import os, traceback

app = Flask(__name__)

def run_scraping():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("https://www.inmuebles.smartfinques.com/")
            print("Página cargada correctamente:", page.title())
            browser.close()
    except PlaywrightError as e:
        print("❌ Error de Playwright:", e)
        traceback.print_exc()
    except Exception as e:
        print("❌ Error general:", e)
        traceback.print_exc()

@app.route("/")
def home():
    return "SmartFinques Scraper corriendo!"

if __name__ == "__main__":
    # Ejecutar scraping en hilo aparte
    threading.Thread(target=run_scraping, daemon=True).start()

    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
