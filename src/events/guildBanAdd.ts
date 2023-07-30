import { Message } from 'discord.js'
import { ArgsOf, Client } from 'discordx'

import { Discord, On } from '@decorators'
import { injectable } from 'tsyringe'
import { Database, Logger, Stats } from '@services'
import { Guild, User } from '@entities'
import { syncUser } from '@utils/functions'

@Discord()
@injectable()
export default class guildBanAddEvent {
    constructor(
        private stats: Stats,
        private logger: Logger,
        private db: Database
    ) {}

    @On('guildBanAdd')
    async guildBanAddHandler([ban]: ArgsOf<'guildBanAdd'>, client: Client) {
        // Delete user from database when they are banned
        const bannedUserData = await this.db
            .get(User)
            .findOne({ id: ban.user.id })

        if (bannedUserData) {
            await this.db.get(User).removeAndFlush(bannedUserData)
        }
    }
}
