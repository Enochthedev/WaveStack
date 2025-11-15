FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers for TikTok
RUN playwright install chromium
RUN playwright install-deps chromium

COPY . .

EXPOSE 8600

RUN mkdir -p /app/uploads /app/temp /app/sessions

CMD ["python", "-m", "src.main"]
