# Usamos la imagen oficial de Playwright que ya tiene navegadores y dependencias
FROM mcr.microsoft.com/playwright:focal

# Directorio de trabajo
WORKDIR /app

# Copiamos todo el proyecto
COPY . .

# Actualizamos pip
RUN pip install --upgrade pip

# Instalamos dependencias Python
RUN pip install -r requirements.txt

# Instalamos los navegadores de Playwright
RUN playwright install

# No exponemos ningún puerto porque será Background Worker
# EXPOSE 8000  # No hace falta

# Comando por defecto para ejecutar el scraping
CMD ["python", "main.py"]
