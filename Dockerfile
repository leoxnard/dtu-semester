# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/ may be empty, and git does not track empty directories, so it can be
# missing from a fresh clone entirely. The COPY in the runner stage is not
# optional, so make sure the directory exists either way.
RUN mkdir -p public
# The build refreshes DTU building coordinates from OpenStreetMap. If Overpass
# is unreachable it falls back to the committed data/buildings.json snapshot,
# so a build never fails because a volunteer-run API is busy.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# Parsed calendars and course statistics are cached here. Mount a volume so the
# cache survives restarts; without one it simply refills on first request.
ENV CACHE_DIR=/data/cache

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 \
 && mkdir -p /data/cache && chown -R nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
