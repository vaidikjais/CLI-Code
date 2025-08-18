import dotenv from 'dotenv';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import OpenAI from 'openai';

import { cloneSite } from './tools/cloner.js';
import { scrapeWebsite } from './tools/scraper.js';

// --- SETUP ---
dotenv.config({ quiet: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools = [
    { type: 'function', function: { name: 'cloneSite', description: 'Clones an entire website.', parameters: { type: 'object', properties: { url: { type: 'string', description: 'The URL of the website to clone.' } }, required: ['url'] } } },
    { type: 'function', function: { name: 'scrapeWebsite', description: 'Scrapes content from a webpage.', parameters: { type: 'object', properties: { url: { type: 'string', description: 'The URL to scrape.' }, selector: { type: 'string', description: 'A CSS selector.' } }, required: ['url', 'selector'] } } }
];
const availableFunctions = { cloneSite, scrapeWebsite };
const conversationHistory = [{ role: 'system', content: 'You are a helpful CLI coding agent named Agent. Be concise.' }];

// --- UI ---
function displayWelcomeMessage() {
    const banner = `
   ____ _     ___     ____          _      
  / ___| |   |_ _|   / ___|___   __| | ___ 
 | |   | |    | |   | |   / _ \\ / _\` |/ _ \\
 | |___| |___ | |   | |__| (_) | (_| |  __/
  \\____|_____|___|   \\____\\___/ \\__,_|\\___|
                                           
                 ⚡ CLI CODE ⚡
    `;
    console.log(chalk.hex('#FFA500')(banner));
    console.log(chalk.cyan("Let's clone the internet 🌐 (Type 'exit' to quit)\n"));
}

// --- MAIN APPLICATION LOOP ---
async function main() {
    displayWelcomeMessage();

    while (true) {
        // 👇 instead of readline, use inquirer for free text
        const { userInput } = await inquirer.prompt([
            { type: 'input', name: 'userInput', message: chalk.green('You >') }
        ]);

        if (userInput.toLowerCase() === 'exit') {
            console.log(chalk.yellow('Agent > Goodbye!'));
            break;
        }

        try {
            conversationHistory.push({ role: 'user', content: userInput });
            const spinner = ora('Agent is thinking...').start();
            
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: conversationHistory,
                tools: tools,
                tool_choice: 'auto'
            });
            spinner.stop();

            const responseMessage = response.choices[0].message;

            if (responseMessage.tool_calls) {
                conversationHistory.push(responseMessage);

                for (const toolCall of responseMessage.tool_calls) {
                    const functionArgs = JSON.parse(toolCall.function.arguments);

                    // Ask framework only when cloning
                    const answers = await inquirer.prompt([
                        { type: 'list', name: 'framework', message: 'Select clone format:', choices: ['HTML+CSS+JS', 'React/Dynamic'] }
                    ]);
                    functionArgs.framework = answers.framework.startsWith('HTML') ? 'html' : 'dynamic';

                    const cloningSpinner = ora(`Cloning ${functionArgs.url} as ${answers.framework}...`).start();
                    const finalPath = await cloneSite(functionArgs);
                    cloningSpinner.succeed(`Cloning complete.`);

                    conversationHistory.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: `Successfully cloned the site to ${finalPath}`
                    });

                    console.log(chalk.green(`\n✅ Full site cloned to: ${finalPath}`));
                    console.log(chalk.dim(`You can continue chatting.\n`));
                }
            } else {
                console.log(chalk.blue('Agent > ') + responseMessage.content);
                conversationHistory.push(responseMessage);
            }
        } catch (error) {
            console.error(chalk.red('\nAn error occurred:'), error.message);
        }
    }
}

// Start the application
main();