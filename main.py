# main.py
from scraper import scrape_properties
import json
import csv

def export(properties):
    with open("propiedades.json", "w", encoding="utf-8") as f:
        json.dump(properties, f, ensure_ascii=False, indent=2)

    if properties:
        with open("propiedades.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=properties[0].keys())
            writer.writeheader()
            writer.writerows(properties)

if __name__ == "__main__":
    props = scrape_properties(max_pages=20)
    export(props)
