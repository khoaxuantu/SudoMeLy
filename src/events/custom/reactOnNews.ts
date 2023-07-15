import { ArgsOf, Client, Guard } from 'discordx'

import { Discord, On, OnCustom } from '@decorators'
import { Maintenance } from '@guards'
import { injectable } from 'tsyringe'
import { Database, EventManager, Logger, Stats } from '@services'
import { ChannelType, Message } from 'discord.js'
import { resolveGuild } from '@utils/functions'

@Discord()
@injectable()
export default class ReactOnNews {
    constructor(
        private stats: Stats,
        private logger: Logger,
        private db: Database,
        private eventManager: EventManager
    ) {}

    // =============================
    // ========= Handlers ==========
    // =============================

    @OnCustom('reactOnNews')
    async reactOnNewsHandler(message: Message<true>) {
        const { guild } = message
        if (!guild) return
        // Get all available emojis in guild
        let emojis = await guild.emojis.fetch()
        emojis = await emojis.filter((e) => e.available)

        // Get random amount of emojis will be reacted
        const emojiAmount = Math.floor(Math.random() * (10 - 5) + 5)

        // React
        for (let i = 0; i < emojiAmount; i++) {
            let emoji = await emojis.random()
            if (emoji) await message.react(emoji)
        }
    }

    // =============================
    // ========== Emitter ==========
    // =============================

    @On('messageCreate')
    @Guard(Maintenance)
    async reactOnNewsEmitter(
        [message]: ArgsOf<'messageCreate'>
        // client: Client
    ) {
        // Only emit on Announcement Channel
        if (
            message.inGuild() &&
            message.channel.type === ChannelType.GuildAnnouncement
        ) {
            /**
             * @param {Message} message
             */
            this.eventManager.emit('reactOnNews', message)
        }
    }
}
