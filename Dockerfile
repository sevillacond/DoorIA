# Multi-stage Dockerfile para Enlace-DoorIA Core
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci

# Copia código-fonte e compila frontend e backend
COPY . .
RUN npm run build

# Imagem de produção enxuta
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Utilitários de rede para healthcheck Docker
RUN apk add --no-cache curl wget

COPY package*.json ./
RUN npm ci --only=production

# Copia build compilado do Vite (dist/) e server.cjs compilado
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/init.sql ./src/db/init.sql
COPY --from=builder /app/src/db/migrations ./src/db/migrations

EXPOSE 3000

CMD ["npm", "start"]
