#!/bin/sh

# 如果宿主机挂载进来的 /app 没有 app.js → 自动初始化
if [ ! -f /app/app.js ]; then
  echo "Initializing app.js..."
  cp /app-template/app.js /app/app.js
fi

cd /app
exec "$@"
