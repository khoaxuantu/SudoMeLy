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

    @On('guildMemberRemove')
    async guildBanAddHandler([member]: ArgsOf<'guildMemberRemove'>, client: Client) {
        // Delete user from database when they left the guild
        const userData = await this.db
            .get(User)
            .findOne({ id: member.user.id })

        if (userData) {
            await this.db.get(User).removeAndFlush(userData)
        }
    }
}
