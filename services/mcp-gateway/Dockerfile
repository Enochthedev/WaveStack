FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/
RUN pnpm install --no-frozen-lockfile
RUN pnpm prisma generate

COPY . .
RUN pnpm build

# ── Production stage ──
FROM node:20-alpine

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/
RUN pnpm install --prod --no-frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4100

CMD ["pnpm", "start"]
