# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Builder — install deps and produce static assets (Vite → dist/)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

# Baked into the client bundle at build time (same idea as SPRING_PROFILES_ACTIVE).
# Rebuild with: docker build --build-arg VITE_APP_ENV=qa .
ARG VITE_APP_ENV=staging
ENV VITE_APP_ENV=${VITE_APP_ENV}

RUN npm run build \
  && test -f dist/index.html || (echo "No index.html in dist/" && exit 1)

# -----------------------------------------------------------------------------
# Runtime — nginx serves the built SPA on port 8080
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine

RUN apk add --no-cache curl

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist/ .

COPY nginx.spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
