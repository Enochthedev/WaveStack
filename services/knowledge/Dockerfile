FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency resolution
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Copy dependency files
COPY pyproject.toml ./

# Install python dependencies via uv
RUN /root/.cargo/bin/uv pip install --system -r pyproject.toml

# Copy application files
COPY . .

# Generate Prisma Client
RUN prisma generate

# --------------------------
FROM python:3.11-slim as runtime

WORKDIR /app

# Install runtime dependencies for Prisma (OpenSSL is required)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python dependencies and app files from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/
COPY --from=builder /app /app

ENV PORT=3400

EXPOSE 3400

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3400"]
