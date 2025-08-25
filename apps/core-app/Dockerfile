# -------- deps (install with dev deps) --------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm i --prod=false

# -------- build (generate + compile TS) --------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable \
 && pnpm prisma generate \
 && pnpm tsc \
 && pnpm tsc-alias

# -------- proddeps (prune dev deps ONLY) --------
FROM node:20-alpine AS proddeps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# bring node_modules WITH generated client from build
COPY --from=build /app/node_modules ./node_modules
RUN corepack enable \
 && pnpm prune --prod \
 && pnpm store prune

# -------- runtime --------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]