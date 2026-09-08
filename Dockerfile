# ==============================
# 前端构建
# ==============================

FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ ./

RUN npm run build


# ==============================
# Production
# ==============================

FROM node:22-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    curl \
    bash

ENV NODE_ENV=production
ENV DB_PATH=/app/data/database.sqlite

# ------------------------------
# Backend
# ------------------------------

WORKDIR /app/backend

COPY backend/package.json ./
COPY backend/package-lock.json ./

RUN npm ci --omit=dev \
    --registry=https://registry.npmjs.org

COPY backend/ /app/backend/


# ------------------------------
# Frontend
# ------------------------------

COPY --from=frontend-builder \
    /build/frontend/dist \
    /app/frontend/dist


# ------------------------------
# Entrypoint
# ------------------------------

COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && mkdir -p \
       /app/data \
       /app/logs \
       /app/backend/uploads

WORKDIR /app

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
