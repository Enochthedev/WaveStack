FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy Prisma schema (kept in sync with ai-personality-py/schema.prisma)
COPY schema.prisma ./schema.prisma

# Generate Prisma client
RUN prisma generate --schema=schema.prisma

# Copy application code
COPY src/ ./src/

# Run the application
CMD ["python", "-u", "src/autoposter.py"]
