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

# Copy Prisma schema from AI personality service
COPY ../ai-personality-py/schema.prisma ./schema.prisma

# Generate Prisma client
RUN prisma generate --schema=schema.prisma

# Copy application code
COPY src/ ./src/

# Run the application
CMD ["python", "-u", "src/autoposter.py"]
