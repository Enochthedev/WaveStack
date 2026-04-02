# -------- deps (install with dev deps) --------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm i --prod=false

# -------- build (generate + compile TS) --------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable \
 && pnpm prisma generate \
 && pnpm tsc \
 && pnpm tsc-alias

# -------- proddeps (prune dev deps ONLY) --------
FROM node:22-alpine AS proddeps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# bring node_modules WITH generated client from build
COPY --from=build /app/node_modules ./node_modules
RUN corepack enable \
 && pnpm prune --prod \
 && pnpm store prune

# -------- runtime --------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY package.json ./
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/server.js"]