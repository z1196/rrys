const express = require('express');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = 51888;

// ⭐ 内存缓存（key = url，value = mp4）
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

let browser;

// ⭐ 浏览器复用
async function getBrowser() {
  if (browser) return browser;
  browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-sync",
      "--ignore-gpu-blocklist",
      "--enable-webgl",
      "--disable-web-security",
      "--allow-running-insecure-content"
    ]
  });
  return browser;
}

app.get('/parse', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.send("missing url");

  // ⭐ 缓存命中（0 秒返回）
  const now = Date.now();
  if (cache.has(targetUrl)) {
    const item = cache.get(targetUrl);
    if (now - item.time < CACHE_TTL) {
      return res.send(item.mp4);
    } else {
      cache.delete(targetUrl);
    }
  }

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    // 反爬
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36"
    );

    // ⭐ 拦截图片/字体，加速加载（不拦截 CSS）
    await page.setRequestInterception(true);
    page.on("request", (reqq) => {
      const type = reqq.resourceType();
      if (["image", "font"].includes(type)) {
        reqq.abort();
      } else {
        reqq.continue();
      }
    });

    let realUrl = null;
    const mp4Regex = /\.mp4(\?|$)/i;

    // ⭐ 抓最后一个 mp4
    page.on("response", async (resp) => {
      try {
        const url = resp.url();
        if (url.includes("ali-cdn-play")) return;
        if (mp4Regex.test(url)) realUrl = url;
      } catch {}
    });

    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // ⭐ 等待 mp4（最多 5 秒）
    await page.waitForResponse(
      resp => mp4Regex.test(resp.url()) && !resp.url().includes("ali-cdn-play"),
      { timeout: 5000 }
    ).catch(() => {});

    await page.close();

    if (!realUrl) return res.send("cannot extract real url");

    // ⭐ 写入缓存
    cache.set(targetUrl, { mp4: realUrl, time: Date.now() });

    return res.send(realUrl);

  } catch (err) {
    return res.send(err.message);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("rrys parser running on", PORT);
});
