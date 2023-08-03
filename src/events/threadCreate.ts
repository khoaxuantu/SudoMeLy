import { ArgsOf, Client } from 'discordx'

import { Discord, On } from '@decorators'
import { injectable } from 'tsyringe'
import { Database, PointManager } from '@services'
import { Guild } from '@entities'

@Discord()
@injectable()
export default class threadCreateEvent {
    constructor(
        private db: Database,
        private pm: PointManager,
    ) {}

    @On('threadCreate')
    async threadCreateHandler(
        [thread, newlyCreated]: ArgsOf<'threadCreate'>,
        client: Client
    ) {
        // Fallback when there is no parent channel
        if (!thread.parent || !thread.parentId || !newlyCreated) {
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
         * Tao post: +1 mely_points
         */
        if (
            guildData.sharing_channel_ids &&
            guildData.sharing_channel_ids.length &&
            guildData.sharing_channel_ids.includes(thread.parentId)
        ) {
            await this.pm.add({
                user: owner.user,
                type: 'mely_points',
                value: 1
            })
        }

        /**
         * @Club_Channels
         * Tao post: +1 mely_points
         */
        if (
            guildData.club_channel_ids &&
            guildData.club_channel_ids.length &&
            guildData.club_channel_ids.includes(thread.parentId)
        ) {
            await this.pm.add({
                user: owner.user,
                type: 'mely_points',
                value: 1
            })
        }
    }
}
