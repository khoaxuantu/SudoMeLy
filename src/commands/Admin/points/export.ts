import { Category } from '@discordx/utilities'
import { AttachmentBuilder } from 'discord.js'
import { Client, DApplicationCommand, SimpleCommandMessage } from 'discordx'
import { injectable } from 'tsyringe'

import { generalConfig } from '@configs'
import { Discord, SimpleCommand } from '@decorators'
import { Guild, PointType, User as UserEntity } from '@entities'
import { UnknownReplyError } from '@errors'
import { Disabled, Guard, UserPermissions } from '@guards'
import {
    Database,
    LeaderboardData,
    Logger,
    generateLeaderBoard,
} from '@services'
import {
    resolveGuild,
    simpleSuccessEmbed,
    syncUser,
    replyToInteraction,
} from '@utils/functions'
import { QueryOrder } from '@mikro-orm/core'
import { getRank } from '@utils/functions'

@Discord()
@injectable()
@Category('Admin')
export default class PointsAdminCommand {
    constructor(
        private db: Database,
        private logger: Logger
    ) {}

    @SimpleCommand({ aliases: ['lb'], name: 'leaderboard' })
    async exportLeaderboard(command: SimpleCommandMessage) {
        const guild = command.message.guild

        if (!guild) {
            command.message.reply({
                content: '❌ Not in guild!',
            })
            return
        }

        const repliedMsg = await command.message.reply({
            content: 'Generating...',
            allowedMentions: {
                users: [],
            },
        })

        const topUsers = await this.db
            .get(UserEntity)
            .createQueryBuilder()
            .select(['id', 'overall_points'])
            .orderBy({ overall_points: QueryOrder.DESC })
            .limit(5)

        const guildMembers = await guild.members.fetch({
            user: topUsers.map((usr) => usr.id),
        })

        const data: LeaderboardData[] = topUsers.map((user) => {
            const guildMember = guildMembers.get(user.id)
            return {
                id: user.id,
                OP: user.overall_points || 0,
                username: guildMember?.user.username || '',
                avatar: guildMember?.user.displayAvatarURL() || '',
                title: getRank(user.overall_points || 0) || 'unknown',
            }
        })

        const base64 = await generateLeaderBoard(data)
        const sfbuff = Buffer.from(base64, 'base64')
        const attachment = new AttachmentBuilder(sfbuff, { name: 'image.png' })

        repliedMsg.edit({
            content: '',
            files: [attachment],
            allowedMentions: {
                users: [],
            },
        })
    }
}
