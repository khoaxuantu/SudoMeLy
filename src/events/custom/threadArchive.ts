import { ArgsOf, Client, Guard } from 'discordx'

import { Discord, On, OnCustom } from '@decorators'
import { Maintenance } from '@guards'
import { injectable } from 'tsyringe'
import { Database, EventManager, Logger, Stats, Store } from '@services'
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    PublicThreadChannel,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ThreadChannel,
    ThreadMember,
} from 'discord.js'
import { Guild, Point, User } from '@entities'
import { getRandomInt, sendForm } from '@utils/functions'

@Discord()
@injectable()
export default class ThreadArchiveEvent {
    constructor(
        private stats: Stats,
        private logger: Logger,
        private db: Database,
        private eventManager: EventManager,
        private store: Store
    ) {}

    // =============================
    // ========= Handlers ==========
    // =============================

    @OnCustom('threadArchive')
    async threadArchiveHandler(
        oldThread: PublicThreadChannel<true>,
        newThread: PublicThreadChannel<true>,
        client: Client
    ) {
        if (!newThread.guild || !newThread.parentId) {
            return
        }

        const guildData = await this.db
            .get(Guild)
            .findOne({ id: newThread.guild.id })

        if (!guildData) {
            return
        }

        if (
            guildData.excluded_channels !== null &&
            guildData.excluded_channels.length &&
            guildData.excluded_channels.includes(newThread.parentId)
        ) {
            return
        }

        if (
            guildData.supporting_channel_ids === null ||
            !guildData.supporting_channel_ids.includes(newThread.parentId)
        ) {
            return
        }

        const threadMessages = (await newThread.messages.fetch()).filter(
            (msg) => !msg.author.bot
        )

        if (threadMessages.size <= 1) {
            return
        }

        const data: { id: string; points: Point[] }[] = (
            await newThread.members.fetch()
        )
            .filter((v) => !v.user?.bot)
            .map((member) => {
                // là người tham gia thread: message đã nhắn / tổng số trong thread * 10 -> làm tròn lên.
                const points =
                    Math.floor(
                        Math.ceil(
                            (threadMessages.filter(
                                (msg) => msg.author.id === member.id
                            ).size /
                                threadMessages.size) *
                                30
                        ) / 3
                    ) + 1

                return {
                    id: member.id,
                    points: [{ type: 'chat_points', value: points }],
                }
            })

        await this.db.get(User).addPointsToMany(data)

        await sendForm(newThread)
    }

    // =============================
    // ========== Emitter ==========
    // =============================

    @On('threadUpdate')
    @Guard(Maintenance)
    async voiceEmitter(
        [oldThread, newThread]: ArgsOf<'threadUpdate'>,
        client: Client
    ) {
        // Only accept private guild and user
        if (
            oldThread.guild.id == process.env['TEST_GUILD_ID'] &&
            newThread.guild.id == process.env['TEST_GUILD_ID'] &&
            oldThread.type === ChannelType.PublicThread &&
            newThread.type === ChannelType.PublicThread &&
            oldThread.archived === false &&
            newThread.archived === true
        ) {
            /**
             * @param {ThreadChannel} oldThread - The thread before the update
             * @param {ThreadChannel} newThread - The thread after the update
             */
            this.eventManager.emit(
                'threadArchive',
                oldThread,
                newThread,
                client
            )
        }
    }
}
