# Dockerfile corregido para Render con Playwright

FROM python:3.11-slim

# Evitar pyc y buffers
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar librerías necesarias + herramientas básicas
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-transport-https \
    gnupg \
    ca-certificates \
    wget \
    curl \
    fonts-liberation \
    libatk-1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libasound2 \
    libatspi2.0-0 \
    libdbus-1-3 \
    libexpat1 \
    libxkbcommon0 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copiar proyecto
COPY . .

# Instalar pip y librerías Python
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Instalar Playwright y Chromium
RUN playwright install chromium

# Comando por defecto
CMD ["python", "main.py"]
