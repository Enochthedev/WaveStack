FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Generate Prisma client
RUN prisma generate --schema=schema.prisma

# Expose port
EXPOSE 8200

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8200"]
