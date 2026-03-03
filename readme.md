# AI CLI Agent: Website Cloner & Scraper

A conversational **Command-Line Interface (CLI)** tool built with **Node.js** that acts as an intelligent assistant. It allows you to **clone entire websites** (static and dynamic) and **scrape web content** using simple natural language commands in your terminal.

## Demo

_[YouTube demo link](https://youtu.be/V5Bt-t-K3n0)_

## Features

- **Conversational Interface**  
  Chat with the agent naturally. It understands your instructions and responds like a coding assistant.

- **High-Fidelity Website Cloning**
  - **Static and Dynamic Sites**: Works with simple HTML/CSS sites and complex JS-heavy apps (React, Next.js, Vue).
  - **Intelligent Asset Discovery**: Uses **Puppeteer** to render and capture assets like images, scripts, fonts, and CSS references.
  - **Preserves File Structure**: Assets and HTML are rewritten with correct relative paths, so cloned sites run smoothly on a local server.

- **AI-Powered Web Scraping**
  - Extract specific content from any page using CSS selectors.
  - Summarize extracted data with the **OpenAI API** for quick insights.

- **Smart Framework Selection**  
  Choose between:
  - `HTML+CSS+JS` for static clone
  - `Dynamic` for full browser rendering (React/Next.js, etc.)

## Tech Stack

- **Node.js**: Core runtime
- **OpenAI GPT-4o**: Conversational AI and function calling
- **Puppeteer**: Full browser rendering
- **Cheerio**: HTML parsing and scraping
- **Chalk and Ora**: CLI output and loading indicators
- **Dotenv**: Environment management

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/cli-code.git
cd cli-code
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root and add your OpenAI API key:

```env
OPENAI_API_KEY="your-secret-api-key"
```

### 4. Link globally (optional)

So you can run it from anywhere:

- macOS/Linux:

```bash
sudo npm link
```

- Windows (Admin PowerShell):

```powershell
npm link
```

## Usage

Start the CLI:

```bash
cli-code
```

### Example commands

```text
You > hello
Agent > Hi! Ready to help you.

You > can you clone https://example.com/
Agent > Site cloned successfully.

You > clone the site https://react.dev as a dynamic app
Agent > Cloned React.dev using Puppeteer.

You > scrape all the h2 and p tags from https://github.com/
Agent > Extracted and summarized the content.
```

## Project Structure

```text
.
├── bin/
│   └── cli.js          # CLI entry point
├── clones/             # Cloned websites (auto-created)
├── tools/
│   ├── cloner.js       # Website cloning logic
│   └── scraper.js      # Web scraping logic
├── index.js            # Main chat loop
├── .env                # Environment variables (API keys)
├── .gitignore
├── package.json
└── readme.md
```

## Notes

- Some assets (like fonts or videos) may be missing if the original server blocks requests or files no longer exist.
- For best results, open the cloned site using a local server (for example, VS Code Live Server) instead of double-clicking `index.html`.

## License

MIT License © 2025 Vaidik Jaiswal
