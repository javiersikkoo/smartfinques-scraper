# Python 3.11 slim
FROM python:3.11-slim

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Carpeta de trabajo
WORKDIR /app

# Instalamos librerías necesarias para Playwright / Chromium
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    ca-certificates \
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

# Copiamos proyecto
COPY . .

# Pip y dependencias Python
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Playwright + Chromium
RUN playwright install chromium

# Comando principal
CMD ["python", "main.py"]
