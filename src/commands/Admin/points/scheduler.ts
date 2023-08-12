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
import {
    Client,
    DApplicationCommand,
    SimpleCommand,
    SimpleCommandMessage,
} from 'discordx'
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
import { Guild, Point, PointType, RankHistory, User } from '@entities'
import { UnknownReplyError } from '@errors'
import { Disabled, Guard, UserPermissions } from '@guards'
import { Database, Logger, PointManager } from '@services'
import {
    KeyOfRanks,
    RanksNames,
    RanksPoint,
    getRank,
    getRankKeys,
    getRankV2,
    getRankValues,
    resolveDependency,
    resolveGuild,
    setMaintenance,
    simpleSuccessEmbed,
    syncUser,
} from '@utils/functions'
import { satisfies } from 'semver'
import { Loaded, wrap } from '@mikro-orm/core'

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
@Guard(UserPermissions(['Administrator']))
export default class PointsSchedulerCommand {
    constructor(
        private db: Database,
        private pm: PointManager,
        private logger: Logger
    ) {}

    @SimpleCommand({ name: 'test-reset' })
    async test(command: SimpleCommandMessage, client: Client) {
        this.rankReset()
    }

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

        await Promise.all(
            clubChannels.map((c) => this.pm.clubAdd(c as ForumChannel))
        )
    }

    @Schedule(`0 0 * */${process.env.SEASON_MONTHS} *`) // “At 00:00 in every 3rd month.”
    // @Schedule('* * * * *') // “Every minute” @test purpose
    async rankReset() {
        const guildData = await this.db
            .get(Guild)
            .findOne({ id: process.env['TEST_GUILD_ID'] })

        if (!guildData) {
            return
        }

        await setMaintenance(true)
        this.logger.log('Rank resetting...', 'info')

        const backUpRank = (
            userData: Loaded<User, never>,
            rankHistories: RankHistory[],
            previousSeason: number
        ): void => {
            const userRankHistory = new RankHistory()

            userRankHistory.user = wrap(userData).toReference()
            userRankHistory.season = previousSeason + 1
            userRankHistory.months = parseInt(process.env.SEASON_MONTHS)
            userRankHistory.overall_points =
                userData.overall_points.toString() ?? ''
            userRankHistory.rank = getRank(userData.overall_points) ?? ''
            userRankHistory.createdAt = now

            rankHistories.push(userRankHistory)
        }

        const backwardRank = (userData: Loaded<User, never>): void => {
            const curRank = getRankV2(userData.overall_points) // keys of enum Ranks

            if (curRank === RanksNames.Iron) {
                return
            }

            if (curRank === RanksNames.Bronze) {
                userData.chat_points = userData.voice_points = RanksPoint.Iron
                return
            }

            const backwardRange = curRank <= RanksNames.Diamond ? 2 : 1
            const resetRank = RanksNames[
                curRank - backwardRange
            ] as unknown as KeyOfRanks

            userData.chat_points = RanksPoint[resetRank] * 2
            userData.voice_points = 0
        }
        // ===

        const previousSeason =
            (
                await this.db.get(RankHistory).find(
                    {},
                    {
                        orderBy: {
                            season: -1,
                        },
                        limit: 1,
                    }
                )
            )?.[0]?.season || 0

        const rankHistories: RankHistory[] = []

        const now = new Date()

        const userDatas = await this.db.get(User).findAll()

        userDatas.forEach((userData) => {
            backUpRank(userData, rankHistories, previousSeason)
            backwardRank(userData)
        })

        await Promise.all([
            this.db.get(RankHistory).persistAndFlush(rankHistories),
            this.db.get(User).persistAndFlush(userDatas),
        ])

        await setMaintenance(false)
        this.logger.log('Finished rank reset!', 'info')
    }
}
