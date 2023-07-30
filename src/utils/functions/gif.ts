import { get } from 'https';

interface KawaiiAPIResponse{
    response: string;
}

export const kawaiiGif = (endpoint: string): Promise<string> => {
    return new Promise(resolve => {
        const token = process.env['KAWAII_API'];
        const url = `https://kawaii.red/api/gif/${endpoint}/token=${token}`;
        get(url, (res) => {
            let text = '';
            res.on('data', (chunk) => text += chunk);
            res.on('end', () => {
                const data: KawaiiAPIResponse = JSON.parse(text);
                resolve(data.response);
            });
            res.on('error', () => resolve("https://avatars.githubusercontent.com/u/88936664?s=200&v=4"));
        });
    })
}
