# Imagen oficial de Playwright con Python 3.11 incluido
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

# Copiamos proyecto
COPY . .

# Instalamos dependencias Python
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Instalamos navegadores (por si acaso)
RUN playwright install --with-deps

CMD ["python", "main.py"]
