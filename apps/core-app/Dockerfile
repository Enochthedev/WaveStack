FROM node:20-alpine
WORKDIR /app
COPY package.json ./
# COPY prisma ./prisma/
RUN corepack enable && pnpm i
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node","dist/server.js"]
