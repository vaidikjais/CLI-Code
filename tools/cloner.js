import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

const visited = new Set();
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36";
const failedAssets = [];

async function downloadFile(fileUrl, savePath) {
  try {
    if (!fileUrl || !savePath) {
      console.warn(`⚠️ Skipping invalid asset: url=${fileUrl}, path=${savePath}`);
      return null;
    }

    const res = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      headers: { "User-Agent": USER_AGENT },
    });

    fs.mkdirSync(path.dirname(savePath), { recursive: true });
    fs.writeFileSync(savePath, res.data);
    return savePath;
  } catch (err) {
    if (err.response?.status === 404) {
      failedAssets.push(fileUrl);
      return null;
    } else {
      console.warn(`⚠️ Failed to download ${fileUrl}: ${err.message}`);
      return null;
    }
  }
}

async function parseAndDownloadCssAssets(cssContent, cssUrl, outputDir, cssFilePath) {
  const urlRegex = /url\((['"]?)(.*?)\1\)/g;
  let match;
  let rewrittenCss = cssContent;

  while ((match = urlRegex.exec(cssContent)) !== null) {
    const assetPath = match[2];
    if (!assetPath || assetPath.startsWith("data:")) continue;

    try {
      const assetUrlHref = new URL(assetPath, cssUrl).href;
      const assetUrl = new URL(assetUrlHref);
      const relPath = assetUrl.pathname.replace(/^\/+/, "");
      const assetSavePath = path.join(outputDir, relPath);

      if (!visited.has(assetUrl.href)) {
        visited.add(assetUrl.href);
        await downloadFile(assetUrl.href, assetSavePath);
      }

      // rewrite inside CSS
      rewrittenCss = rewrittenCss.replace(assetPath, relPath);
    } catch (e) {
      console.warn(`⚠️ Failed to resolve CSS asset: ${assetPath}`);
    }
  }

  // overwrite CSS file with rewritten content
  fs.writeFileSync(cssFilePath, rewrittenCss, "utf-8");
}

async function fetchPageHTML(pageUrl) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  await page.goto(pageUrl, { waitUntil: "networkidle0" });
  const html = await page.content();
  await browser.close();
  return html;
}

async function processPage(pageUrl, outputDir) {
  if (visited.has(pageUrl)) return;
  visited.add(pageUrl);

  try {
    const html = await fetchPageHTML(pageUrl);
    const $ = cheerio.load(html);
    const baseUrl = new URL(pageUrl);

    const localPath = baseUrl.pathname === "/" ? "/index.html" : baseUrl.pathname;
    const filePath = path.join(outputDir, localPath);

    // --- Collect assets ---
    const assets = [];
    const assetSelectors = [
      "img[src]",
      "script[src]",
      "link[rel='stylesheet'][href]",
      "video[src]",
      "source[src]",
      "video[poster]",
      "img[srcset]",
    ];

    $(assetSelectors.join(", ")).each((_, el) => {
      ["src", "href", "poster", "srcset"].forEach((attr) => {
        const val = $(el).attr(attr);
        if (!val) return;

        const urls =
          attr === "srcset"
            ? val.split(",").map((s) => s.trim().split(" ")[0])
            : [val];

        urls.forEach((url) => {
          try {
            const absUrl = new URL(url, pageUrl);
            if (absUrl.protocol !== "http:" && absUrl.protocol !== "https:") return;

            const relPath = absUrl.pathname.replace(/^\/+/, "");
            const savePath = path.join(outputDir, relPath);

            // rewrite HTML
            $(el).attr(attr, relPath);

            assets.push({ url: absUrl.href, savePath, relPath });
          } catch {}
        });
      });
    });

    // --- Download assets ---
    const results = await Promise.all(
      assets.map((asset) => downloadFile(asset.url, asset.savePath))
    );
    const downloadedFiles = results.filter((r) => r !== null);

    // --- Process CSS for nested assets ---
    for (const cssFile of downloadedFiles) {
      if (cssFile && cssFile.endsWith(".css")) {
        const cssContent = fs.readFileSync(cssFile, "utf-8");
        await parseAndDownloadCssAssets(cssContent, pageUrl, outputDir, cssFile);
      }
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, $.html(), "utf-8");
  } catch (err) {
    console.error(`❌ Failed processing page ${pageUrl}: ${err.message}`);
  }
}

export async function cloneSite({ url }) {
  const outputDir = path.resolve(process.cwd(), "clones", new URL(url).hostname);

  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  visited.clear();
  await processPage(url, outputDir);

  if (failedAssets.length > 0) {
    console.log(`⚠️ ${failedAssets.length} assets could not be downloaded (missing/404).`);
  }

  return outputDir;
}