FROM python:3.12-slim

WORKDIR /app

# libatomic1 is required by Node.js, which Prisma invokes during `prisma generate`
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Generate Prisma Client
RUN prisma generate

EXPOSE 3300

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3300"]
