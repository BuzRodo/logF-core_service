# syntax=docker/dockerfile:1
#
# Dockerfile de logF-core_service (NestJS 10 + Prisma 7, driver adapter @prisma/adapter-pg).
#
# IMPORTANTE: este Dockerfile NO ejecuta `prisma migrate deploy` en el arranque del
# contenedor. Las migraciones se corren como paso separado (contenedor one-off) desde
# logF-infrastructure/scripts/deploy.sh, ANTES de recrear este servicio. Así evitamos
# condiciones de carrera si en algún momento se escalara a más de una réplica de "core".
#
# NOTA sobre el entrypoint: package.json declara "start:prod": "node dist/main", pero el
# tsconfig.json del proyecto no fija "rootDir", por lo que TypeScript infiere como raíz el
# directorio del proyecto completo (incluye prisma.config.ts en la raíz) y el compilado real
# de `nest build` queda en dist/src/main.js (NO en dist/main.js). Se verificó contra un build
# real existente en el repo. Por eso el CMD de este Dockerfile apunta a dist/src/main.js en
# vez de usar `npm run start:prod`. No se modifica package.json (fuera de alcance de infra).

# ─── Etapa 1: dependencias completas (necesarias para compilar) ────────────────
FROM node:20-alpine AS deps
WORKDIR /app
# openssl: requerido por los motores/algunas libs nativas de Prisma en Alpine (musl)
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci

# ─── Etapa 2: build (prisma generate + nest build) ─────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Genera el client de Prisma (TypeScript, output custom "../generated/prisma") ANTES de
# compilar: `nest build` (tsc) lo compila junto con src/ hacia dist/generated/prisma.
RUN npx prisma generate
RUN npm run build

# ─── Etapa 3: node_modules SOLO de producción (imagen final más chica) ────────
FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── Etapa 4: runtime ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl \
    && addgroup -S logfood \
    && adduser -S logfood -G logfood
WORKDIR /app
ENV NODE_ENV=production

# node_modules de producción (incluye "prisma" y "@prisma/client": están en
# "dependencies" del package.json, no en devDependencies, así que sobreviven al
# --omit=dev y permiten correr `prisma migrate deploy` con esta misma imagen).
COPY --from=prod-deps /app/node_modules ./node_modules

# Artefactos compilados (incluye dist/src/main.js y dist/generated/prisma/*.js)
COPY --from=build /app/dist ./dist

# Necesarios para `prisma migrate deploy` (lo ejecuta deploy.sh como paso separado,
# ver logF-infrastructure/scripts/deploy.sh):
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json

USER logfood
EXPOSE 3000

CMD ["node", "dist/src/main.js"]
