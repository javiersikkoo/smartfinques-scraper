# main.py
import json
from scraper import scrape_properties

# --- Función para guardar en JSON ---
def save_to_json(properties, filename="properties.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(properties, f, ensure_ascii=False, indent=4)
    print(f"✅ Datos guardados en {filename}")

# --- Función para enviar a Base44 ---
def send_to_base44(properties):
    # Aquí pondrías tu lógica de conexión con Base44
    # Por ahora lo dejamos en print para testear
    for prop in properties:
        data = {
            "Referencia": prop.get("referencia", ""),
            "Precio": prop.get("precio", ""),
            "Habitaciones": prop.get("habitaciones", ""),
            "Baños": prop.get("banos", ""),
            "Superficie": prop.get("superficie", ""),
            "Link": prop.get("link", ""),  # No dará error aunque falte
            "Descripcion": prop.get("descripcion", ""),
        }
        print("🚀 Enviando a Base44:", data)

# --- Main ---
if __name__ == "__main__":
    print("🚀 Iniciando scraping...")
    properties = scrape_properties()  # Llama a tu scraper

    if not properties:
        print("⚠️ No se encontraron inmuebles.")
    else:
        print(f"✅ Scraping completado. Total inmuebles: {len(properties)}")

        # Guardamos en JSON
        save_to_json(properties)

        # Enviamos a Base44
        print("🚀 Enviando datos a Base44...")
        send_to_base44(properties)
        print("✅ Datos enviados.")
