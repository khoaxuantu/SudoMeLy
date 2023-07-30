import path from "path";
import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

export interface LeaderboardData {
    id: string,
    OP: number,
    username: string,
    avatar: string,
    title: string,
}

export const generateLeaderBoard = async (data: LeaderboardData[]) => {
    const dataPath = path.join(__dirname, 'public', 'assets', 'js', 'data.js');
    writeFileSync(dataPath, `data = ${JSON.stringify(data)}`, { encoding: 'utf-8'});
    const browser = await puppeteer.launch({
        headless: 'new',
    })
    const page = await browser.newPage();
    page.setViewport({
        width: 1280,
        height: 720,
    })
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    const url = `file:///${htmlPath.replace(/\\/g, '\/')}`;
    await page.goto(url);
    const base64 = await page.screenshot({
        encoding: 'base64',
        fullPage: true
    });
    await browser.close();
    return base64;
}
