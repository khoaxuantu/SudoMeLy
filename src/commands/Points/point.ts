import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    EmbedBuilder,
    type CommandInteraction,
    type GuildMember,
    APIEmbedField,
    codeBlock,
    User as DUser,
} from 'discord.js'
import {
    Client,
    SimpleCommand,
    SimpleCommandMessage,
    SimpleCommandOption,
    SimpleCommandOptionType,
} from 'discordx'

import { Discord, Slash, SlashOption } from '@decorators'
import { injectable } from 'tsyringe'
import { Logger, PointManager } from '@services'
import { UnknownReplyError } from '@errors'
import {
    getPalette,
    getRank,
    getRankKeys,
    getRankValues,
    hexToRgb,
    numberFormat,
    replyToInteraction,
} from '@utils/functions'
import { colorPalettes as palettes } from '@configs'

@Discord()
@injectable()
@Category('Points')
export default class PointCommand {
    constructor(
        private pm: PointManager,
        private logger: Logger
    ) {}

    @SimpleCommand({ aliases: ['p'], name: 'point' })
    async simplePoint(
        @SimpleCommandOption({
            name: 'user',
            type: SimpleCommandOptionType.User,
        })
        commandUser: GuildMember | undefined,
        command: SimpleCommandMessage
    ) {
        const user = commandUser?.user || command.message.author

        const embed = await this.getEmbed(user)

        command.message.reply({
            content: embed ? undefined : `❌ Không tìm thấy người dùng!`,
            embeds: embed ? [embed] : [],
        })
    }

    @Slash({
        name: 'point',
        description: 'Kiểm tra điểm tín dụng xã hội của bạn!',
    })
    async point(
        @SlashOption({
            name: 'user',
            type: ApplicationCommandOptionType.User,
        })
        guildMember: GuildMember | undefined,
        interaction: CommandInteraction,
        client: Client,
        { localize }: InteractionData
    ) {
        const user = guildMember?.user || interaction.user

        const embed = await this.getEmbed(user)

        if (embed) {
            replyToInteraction(interaction, {
                embeds: [embed],
            })
        } else {
            throw new UnknownReplyError(interaction)
        }
    }

    async getEmbed(user: DUser) {
        // insert user in db if not exists
        const userData = await this.pm.getUserData(user)

        if (!userData) {
            return null
        }

        const CPs = `int CP = ${numberFormat(userData.chat_points)};`
        const VPs = `int VP = ${numberFormat(userData.voice_points)};`
        const MPs = `int MP = ${numberFormat(userData.mely_points)};`

        const fields: APIEmbedField[] = [
            {
                name: 'Points',
                value: codeBlock('c', `${[CPs, VPs, MPs].join('\n')}`),
                inline: true,
            },
        ]

        const rank = getRank(userData.overall_points || 0)

        const currentPoints = numberFormat(userData.overall_points || 0)

        const getNextRank = () => {
            const rankKeys = getRankKeys()

            if (rank == rankKeys[rankKeys.length - 1]) {
                return 'Go touch grass, chad!'
            }

            const nextIndex =
                rankKeys.findIndex((v) => v == rank) + 1 >= rankKeys.length
                    ? 0
                    : rankKeys.findIndex((v) => v == rank) + 1
            const nextRank = rankKeys[nextIndex]
            const nextRankPoints = numberFormat(getRankValues()[nextIndex])
            return `🆙 ${nextRank} (${nextRankPoints})`
        }

        const highestRank = (
            await userData.rankHistories.matching({
                orderBy: { overall_points: -1 },
                limit: 1,
            })
        ).shift()

        const palette = getPalette(userData.rankCardPalette || 'default')
        const color = hexToRgb(
            `${palette.find((c) => c.name === 'text')?.code}`
        )

        const highestRankStat = highestRank
            ? `🏆 ${highestRank.rank} (${numberFormat(
                  highestRank.overall_points
              )}) SS${highestRank.season}`
            : undefined

        const rankStats = [getNextRank(), highestRankStat].filter(s => !!s).join(" | ")

        const embed = new EmbedBuilder()
            .setAuthor({
                name: `@${user.username}`,
                iconURL: user.displayAvatarURL(),
            })
            .setTitle(`${rank} (${currentPoints})`)
            .setDescription(userData.description)
            .addFields(...fields)
            .setColor(color || 'Random')
            .setFooter({
                text: rankStats,
            })

        this.logger.log(
            `${user.id} checked their points (${userData.chat_points}|${userData.voice_points}|${userData.mely_points})`,
            'info',
            true
        )

        return embed
    }
}
