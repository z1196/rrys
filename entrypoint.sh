#!/bin/sh

# 如果宿主机挂载进来的 /opt/rrys 没有 app.js → 自动初始化
if [ ! -f /opt/rrys/app.js ]; then
  echo "Initializing app.js..."
  cp /opt/rrys-template/app.js /opt/rrys/app.js
fi

cd /opt/rrys
exec "$@"
