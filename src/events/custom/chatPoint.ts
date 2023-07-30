import { ArgsOf, Client, Guard } from 'discordx'

import { Discord, On, OnCustom } from '@decorators'
import { Maintenance } from '@guards'
import { injectable } from 'tsyringe'
import { Database, EventManager, Logger, Stats } from '@services'
import { ChannelType, Message, MessageType } from 'discord.js'
import { getRandomInt, resolveGuild, syncUser } from '@utils/functions'
import { Guild, User } from '@entities'

@Discord()
@injectable()
export default class ChatPointEvent {
    constructor(
        private stats: Stats,
        private logger: Logger,
        private db: Database,
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
        if (message.content.length < 3 && !message.attachments.size) return

        // Base point
        let points = getRandomInt(2, 3)

        points += (message.content.length * 5).toString().length

        // If contains any attachments
        if (message.attachments.size) points += 1

        // If contains more than 5 spaces
        if (message.content.trim().split(/ +/g).length > 5) points += 1

        // If contains emojis
        if (
            message.cleanContent.match(
                /<a?:.+?:\d{18,19}>|\p{Extended_Pictographic}/gu
            )
        ) {
            points += 1
        }

        // If contains codeblocks
        if (message.cleanContent.match(/```.+?```/gisu)) {
            points += 1
        }

        // If mentioned others or replied to others
        if (
            message.cleanContent.match(/<@\d{18,19}>/g) ||
            (message.type === MessageType.Reply && message.reference)
        ) {
            points += 1
        }

        // If contains URLs
        if (message.cleanContent.match(/https?:\/\/[^.]\.[^/]+/g)) {
            points += 1
        }

        // Round the point down so there will be no floating point in database
        const toAddPoints = Math.floor(points / 3)

        // Check if user is exist, if not, create one
        await syncUser(member.user)

        // Add chat point
        await this.db
            .get(User)
            .addPoints(member.id, [{ type: 'chat_points', value: toAddPoints }])

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
