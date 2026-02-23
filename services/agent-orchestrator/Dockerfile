FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Generate Prisma Client
RUN prisma generate

EXPOSE 3300

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3300"]
