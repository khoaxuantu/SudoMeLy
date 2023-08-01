import { GeneratorOptions } from "../types";
import { join } from "path";
export interface LeaderboardData {
    id: string,
    OP: number,
    username: string,
    avatar: string,
    title: string,
}

export const leaderboardGeneratorOptions: GeneratorOptions = {
    htmlPath: join(__dirname, 'index.html'),
    dataPath: join(__dirname, 'assets', 'js', 'data.js'),
    viewPort: {
        width: 1280,
        height: 720,
        deviceScaleFactor: 2
    }
}
