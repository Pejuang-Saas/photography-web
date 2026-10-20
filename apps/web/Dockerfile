# syntax=docker/dockerfile:1

# Production image for the web app. The build context is this folder (apps/web), so on Dokploy set
# "Build Path" to apps/web. Development uses Dockerfile.dev instead.
#
# Next.js bakes the NEXT_PUBLIC_* values (and S3_PUBLIC_URL, which sets the allowed image hosts)
# into the build, so they are build arguments here: pass them as build-time arguments, and rebuild
# after changing one. Runtime-only settings (API_INTERNAL_URL, REVALIDATE_SECRET) are ordinary
# environment variables.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Public address of this site, e.g. https://kayastory.id
ARG NEXT_PUBLIC_SITE_URL
# Public address of the API, e.g. https://api.kayastory.id (the browser calls it directly)
ARG NEXT_PUBLIC_API_URL
# Optional: where customers' gallery links point; unset means "<WEB_URL>/gallery" from the API
ARG NEXT_PUBLIC_GALLERY_BASE_URL
# Public address of the image bucket, e.g. https://cdn.kayastory.id/photography-assets
ARG S3_PUBLIC_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GALLERY_BASE_URL=$NEXT_PUBLIC_GALLERY_BASE_URL \
    S3_PUBLIC_URL=$S3_PUBLIC_URL

RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs \
 && adduser -S -u 1001 -G nodejs -h /home/nextjs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# The standalone output holds only the files the server needs, with its own node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# 127.0.0.1, not localhost: on Alpine localhost resolves to ::1 first, and the server listens on IPv4.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-3000}/login" || exit 1

CMD ["node", "server.js"]
