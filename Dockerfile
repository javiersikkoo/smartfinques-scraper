# Usamos Python 3.11 slim
FROM python:3.11-slim

# Evitamos que Python cree pyc y buffers
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos del proyecto
COPY . .

# Actualizamos pip y instalamos dependencias
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Instalamos Playwright y Chromium
RUN playwright install chromium

# Comando que ejecuta tu scraper/app
CMD ["python", "main.py"]
