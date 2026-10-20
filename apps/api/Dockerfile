# syntax=docker/dockerfile:1

# Production image for the API and its worker. The build context is this folder (apps/api), so on
# Dokploy set "Build Path" to apps/api. Development uses Dockerfile.dev instead.
#
# Two build targets share everything but the command they start:
#   (default)         the HTTP API, which also applies database migrations when it starts
#   --target worker   the queue worker (emails, WhatsApp, gallery sync, booking expiry)
# On Dokploy, deploy two applications from this folder and set "Build Stage" on the second to `worker`.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# All dependencies, for compiling.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN npx prisma generate && npm run build

# Only what runs in production, plus the Prisma CLI: migrations are applied when the container
# starts, so the CLI ships with the image at exactly the version the lock file pins. The client is
# generated here, once, so nothing is generated (or written) when the container runs.
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
RUN npm install --omit=dev --no-save --no-audit --no-fund \
    "prisma@$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version")"
COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000

RUN addgroup -S -g 1001 nestjs \
 && adduser -S -u 1001 -G nestjs -h /home/nestjs nestjs

COPY --from=prod-deps --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --chown=nestjs:nestjs prisma ./prisma
COPY --chown=nestjs:nestjs assets ./assets
COPY --chown=nestjs:nestjs package.json docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

USER nestjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]

# The worker has no HTTP port, so it has no healthcheck and never runs migrations.
FROM runner AS worker
ENV RUN_DB_MIGRATIONS=false
HEALTHCHECK NONE
CMD ["node", "dist/worker.js"]

# Last stage, so a plain `docker build` produces the API. 127.0.0.1, not localhost: on Alpine
# localhost resolves to ::1 first, and the server listens on IPv4 only.
FROM runner AS api
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-3000}/ready" || exit 1
CMD ["node", "dist/main.js"]
