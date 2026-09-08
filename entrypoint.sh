#!/bin/bash

set -e

echo "[entrypoint] 启动容器..."

# 创建持久化目录
mkdir -p /app/data
mkdir -p /app/logs
mkdir -p /app/backend/uploads

# -----------------------------
# 兼容旧版本数据库
# -----------------------------
# 老版本可能把数据库放在：
# /app/backend/database.sqlite
#
# 新版本统一放到：
# /app/data/database.sqlite
#
# 仅当旧数据库存在、且新数据库不存在时迁移，
# 防止覆盖已有数据库。
if [ -f "/app/backend/database.sqlite" ] && \
   [ ! -f "/app/data/database.sqlite" ]; then

  echo "[entrypoint] 发现旧版数据库，迁移到 /app/data/database.sqlite..."

  mv /app/backend/database.sqlite /app/data/database.sqlite

  echo "[entrypoint] 数据库迁移完成"
fi

echo "[entrypoint] Node 版本: $(node --version)"
echo "[entrypoint] 工作目录: /app"
echo "[entrypoint] 数据库路径: ${DB_PATH:-/app/data/database.sqlite}"

# -----------------------------
# 启动服务
# -----------------------------

cd /app

echo "[entrypoint] 启动服务..."

exec node backend/server.js
