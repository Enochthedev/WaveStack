FROM python:3.12-slim as builder

WORKDIR /app

# Install build dependencies (libatomic1 required by Node.js for prisma generate)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency resolution
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    ln -s /root/.local/bin/uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml ./

# Install python dependencies via uv
RUN uv pip install --system -r pyproject.toml

# Copy application files
COPY . .

# Generate Prisma Client
RUN prisma generate

# --------------------------
FROM python:3.12-slim as runtime

WORKDIR /app

# Install runtime dependencies for Prisma (OpenSSL + libatomic1 required by query engine)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python dependencies and app files from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages/ /usr/local/lib/python3.12/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/
COPY --from=builder /app /app

ENV PORT=3900

EXPOSE 3900

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3900"]
