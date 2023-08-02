import { ArgsOf, Client, Guard } from 'discordx'

import { Discord, On, OnCustom } from '@decorators'
import { Maintenance } from '@guards'
import { injectable } from 'tsyringe'
import { Database, EventManager, PointManager } from '@services'
import { ChannelType, Message, MessageType } from 'discord.js'
import { Guild, User } from '@entities'

@Discord()
@injectable()
export default class ChatPointEvent {
    constructor(
        private db: Database,
        private pm: PointManager,
        private eventManager: EventManager
    ) {}

    private cooldown = new Map<string, { lastChat: Date }>()

    // =============================
    // ========= Handlers ==========
    // =============================

    @OnCustom('chatPoint')
    async chatPointHandler(message: Message<true>) {
        const { guild, member } = message

        if (!guild || !member) return

        if (guild.id != process.env.TEST_GUILD_ID) return

        const guildData = await this.db.get(Guild).findOne({ id: guild.id })

        if (!guildData) return

        if (
            guildData.excluded_channels !== null &&
            guildData.excluded_channels.length &&
            guildData.excluded_channels.includes(message.channelId)
        ) {
            return
        }

        if (
            guildData.excluded_roles !== null &&
            guildData.excluded_roles.length &&
            guildData.excluded_roles.some((c_id) =>
                member.roles.cache.has(c_id)
            )
        ) {
            return
        }

        if (
            guildData.normal_chat_channel_ids === null ||
            !guildData.normal_chat_channel_ids.includes(message.channelId)
        ) {
            return
        }

        // 2 secs cooldowns
        if (
            Date.now() -
                (this.cooldown.get(member.id)?.lastChat.getTime() || 0) <
            2000
        ) {
            return
        }

        // ignore message without any attachment and content length below 3
        this.pm.messageAdd(message);
        this.cooldown.set(member.id, { lastChat: new Date() })
    }

    // =============================
    // ========== Emitter ==========
    // =============================

    @On('messageCreate')
    @Guard(Maintenance)
    async chatPointEmitter(
        [message]: ArgsOf<'messageCreate'>
        // client: Client
    ) {
        // Only emit in guild and by user
        if (message.inGuild() && !message.author.bot) {
            /**
             * @param {Message} message
             */
            this.eventManager.emit('chatPoint', message)
        }
    }
}
