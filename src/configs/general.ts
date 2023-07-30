export const generalConfig: GeneralConfigType = {
    name: 'tscord', // the name of your bot
    description: '', // the description of your bot
    defaultLocale: 'en', // default language of the bot, must be a valid locale
    ownerId: process.env['BOT_OWNER_ID'] || '',
    timezone: 'Asia/Ho_Chi_Minh', // default TimeZone to well format and localize dates (logs, stats, etc)

    simpleCommandsPrefix: '!', // default prefix for simple command messages (old way to do commands on discord)
    automaticDeferring: false, // enable or not the automatic deferring of the replies of the bot on the command interactions

    // useful links
    links: {
        invite: 'https://codemely.tech',
        supportServer: 'https://discord.gg/codemely',
        gitRemoteRepo: 'https://github.com/mely-apps/Discord-bot-Sudo-MeLy',
        tos: "https://gist.github.com/fiezt1492/d0c64a6bea28821a737f5c543d7cff64"
    },

    automaticUploadImagesToImgur: false, // enable or not the automatic assets upload

    devs: ['703930445502480384', '696020793573769308', '445102575314927617'], // discord IDs of the devs that are working on the bot (you don't have to put the owner's id here)

    eval: {
        name: 'bot', // name to trigger the eval command
        onlyOwner: false, // restrict the eval command to the owner only (if not, all the devs can trigger it)
    },

    // define the bot activities (phrases under its name). Types can be: PLAYING, LISTENING, WATCHING, STREAMING
    activities: [
        {
            text: 'Code MeLy',
            type: 'WATCHING',
        },
        {
            text: 'HTMLOL',
            type: 'PLAYING',
        },
        {
            text: 'Visual Studio Code',
            type: 'PLAYING',
        },
        {
            text: 'fb.com/code.mely',
            type: 'WATCHING',
        },
        {
            text: 'MeLy Show',
            type: 'LISTENING',
        },
    ],
    mely: {
        greeting: {
            keywords: {
                channel: 'hello-world',
                imageChannel: 'image-welcome',
            },
        },
        nicknameChannelKeyword: 'nickname-requests',
    },
}

// global colors
export const colorsConfig = {
    primary: '#2F3136',
}
