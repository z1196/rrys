const express = require('express');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = 51888;

app.get('/parse', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.send("missing url");

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/usr/bin/chromium-browser",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled"
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
        const ct = resp.headers()["content-type"] || "";

        if (!realUrl && (url.includes(".mp4") || url.includes(".m3u8"))) {
          realUrl = url;
        }

        if (!realUrl && ct.includes("application/json")) {
          const text = await resp.text();
          const m = text.match(/https?:\/\/[^\s"'\\]+/);
          if (m) realUrl = m[0];
        }
      } catch {}
    });

    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30000 });

    await page.waitForTimeout(5000);

    await browser.close();

    if (!realUrl) return res.send("cannot extract real url (headless mode)");

    return res.send(realUrl);

  } catch (err) {
    return res.send(err.message);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("rrys parser running on", PORT);
});
