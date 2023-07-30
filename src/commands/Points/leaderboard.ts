import { Category } from '@discordx/utilities'
import {
    ApplicationCommandOptionType,
    EmbedBuilder,
    type CommandInteraction,
    type GuildMember,
    type Message,
    APIEmbedField,
    codeBlock,
    userMention,
} from 'discord.js'
import { Client } from 'discordx'

import { Discord, Slash, SlashChoice, SlashOption } from '@decorators'
import { injectable } from 'tsyringe'
import { PointType, User } from '@entities'
import { Database } from '@services'
import { UnknownReplyError } from '@errors'
import numeral from 'numeral'
import { replyToInteraction, resolveGuild } from '@utils/functions'

@Discord()
@injectable()
@Category('Points')
export default class LbCommand {
    constructor(private db: Database) {}

    @Slash({
        name: 'leaderboard',
        description: "Xem ai đang đứng top nào?"
    })
    async point(
        @SlashChoice({ name: 'Chat', value: 'chat_points' })
        @SlashChoice({ name: 'Voice', value: 'voice_points' })
        @SlashChoice({ name: 'MeLy', value: 'mely_points' })
        @SlashOption({
            name: 'type',
            type: ApplicationCommandOptionType.String,
            description: "Type of Point"
        })
        pointType: PointType | undefined,
        interaction: CommandInteraction,
        client: Client,
        { localize }: InteractionData
    ) {
        const guild = await resolveGuild(interaction)

        let orderOption: { [key: string]: number } = {}
        orderOption[`${pointType || 'overall_points'}`] = -1

        const usersData = await this.db.get(User).find(
            {},
            {
                orderBy: [orderOption],
                limit: 10,
            }
        )

        if (usersData && usersData.length && guild) {
            const data = usersData
                .filter(
                    (v) =>
                        v[pointType || 'overall_points'] !== undefined &&
                        v[pointType || 'overall_points']! > 0
                )
                .map((v, i) => {
                    return `i=${i} ${userMention(v.id)}: ${this.numberFormat(
                        v[pointType || 'overall_points']
                    )}`
                })

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Leaderboard${pointType ? ` (${pointType})` : ''} 🏆`)
                .setColor('Random')
                .setDescription(`${data.join('\n')}`)

            replyToInteraction(interaction, {
                embeds: [embed],
            })
        } else {
            throw new UnknownReplyError(interaction)
        }
    }

    numberFormat(input: any) {
        return numeral(input).format('0[.][00]a')
    }
}
