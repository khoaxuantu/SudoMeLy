import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    AutocompleteInteraction,
    Channel,
    ChannelType,
    CommandInteraction,
    ForumChannel,
    GuildMember,
    PermissionFlagsBits,
    User as DUser,
} from 'discord.js'
import { Client, DApplicationCommand } from 'discordx'
import { injectable } from 'tsyringe'

import { generalConfig } from '@configs'
import {
    Discord,
    Schedule,
    Slash,
    SlashChoice,
    SlashGroup,
    SlashOption,
} from '@decorators'
import { Guild, Point, PointType, User } from '@entities'
import { UnknownReplyError } from '@errors'
import { Disabled, Guard, UserPermissions } from '@guards'
import { Database, Logger } from '@services'
import {
    resolveDependency,
    resolveGuild,
    simpleSuccessEmbed,
    syncUser,
} from '@utils/functions'
import { satisfies } from 'semver'

@Discord()
@injectable()
@Category('Admin')
@SlashGroup({
    description: 'Manage user points',
    name: 'points',
    // root: 'config',
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
})
@SlashGroup('points')
@Guard(UserPermissions(['Administrator']), Disabled)
export default class PointsSchedulerCommand {
    constructor(
        private db: Database,
        private logger: Logger
    ) {}

    // @Schedule('0 0 25 * *') // “At 00:00 on day-of-month 25.”
    // @Schedule('* * * * *') // “Every minute” @test purpose
    async calcClubPoints() {
        // Comment this on test
        if (new Date().getDate() != 25) {
            return
        }

        const guildData = await this.db
            .get(Guild)
            .findOne({ id: process.env['TEST_GUILD_ID'] })

        if (!guildData) {
            return
        }

        const client = await resolveDependency(Client)
        const guild = await client.guilds.fetch(guildData.id)
        await guild.channels.fetch()
        const clubChannels = guild.channels.cache
            .filter((c) => c.type === ChannelType.GuildForum)
            .filter((c) => guildData.club_channel_ids?.includes(c.id))

        const threads = clubChannels.flatMap(
            (c) => (c as ForumChannel).threads.cache
        )

        const data = (
            await Promise.all(
                threads
                    .filter((t) => !!t.ownerId && t.archived !== true)
                    .map(async (thread) => {
                        const threadMembers = thread.members.cache.filter(
                            (tm) =>
                                tm.user &&
                                !tm.user.bot &&
                                tm.id !== thread.ownerId
                        )

                        const threadMessages = (
                            await thread.messages.fetch()
                        ).filter(
                            (msg) =>
                                !msg.author.bot &&
                                msg.author.id !== thread.ownerId
                        )

                        // Thread vẫn active: `+ mem / 2`
                        const ownerPoints = Math.floor(threadMembers.size / 2)

                        const membersData: DataPoint[] = threadMembers.map(
                            (tm) => ({
                                id: tm.id,
                                points: [
                                    {
                                        type: 'mely_points',
                                        value: Math.floor(
                                            threadMessages.filter(
                                                (m) => m.author.id === tm.id
                                            ).size / 50
                                        ),
                                    },
                                ],
                            })
                        )

                        return [
                            ...membersData,
                            {
                                id: thread.ownerId!,
                                points: [
                                    {
                                        type: 'mely_points',
                                        value: ownerPoints,
                                    },
                                ],
                            },
                        ]
                    })
                    .flat()
            )
        ).shift()

        if (data) {
            await this.db.get(User).addPointsToMany(data as DataPoint[])
        }
    }
}

type DataPoint = { id: string; points: Point[] }
