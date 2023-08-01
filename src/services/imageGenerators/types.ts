import { Viewport } from "puppeteer"

export interface GeneratorOptions{
    htmlPath: string,
    dataPath?: string, // filename should be data.js
    viewPort: Viewport
}
