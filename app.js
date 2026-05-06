const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const port = 51888;

app.get("/", async (req, res) => {
    const url = req.query.url;
    if (!url) return res.send("缺少 url 参数");

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-zygote",
                "--single-process"
            ]
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle2" });

        let realUrl = "";

        page.on("response", async (response) => {
            const reqUrl = response.url();
            if (reqUrl.includes(".mp4") || reqUrl.includes(".m3u8")) {
                realUrl = reqUrl;
            }
        });

        await page.waitForTimeout(5000);
        await browser.close();

        if (!realUrl) return res.send("未找到播放链接");

        return res.send(realUrl);

    } catch (err) {
        return res.send("解析失败：" + err.message);
    }
});

app.listen(port, () => {
    console.log(`RRYS Parser running on port ${port}`);
});
