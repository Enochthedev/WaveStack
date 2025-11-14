FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build TypeScript
RUN pnpm build

# Expose API port
EXPOSE 8100

# Start service
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
