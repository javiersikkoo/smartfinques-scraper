# Imagen base con todas las dependencias de Playwright incluidas
FROM mcr.microsoft.com/playwright:focal

WORKDIR /app

# Copiamos todo el proyecto
COPY . .

# Actualizamos pip e instalamos dependencias Python
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Instalamos navegadores de Playwright (ya están en la imagen, pero asegura)
RUN playwright install

# Render necesita CMD para arrancar algo en un puerto
CMD ["python", "main.py"]
