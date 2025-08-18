import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Main export - updated to return the output path
export async function scrapeWebsite({ url, selector }) {
  try {
    console.log(chalk.magentaBright(`\n🔎 Launching browser to scrape: ${url}`));

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const html = await page.content();
    await browser.close();

    const $ = cheerio.load(html);
    const selectors = selector.split(",").map(s => s.trim());
    let extracted = {};

    for (const sel of selectors) {
      extracted[sel] = [];
      $(sel).each((_, el) => {
        const text = $(el).text().trim();
        if (text) extracted[sel].push(text);
      });
    }

    const flatText = Object.values(extracted).flat().join("\n").slice(0, 16000); // Increased context for better summary
    console.log(chalk.blue(`   ✅ Extracted content for selectors: ${selectors.join(", ")}`));
    console.log(chalk.blue(`   🗣️  Sending content to AI for summarization...`));


    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert data analyst. Summarize the provided text content from a website concisely." },
        { role: "user", content: `Please summarize the key information from the following content extracted from ${url} using selectors [${selector}]:\n\n${flatText}` },
      ],
    });

    const summary = response.choices[0].message.content;

    const outputDir = path.resolve(process.cwd(), "output");
    await fs.ensureDir(outputDir);
    const fileName = `${new URL(url).hostname}_summary.json`;
    const filePath = path.join(outputDir, fileName);
    
    const result = { url, selectors, extracted, summary };
    await fs.writeJson(filePath, result, { spaces: 2 });
    
    const successMessage = `📂 Summary and extracted data saved in: ${filePath}`;
    console.log(chalk.magentaBright(successMessage));
    return successMessage; // Return the success message

  } catch (err) {
    console.error(chalk.red("   ❌ Error scraping site:", err.message));
    return `Failed to scrape the site. Error: ${err.message}`;
  }
}