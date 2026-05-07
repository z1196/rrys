FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt update && apt install -y \
    chromium-browser \
    nodejs \
    npm \
    --no-install-recommends

WORKDIR /app

COPY package.json /app/package.json
RUN npm install

COPY . /app

EXPOSE 51888

CMD ["node", "app.js"]
