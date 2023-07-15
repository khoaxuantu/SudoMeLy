import { ArgsOf, Guard } from 'discordx'

import { Discord, On, OnCustom } from '@decorators'
import { Maintenance } from '@guards'
import { injectable } from 'tsyringe'
import { Database, EventManager, Logger, Stats } from '@services'
import { Message } from 'discord.js'
import { Guild } from '@entities'

@Discord()
@injectable()
export default class ThreadReply {
    constructor(
        private stats: Stats,
        private logger: Logger,
        private db: Database,
        private eventManager: EventManager
    ) {}

    // =============================
    // ========= Handlers ==========
    // =============================

    @OnCustom('threadReply')
    async threadReplyHandler(message: Message<true>) {
        const { guild } = message,
            guildData = await this.db
                .get(Guild)
                .findOne({ id: guild?.id || '' })

        // Fallback when there is no channel
        if (!guildData) return
        if (
            !guildData.reply_channel_ids ||
            !guildData.reply_channel_ids.length
        ) {
            return
        }

        // Check if channel is in data
        if (!guildData.reply_channel_ids.includes(message.channelId)) return

        // Check if message has enough content length
        if (message.content.length < 50) return

        // Passed, create reply thread
        message.startThread({
            name: 'Trả lời ' + message.author.username,
        })
    }

    // =============================
    // ========== Emitter ==========
    // =============================

    @On('messageCreate')
    @Guard(Maintenance)
    async threadReplyEmitter(
        [message]: ArgsOf<'messageCreate'>
        // client: Client
    ) {
        if (message.inGuild()) {
            /**
             * @param {Message} message
             */
            this.eventManager.emit('threadReply', message)
        }
    }
}
