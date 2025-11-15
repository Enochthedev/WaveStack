FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8500

RUN mkdir -p /app/uploads /app/temp /app/credentials

CMD ["python", "-m", "src.main"]
