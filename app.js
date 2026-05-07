const express = require("express");
const puppeteer = require("puppeteer-core");

const app = express();
const PORT = 51888;

app.get("/parse", async (req, res) => {
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
        "--enable-features=NetworkService,NetworkServiceInProcess",
        "--disable-blink-features=AutomationControlled",
        "--allow-running-insecure-content",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-dev-shm-usage",
        "--window-size=1280,800"
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

    await page.evaluateOnNewDocument(() => {
      const origFetch = window.fetch;
      window.fetch = async (...args) => {
        const r = await origFetch(...args);
        r.clone().text().then(t => {
          const m = t.match(/https?:\/\/[^\s"'\\]+/);
          if (m) window.__REAL_URL__ = m[0];
        });
        return r;
      };
    });

    await page.evaluateOnNewDocument(() => {
      const open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (...args) {
        this.addEventListener("load", function () {
          try {
            const m = this.responseText.match(/https?:\/\/[^\s"'\\]+/);
            if (m) window.__REAL_URL__ = m[0];
          } catch {}
        });
        return open.apply(this, args);
      };
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(HTMLMediaElement.prototype, "src", {
        set(v) {
          window.__REAL_URL__ = v;
        }
      });
    });

    await page.evaluateOnNewDocument(() => {
      window.Hls = window.Hls || {};
      const orig = window.Hls.loadSource;
      window.Hls.loadSource = function (url) {
        window.__REAL_URL__ = url;
        return orig.call(this, url);
      };
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, "__NUXT__", {
        set(v) {
          try {
            const play = v?.state?.video?.playUrl;
            if (play) window.__REAL_URL__ = play;
          } catch {}
          window.__NUXT___data = v;
        },
        get() {
          return window.__NUXT___data;
        }
      });
    });

    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 30000 });

    await page.waitForTimeout(6000);

    const injected = await page.evaluate(() => window.__REAL_URL__);

    await browser.close();

    if (injected && !realUrl) realUrl = injected;

    if (!realUrl) return res.send("cannot extract real url");

    return res.send(realUrl);

  } catch (err) {
    return res.send(err.message);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("rrys parser running on", PORT);
});
