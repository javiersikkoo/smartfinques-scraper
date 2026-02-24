# Usamos la imagen oficial de Playwright con Ubuntu + navegadores + Python 3.11
FROM mcr.microsoft.com/playwright:focal

# Configuramos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de tu proyecto al contenedor
COPY . .

# Actualizamos pip
RUN pip install --upgrade pip

# Instalamos dependencias Python desde requirements.txt
RUN pip install -r requirements.txt

# Instalamos navegadores de Playwright (Chromium, Firefox, WebKit)
# Esto asegura que los navegadores estén listos
RUN playwright install

# Exponemos el puerto que usarás si tu app tiene web (cambia si no es necesario)
EXPOSE 8000

# Comando por defecto al iniciar el contenedor
CMD ["python", "main.py"]
