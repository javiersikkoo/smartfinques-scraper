# main.py
import json
from scraper import scrape_properties

# Función para enviar a Base44
def send_to_base44(properties):
    print("🚀 Enviando datos a Base44...")
    for prop in properties:
        # Nos aseguramos de que todas las claves existen
        prop_base44 = {
            "Referencia": prop.get("Referencia", ""),
            "Precio": prop.get("Precio", ""),
            "Habitaciones": prop.get("Habitaciones", ""),
            "Baños": prop.get("Baños", ""),
            "Superficie": prop.get("Superficie", ""),
            "Link": prop.get("Link", ""),
            "Descripcion": prop.get("Descripcion", "")
        }
        print("🚀 Enviando a Base44:", prop_base44)
        # Aquí iría el código real para enviar a Base44
        # Por ahora solo hacemos print para prueba

# Iniciamos scraping
print("🚀 Iniciando scraping...")
properties = scrape_properties()
print(f"✅ Scraping completado. Total inmuebles: {len(properties)}")

# Guardamos en JSON local para revisar
with open("properties.json", "w", encoding="utf-8") as f:
    json.dump(properties, f, ensure_ascii=False, indent=4)
print("✅ Datos guardados en properties.json")

# Validamos que haya propiedades antes de enviar
if properties:
    send_to_base44(properties)
else:
    print("⚠️ No se encontraron propiedades para enviar a Base44")
