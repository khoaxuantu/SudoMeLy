import { ArgsOf, Client, Guard } from 'discordx'
import { Discord, On, OnCustom } from '@decorators'
import { Maintenance } from '@guards'
import { injectable } from 'tsyringe'
import { Database, EventManager, PointManager, PointPackage } from '@services'
import {
    ChannelType,
    PublicThreadChannel,
} from 'discord.js'
import { Guild, Point, User } from '@entities'
import { isInMaintenance, sendForm } from '@utils/functions'

@Discord()
@injectable()
export default class ThreadArchiveEvent {
    constructor(
        private db: Database,
        private pm: PointManager,
        private eventManager: EventManager,
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

        const data: PointPackage[] = (
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
                    user: member.user,
                    type: 'chat_points',
                    value: points
                }
            })

        await this.pm.addMany(data);
        await sendForm(newThread)
    }

    // =============================
    // ========== Emitter ==========
    // =============================

    @On('threadUpdate')
    async voiceEmitter(
        [oldThread, newThread]: ArgsOf<'threadUpdate'>,
        client: Client
    ) {
        if (await isInMaintenance()) {
            return
        }

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
