#!/bin/sh

# 自动初始化 app.js（如果宿主机没有）
if [ ! -f /app/app.js ]; then
  echo "Initializing app.js..."
  cp /app-template/app.js /app/app.js
fi

cd /app
exec "$@"
