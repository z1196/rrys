FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 安装 Chrome 依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    --no-install-recommends

# 安装 Google Chrome Stable
RUN wget -O chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y ./chrome.deb \
    && rm chrome.deb

# ---- 安全瘦身：删除不必要的文件 ----
RUN rm -rf /usr/share/doc/* \
    /usr/share/man/* \
    /usr/share/locale/* \
    /var/lib/apt/lists/* \
    /var/cache/apt/* \
    /opt/google/chrome/locales/* \
    && mkdir -p /opt/google/chrome/locales/en-US \
    && echo '{}' > /opt/google/chrome/locales/en-US.pak

# 复制项目文件
COPY package.json ./
RUN npm install --only=production

COPY . .

# 暴露端口
EXPOSE 51888

# 启动命令
CMD ["node", "app.js"]
