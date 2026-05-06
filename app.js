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
      executablePath: "/usr/bin/google-chrome",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage"
      ]
    });

    const page = await browser.newPage();

    let realUrl = null;

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

        if (!realUrl && type === "xhr") {
          const text = await response.text();
          const match = text.match(/https?:\/\/[^\s"'\\]+/);
          if (match) realUrl = match[0];
        }

      } catch (e) {}
    });

    await page.goto(targetUrl, { waitUntil: "networkidle0" });

    await page.waitForTimeout(5000);

    await browser.close();

    if (!realUrl) return res.json({ error: "cannot extract real url" });

    return res.json({ realUrl });

  } catch (err) {
    return res.json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("rrys parser running on", PORT);
});
