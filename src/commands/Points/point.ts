import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    EmbedBuilder,
    type CommandInteraction,
    type GuildMember,
    type Message,
    APIEmbedField,
    codeBlock,
    AttachmentBuilder,
    User as DUser,
    chatInputApplicationCommandMention,
} from 'discord.js'
import {
    Client,
    SimpleCommand,
    SimpleCommandMessage,
    SimpleCommandOption,
    SimpleCommandOptionType,
} from 'discordx'
import { createCanvas, type Canvas, loadImage } from '@napi-rs/canvas'
import { request } from 'undici'

import { Discord, Slash, SlashOption } from '@decorators'
import { injectable } from 'tsyringe'
import { User } from '@entities'
import { Database, Logger } from '@services'
import { UnknownReplyError } from '@errors'
import numeral from 'numeral'
import {
    getRank,
    getRankKeys,
    getRankValues,
    numberFormat,
    replyToInteraction,
    syncUser,
} from '@utils/functions'

@Discord()
@injectable()
@Category('Points')
export default class PointCommand {
    constructor(
        private db: Database,
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
        await syncUser(user)

        const userData = await this.db.get(User).findOne({ id: user.id })

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
            return `Next rank: ${nextRank} (${currentPoints}/${nextRankPoints})`
        }

        const embed = new EmbedBuilder()
            .setAuthor({
                name: `@${user.username} - ${rank}`,
                iconURL: user.displayAvatarURL(),
            })
            .setDescription(userData.description)
            .addFields(...fields)
            .setColor('Random')
            .setFooter({
                text: getNextRank(),
            })

        this.logger.log(
            `${user.id} checked their points (${userData.chat_points}|${userData.voice_points}|${userData.mely_points})`,
            'info',
            true
        )

        return embed
    }
}
