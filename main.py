import os
import json
import time
import threading
import traceback
from flask import Flask, jsonify
from playwright.sync_api import sync_playwright

app = Flask(__name__)

DATA_FILE = "properties.json"
SCRAPE_INTERVAL = 60 * 60 * 6  # 6 horas


def scrape_properties():
    print("🚀 Iniciando scraping...")
    properties = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page_number = 1

            while True:
                url = f"https://www.inmuebles.smartfinques.com/?page={page_number}"
                print(f"Scrapeando página {page_number}")
                page.goto(url, timeout=60000)

                cards = page.query_selector_all(".property-card")  # ⚠️ AJUSTAR SELECTOR

                if not cards:
                    break

                for card in cards:
                    try:
                        price = card.query_selector(".price")
                        link = card.query_selector("a")

                        properties.append({
                            "price": price.inner_text().strip() if price else None,
                            "url": link.get_attribute("href") if link else None
                        })
                    except:
                        continue

                page_number += 1

            browser.close()

        # 🔥 Esto crea el JSON automáticamente
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(properties, f, indent=2, ensure_ascii=False)

        print(f"✅ Scraping completado: {len(properties)} inmuebles")

    except Exception as e:
        print("❌ Error scraping:", e)
        traceback.print_exc()


def scheduler():
    while True:
        scrape_properties()
        print("⏳ Esperando 6 horas para siguiente scraping...")
        time.sleep(SCRAPE_INTERVAL)


@app.route("/")
def home():
    return "SmartFinques Scraper activo"


@app.route("/properties")
def get_properties():
    if not os.path.exists(DATA_FILE):
        return jsonify({"error": "Aún no hay datos scrapeados"}), 404

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    return jsonify(data)


if __name__ == "__main__":
    threading.Thread(target=scheduler, daemon=True).start()

    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
