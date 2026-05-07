const express = require('express');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = 51888;

app.get('/parse', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.send("missing url");

  try {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--enable-features=NetworkService,NetworkServiceInProcess",
        "--allow-running-insecure-content",
        "--disable-web-security"
      ]
    });

    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36"
    );

    let realUrl = null;

    page.on("response", async (resp) => {
      try {
        const url = resp.url();
        if (!realUrl && (url.includes(".mp4") || url.includes(".m3u8"))) {
          realUrl = url;
        }
      } catch {}
    });

    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30000 });

    await page.waitForTimeout(6000);

    await browser.close();

    if (!realUrl) return res.send("cannot extract real url");

    return res.send(realUrl);

  } catch (err) {
    return res.send(err.message);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("rrys parser running on", PORT);
});
