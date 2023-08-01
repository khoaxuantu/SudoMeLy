import puppeteer, { Browser, PuppeteerLaunchOptions } from "puppeteer";
import { GeneratorOptions } from "./types";
import { writeFileSync } from "fs";
import { LeaderboardData, leaderboardGeneratorOptions } from "./leaderboard";

class ImageGenerator<TData> {
    browerOptions: PuppeteerLaunchOptions
    browser: Browser
    generate: (data?: TData) => Promise<Buffer>

    constructor(options: GeneratorOptions){
        this.browerOptions = {
            headless: 'new',
            defaultViewport: options.viewPort,
        }
    
        if(process.env.CHROMIUM_EXECUTABLE_PATH){
            this.browerOptions.executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
        }

        this.generate = async (data?: TData) => {
            if(data && options.dataPath){
                writeFileSync(options.dataPath, `data = ${JSON.stringify(data)}`, { encoding: 'utf-8' });
            }
            if(!this.browser){
                await this.launchBrowserIfNot();
            }
            const page = await this.browser.newPage();
            await page.goto('file:///' + options.htmlPath);
            const buffer = await page.screenshot({
                encoding: 'binary',
                fullPage: true,
                type: 'png',
            });
            await page.close();
            return buffer;
        }
    }

    launchBrowserIfNot = async () => {
        this.browser = await puppeteer.launch(this.browerOptions);
    }
}

export const leaderboardGenerator = new ImageGenerator<LeaderboardData[]>(leaderboardGeneratorOptions);
