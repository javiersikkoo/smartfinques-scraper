import requests
from scraper import scrape_properties

# Configuración de Base44
BASE44_API_URL = "https://api.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
BASE44_API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

def send_to_base44(properties):
    headers = {
        "Authorization": f"Bearer {BASE44_API_KEY}",
        "Content-Type": "application/json"
    }

    for prop in properties:
        data = {
            "fields": {
                "Titulo": prop["titulo"],
                "Precio": prop["precio"],
                "Link": prop["link"],
                "Habitaciones": prop["habitaciones"],
                "Baños": prop["baños"],
                "Superficie": prop["superficie"]
            }
        }
        response = requests.post(BASE44_API_URL, headers=headers, json=data)
        if response.status_code not in [200, 201]:
            print(f"Error enviando inmueble {prop['titulo']}: {response.text}")

if __name__ == "__main__":
    print("🚀 Iniciando scraping...")
    properties = scrape_properties()
    print(f"✅ {len(properties)} inmuebles encontrados.")

    print("🚀 Enviando datos a Base44...")
    send_to_base44(properties)
    print("✅ Datos enviados a Base44 correctamente.")
