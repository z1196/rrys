const express = require('express');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = 51888;

app.get('/parse', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.json({ error: "missing url" });

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage"
      ]
    });

    const page = await browser.newPage();

    let realUrl = null;

    // 1. 监听所有 response
    page.on("response", async (response) => {
      try {
        const url = response.url();
        const type = response.request().resourceType();

        if (!realUrl && (url.includes(".mp4") || url.includes(".m3u8"))) {
          realUrl = url;
        }

        if (!realUrl && type === "media") {
          realUrl = url;
        }

        const ct = response.headers()["content-type"] || "";
        if (!realUrl && ct.includes("application/json")) {
          const text = await response.text();
          const match = text.match(/https?:\/\/[^\s"'\\]+/);
          if (match) realUrl = match[0];
        }

      } catch (e) {}
    });

    // 2. Hook fetch
    await page.evaluateOnNewDocument(() => {
      const origFetch = window.fetch;
      window.fetch = async (...args) => {
        const res = await origFetch(...args);
        res.clone().text().then(t => {
          const m = t.match(/https?:\/\/[^\s"'\\]+/);
          if (m) window.__REAL_URL__ = m[0];
        });
        return res;
      };
    });

    // 3. Hook XHR
    await page.evaluateOnNewDocument(() => {
      const open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (...args) {
        this.addEventListener("load", function () {
          try {
            const m = this.responseText.match(/https?:\/\/[^\s"'\\]+/);
            if (m) window.__REAL_URL__ = m[0];
          } catch (e) {}
        });
        return open.apply(this, args);
      };
    });

    // 4. Hook video.src
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(HTMLMediaElement.prototype, "src", {
        set(v) {
          window.__REAL_URL__ = v;
        }
      });
    });

    // 5. Hook HLS.js loadSource
    await page.evaluateOnNewDocument(() => {
      window.Hls = window.Hls || {};
      const orig = window.Hls.loadSource;
      window.Hls.loadSource = function (url) {
        window.__REAL_URL__ = url;
        return orig.call(this, url);
      };
    });

    await page.goto(targetUrl, { waitUntil: "networkidle2" });

    await page.waitForTimeout(6000);

    // 6. 从页面变量取
    const injected = await page.evaluate(() => window.__REAL_URL__);

    await browser.close();

    if (injected && !realUrl) realUrl = injected;

    if (!realUrl) return res.json({ error: "cannot extract real url" });

    return res.json({ realUrl });

  } catch (err) {
    return res.json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("rrys parser running on", PORT);
});
