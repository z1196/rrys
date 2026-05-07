#!/bin/sh

# 宿主机挂载进来的 /opt/rrys 是空的 → 自动初始化 app.js
if [ ! -f /opt/rrys/app.js ]; then
  echo "Initializing app.js..."
  cp /opt/rrys-template/app.js /opt/rrys/app.js
fi

cd /opt/rrys
exec "$@"
