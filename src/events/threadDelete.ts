import { Message } from 'discord.js'
import { ArgsOf, Client } from 'discordx'

import { Discord, On } from '@decorators'
import { injectable } from 'tsyringe'
import { Database, Logger, Stats } from '@services'
import { Guild, User } from '@entities'
import { syncUser } from '@utils/functions'

@Discord()
@injectable()
export default class threadDeleteEvent {
    constructor(
        private stats: Stats,
        private logger: Logger,
        private db: Database
    ) {}

    @On('threadDelete')
    async threadDeleteHandler(
        [thread]: ArgsOf<'threadDelete'>,
        client: Client
    ) {
        // Fallback when there is no parent channel
        if (!thread.parent || !thread.parentId) {
            return
        }

        const owner = await thread.fetchOwner()

        if (!owner || !owner.user || owner.user.bot) {
            return
        }

        const { guild } = thread,
            guildData = await this.db
                .get(Guild)
                .findOne({ id: guild?.id || '' })

        if (!guildData) {
            return
        }

        if (
            guildData.excluded_channels !== null &&
            guildData.excluded_channels.includes(thread.parentId)
        ) {
            return
        }

        /**
         * @Sharing_Channels
         * Xoa post: -1 mely_points
         */
        if (
            guildData.sharing_channel_ids &&
            guildData.sharing_channel_ids.length &&
            guildData.sharing_channel_ids.includes(thread.parentId)
        ) {
            await syncUser(owner.user)

            await this.db
                .get(User)
                .addPoints(owner.id, [{ type: 'mely_points', value: -1 }])
        }

        /**
         * @Club_Channels
         * Xoa post: -1 mely_points
         */
        if (
            guildData.club_channel_ids &&
            guildData.club_channel_ids.length &&
            guildData.club_channel_ids.includes(thread.parentId)
        ) {
            await syncUser(owner.user)

            await this.db
                .get(User)
                .addPoints(owner.id, [{ type: 'mely_points', value: -1 }])
        }
    }
}
